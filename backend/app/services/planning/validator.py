from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.facility import Hospital, BloodBank
from app.models.inventory import InventoryBatch
from app.models.plan import AllocationPlan, AllocationItem
from app.schemas.enums import TransportMode
from app.schemas.validation import (
    PlanValidationRequest,
    PlanValidationResponse,
    ValidationCheckDetail,
    ValidationChecksSummary,
)
from app.services.compatibility.engine import BloodCompatibilityEngine
from app.services.inventory.engine import InventoryReserveEngine


class PlanValidator:
    """
    Deterministic safety gate for emergency allocation plans.
    Validates biological compatibility, inventory conservation, safety reserve limits,
    facility operational status, and mathematical consistency.
    """

    @classmethod
    def validate_plan_object(
        cls,
        db: Session,
        plan: AllocationPlan,
        recipient_blood_group: str,
        units_requested: int,
        component_type: str = "RBC",
    ) -> PlanValidationResponse:
        """
        Validates an existing SQLAlchemy AllocationPlan against safety constraints.
        """
        allocations_data = [
            {
                "source_facility_type": item.source_facility_type,
                "source_facility_id": item.source_facility_id,
                "source_name": item.source_name,
                "donor_blood_group": item.donor_blood_group,
                "units_allocated": item.units_allocated,
                "transport_mode": item.transport_mode,
                "distance_km": item.distance_km,
                "estimated_eta_minutes": item.estimated_eta_minutes,
            }
            for item in plan.items
        ]

        req = PlanValidationRequest(
            plan_id=plan.id,
            recipient_hospital_id="",
            recipient_blood_group=recipient_blood_group,
            component_type=component_type,
            units_requested=units_requested,
            allocations=allocations_data,
        )

        return cls.validate_plan(db, req, total_allocated_declared=plan.total_allocated_units, unmet_declared=plan.unmet_units)

    @classmethod
    def validate_plan(
        cls,
        db: Session,
        request: PlanValidationRequest,
        total_allocated_declared: Optional[int] = None,
        unmet_declared: Optional[int] = None,
    ) -> PlanValidationResponse:
        """
        Validates allocation plan details against deterministic safety rules.
        """
        errors: List[str] = []
        warnings: List[str] = []
        check_details: List[ValidationCheckDetail] = []

        # 1. Check Biological Compatibility
        compat_passed = True
        compat_msgs = []
        for alloc in request.allocations:
            donor_group = alloc.get("donor_blood_group", "")
            is_compat = BloodCompatibilityEngine.is_compatible(
                request.recipient_blood_group, donor_group, request.component_type
            )
            if not is_compat:
                compat_passed = False
                msg = f"Incompatible donor group {donor_group} for recipient {request.recipient_blood_group}"
                compat_msgs.append(msg)
                errors.append(msg)

        check_details.append(
            ValidationCheckDetail(
                check_name="biological_compatibility",
                passed=compat_passed,
                message="All allocated units are biologically compatible"
                if compat_passed
                else "; ".join(compat_msgs),
            )
        )

        # 2. Check Quantity Conservation
        sum_allocated = sum(int(a.get("units_allocated", 0)) for a in request.allocations)
        qty_passed = True
        qty_msg = f"Quantity conserved: {sum_allocated} units allocated."

        if total_allocated_declared is not None and sum_allocated != total_allocated_declared:
            qty_passed = False
            msg = f"Allocation sum ({sum_allocated}) does not match declared total ({total_allocated_declared})"
            errors.append(msg)
            qty_msg = msg
        elif unmet_declared is not None and (sum_allocated + unmet_declared) != request.units_requested:
            qty_passed = False
            msg = f"Allocated ({sum_allocated}) + Unmet ({unmet_declared}) != Requested ({request.units_requested})"
            errors.append(msg)
            qty_msg = msg
        elif sum_allocated > request.units_requested:
            qty_passed = False
            msg = f"Allocated units ({sum_allocated}) exceeds requested units ({request.units_requested})"
            errors.append(msg)
            qty_msg = msg

        check_details.append(
            ValidationCheckDetail(
                check_name="quantity_conservation",
                passed=qty_passed,
                message=qty_msg,
            )
        )

        # 3. Check Safety Reserve Protection
        reserve_passed = True
        reserve_msgs = []
        for alloc in request.allocations:
            fac_id = alloc.get("source_facility_id")
            fac_type = alloc.get("source_facility_type", "BLOOD_BANK")
            units = int(alloc.get("units_allocated", 0))
            donor_group = alloc.get("donor_blood_group")

            # Look up current inventory batch in DB
            batch_query = db.query(InventoryBatch).filter(
                InventoryBatch.blood_group == donor_group,
                InventoryBatch.component_type == request.component_type,
            )
            if fac_type == "BLOOD_BANK":
                batch_query = batch_query.filter(InventoryBatch.blood_bank_id == fac_id)
            else:
                batch_query = batch_query.filter(InventoryBatch.hospital_id == fac_id)

            batch = batch_query.first()
            if batch:
                usable = InventoryReserveEngine.calculate_usable_stock(
                    batch.available_units, batch.safety_reserve_units
                )
                if units > usable:
                    reserve_passed = False
                    msg = (
                        f"Safety reserve breach at {alloc.get('source_name', fac_id)}: "
                        f"Allocated {units} units, but usable stock is {usable} "
                        f"(Available: {batch.available_units}, Reserve: {batch.safety_reserve_units})"
                    )
                    reserve_msgs.append(msg)
                    errors.append(msg)
            else:
                warnings.append(f"Source batch not found in DB for facility {fac_id}; unable to verify live stock")

        check_details.append(
            ValidationCheckDetail(
                check_name="safety_reserve_protection",
                passed=reserve_passed,
                message="Safety reserves intact across all sources"
                if reserve_passed
                else "; ".join(reserve_msgs),
            )
        )

        # 4. Check Source Facility Status
        source_passed = True
        source_msgs = []
        for alloc in request.allocations:
            fac_id = alloc.get("source_facility_id")
            fac_type = alloc.get("source_facility_type", "BLOOD_BANK")

            if fac_type == "BLOOD_BANK":
                bank = db.query(BloodBank).filter(BloodBank.id == fac_id).first()
                if bank and not bank.is_online:
                    source_passed = False
                    msg = f"Blood bank {bank.name} is OFFLINE"
                    source_msgs.append(msg)
                    errors.append(msg)
            else:
                hosp = db.query(Hospital).filter(Hospital.id == fac_id).first()
                if hosp and not hosp.is_active:
                    source_passed = False
                    msg = f"Hospital {hosp.name} is INACTIVE"
                    source_msgs.append(msg)
                    errors.append(msg)

        check_details.append(
            ValidationCheckDetail(
                check_name="source_operational_status",
                passed=source_passed,
                message="All source facilities are online and operational"
                if source_passed
                else "; ".join(source_msgs),
            )
        )

        # 5. Check Logistics Validity
        logistics_passed = True
        logistics_msgs = []
        valid_modes = [
            TransportMode.AMBULANCE_SIREN.value,
            TransportMode.STANDARD_COURIER.value,
            TransportMode.DRONE.value,
        ]
        for alloc in request.allocations:
            dist = float(alloc.get("distance_km", 0.0))
            eta = int(alloc.get("estimated_eta_minutes", 0))
            mode = alloc.get("transport_mode", "")

            if dist < 0 or eta < 0:
                logistics_passed = False
                msg = f"Invalid negative distance ({dist}km) or ETA ({eta}m)"
                logistics_msgs.append(msg)
                errors.append(msg)

            if mode not in valid_modes:
                logistics_passed = False
                msg = f"Invalid transport mode '{mode}'"
                logistics_msgs.append(msg)
                errors.append(msg)

            if mode == TransportMode.DRONE.value and dist > 35.0:
                warnings.append(f"Drone flight exceeds recommended 35km range ({dist}km)")

        check_details.append(
            ValidationCheckDetail(
                check_name="logistics_validity",
                passed=logistics_passed,
                message="Logistics parameters valid"
                if logistics_passed
                else "; ".join(logistics_msgs),
            )
        )

        # 6. Check Mathematical Consistency
        math_passed = True
        math_msgs = []
        for alloc in request.allocations:
            units = int(alloc.get("units_allocated", 0))
            if units <= 0:
                math_passed = False
                msg = f"Non-positive unit allocation ({units})"
                math_msgs.append(msg)
                errors.append(msg)

        check_details.append(
            ValidationCheckDetail(
                check_name="mathematical_consistency",
                passed=math_passed,
                message="Mathematical constraints satisfied"
                if math_passed
                else "; ".join(math_msgs),
            )
        )

        is_valid = (
            compat_passed
            and qty_passed
            and reserve_passed
            and source_passed
            and logistics_passed
            and math_passed
        )

        summary = ValidationChecksSummary(
            compatibility=compat_passed,
            quantity_conservation=qty_passed,
            reserve_protection=reserve_passed,
            source_status=source_passed,
            logistics_validity=logistics_passed,
            mathematical_consistency=math_passed,
        )

        return PlanValidationResponse(
            is_valid=is_valid,
            errors=errors,
            warnings=warnings,
            checks=summary,
            check_details=check_details,
        )
