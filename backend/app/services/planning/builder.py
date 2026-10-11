import uuid
from datetime import datetime, timezone
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from app.models.plan import AllocationPlan, AllocationItem
from app.models.facility import Hospital, BloodBank
from app.models.inventory import InventoryBatch
from app.models.request import BloodRequest
from app.schemas.matching import MatchingRequest
from app.schemas.planning import EmergencyPlanRequest, EmergencyPlanResponse, AllocationItemDTO
from app.services.matching.engine import SourceMatchingEngine
from app.services.logistics.engine import LogisticsEngine


class EmergencyPlanBuilder:
    """
    Deterministic emergency blood allocation plan generator and lifecycle manager.
    Orchestrates multi-source candidate allocations while preserving safety reserves,
    enforcing transactional atomicity, and guarding against stale or invalid plan activations.
    """

    @classmethod
    def generate_plan(
        cls,
        db: Session,
        plan_request: EmergencyPlanRequest,
    ) -> AllocationPlan:
        """
        Builds and persists an initial AllocationPlan (v1) for an emergency blood request.
        """
        matching_req = MatchingRequest(
            hospital_id=plan_request.hospital_id,
            blood_group=plan_request.blood_group,
            component_type=plan_request.component_type,
            units_requested=plan_request.units_requested,
            urgency=plan_request.urgency,
            max_eta_minutes=plan_request.max_eta_minutes,
        )

        match_results = SourceMatchingEngine.evaluate_candidates(db, matching_req)
        feasible_candidates = [c for c in match_results.candidates if c.is_feasible]

        remaining_needed = plan_request.units_requested
        total_allocated = 0
        allocated_items: List[AllocationItem] = []
        max_eta = 0

        # Greedy allocation from top-ranked candidates
        for cand in feasible_candidates:
            if remaining_needed <= 0:
                break

            take_units = min(cand.usable_units, remaining_needed)
            if take_units <= 0:
                continue

            # Choose transport mode (ground transport only)
            mode = LogisticsEngine.select_transport_mode(
                urgency=plan_request.urgency,
                distance_km=cand.distance_km,
                max_eta_minutes=plan_request.max_eta_minutes,
            )
            eta_mins = LogisticsEngine.estimate_travel_time(
                distance_km=cand.distance_km,
                transport_mode=mode,
                traffic_factor=cand.traffic_factor,
            )

            max_eta = max(max_eta, eta_mins)

            item = AllocationItem(
                id=str(uuid.uuid4()),
                source_facility_type=cand.source_facility_type,
                source_facility_id=cand.source_facility_id,
                source_name=cand.source_name,
                donor_blood_group=cand.donor_blood_group,
                units_allocated=take_units,
                transport_mode=mode,
                distance_km=cand.distance_km,
                estimated_eta_minutes=eta_mins,
                dispatch_status="PENDING",
            )
            allocated_items.append(item)
            total_allocated += take_units
            remaining_needed -= take_units

        unmet = plan_request.units_requested - total_allocated
        donor_standby = unmet > 0 or total_allocated == 0

        # Calculate confidence score
        confidence = cls._calculate_confidence(
            units_requested=plan_request.units_requested,
            total_allocated=total_allocated,
            max_eta=max_eta,
            target_eta=plan_request.max_eta_minutes,
            candidate_count=len(allocated_items),
        )

        # Build clinical & logistics rationale
        rationale = cls._generate_rationale(
            units_requested=plan_request.units_requested,
            total_allocated=total_allocated,
            unmet_units=unmet,
            blood_group=plan_request.blood_group,
            allocated_items=allocated_items,
            max_eta=max_eta,
            donor_standby=donor_standby,
        )

        # Ensure valid BloodRequest exists
        request_id = plan_request.request_id
        if not request_id:
            new_request = BloodRequest(
                id=str(uuid.uuid4()),
                hospital_id=plan_request.hospital_id,
                blood_group=plan_request.blood_group,
                component_type=plan_request.component_type,
                units_requested=plan_request.units_requested,
                urgency=plan_request.urgency,
                max_eta_minutes=plan_request.max_eta_minutes,
                status="PLANNED",
            )
            db.add(new_request)
            db.flush()
            request_id = new_request.id

        plan = AllocationPlan(
            id=str(uuid.uuid4()),
            request_id=request_id,
            version=1,
            status="ACTIVE",
            total_allocated_units=total_allocated,
            unmet_units=unmet,
            donor_standby_activated=donor_standby,
            max_eta_minutes=max_eta,
            confidence_score=round(confidence, 3),
            plan_type="DETERMINISTIC_CANDIDATE",
            rationale=rationale,
            items=allocated_items,
        )

        db.add(plan)
        db.commit()
        db.refresh(plan)

        return plan

    @classmethod
    def evaluate_plan_feasibility(cls, db: Session, plan: AllocationPlan) -> bool:
        """
        Deterministically evaluates whether an existing plan remains feasible under current
        environmental and network state (facilities online, stock available above safety reserve).
        """
        if not plan.items:
            return False

        for itm in plan.items:
            fac_id = itm.source_facility_id
            fac_type = itm.source_facility_type

            if fac_type == "BLOOD_BANK":
                bank = db.query(BloodBank).filter(BloodBank.id == fac_id).first()
                if not bank or not bank.is_online or bank.operational_status == "OFFLINE":
                    return False
            else:
                hosp = db.query(Hospital).filter(Hospital.id == fac_id).first()
                if not hosp or not hosp.is_active:
                    return False

            # Verify current inventory batch is sufficient above reserve
            batch_query = db.query(InventoryBatch).filter(
                InventoryBatch.blood_group == itm.donor_blood_group,
            )
            if fac_type == "BLOOD_BANK":
                batch_query = batch_query.filter(InventoryBatch.blood_bank_id == fac_id)
            else:
                batch_query = batch_query.filter(InventoryBatch.hospital_id == fac_id)

            batch = batch_query.first()
            if batch:
                usable = max(0, batch.available_units - batch.safety_reserve_units)
                if itm.units_allocated > usable:
                    return False

        return True

    @classmethod
    def generate_replan_candidate(
        cls,
        db: Session,
        parent_plan_id: str,
        excluded_facility_ids: Optional[List[str]] = None,
        trigger_event_id: Optional[str] = None,
        urgency_override: Optional[str] = None,
        max_eta_minutes_override: Optional[int] = None,
        additional_units_requested: int = 0,
    ) -> AllocationPlan:
        """
        Step 1 & 2 of safe plan lifecycle:
        Keeps Parent Plan A active while evaluating and constructing candidate Plan B.
        Does NOT supersede Parent Plan A!
        Generates candidate Plan B with status='CANDIDATE' (or 'FAILED' if 0 viable units).
        """
        parent_plan = db.query(AllocationPlan).filter(AllocationPlan.id == parent_plan_id).first()
        if not parent_plan:
            raise ValueError(f"Parent allocation plan with ID '{parent_plan_id}' not found.")

        # Load blood request parameters
        blood_request = db.query(BloodRequest).filter(BloodRequest.id == parent_plan.request_id).first()
        hospital_id = blood_request.hospital_id if blood_request else "aiims-delhi"
        blood_group = blood_request.blood_group if blood_request else "O-"
        component_type = blood_request.component_type if blood_request else "RBC"
        units_requested = (blood_request.units_requested if blood_request else 2) + additional_units_requested
        urgency = urgency_override or (blood_request.urgency if blood_request else "CRITICAL")
        max_eta_minutes = max_eta_minutes_override or (blood_request.max_eta_minutes if blood_request else 45)

        matching_req = MatchingRequest(
            hospital_id=hospital_id,
            blood_group=blood_group,
            component_type=component_type,
            units_requested=units_requested,
            urgency=urgency,
            max_eta_minutes=max_eta_minutes,
        )

        match_results = SourceMatchingEngine.evaluate_candidates(db, matching_req)
        excluded = set(excluded_facility_ids or [])

        # Filter out excluded facilities (e.g. offline/depleted sources)
        feasible_candidates = [
            c for c in match_results.candidates
            if c.is_feasible and c.source_facility_id not in excluded
        ]

        remaining_needed = units_requested
        total_allocated = 0
        allocated_items: List[AllocationItem] = []
        max_eta = 0

        # Greedy allocation from top-ranked alternative candidates
        for cand in feasible_candidates:
            if remaining_needed <= 0:
                break

            take_units = min(cand.usable_units, remaining_needed)
            if take_units <= 0:
                continue

            mode = LogisticsEngine.select_transport_mode(
                urgency=urgency,
                distance_km=cand.distance_km,
                max_eta_minutes=max_eta_minutes,
            )
            eta_mins = LogisticsEngine.estimate_travel_time(
                distance_km=cand.distance_km,
                transport_mode=mode,
                traffic_factor=cand.traffic_factor,
            )

            max_eta = max(max_eta, eta_mins)

            item = AllocationItem(
                id=str(uuid.uuid4()),
                source_facility_type=cand.source_facility_type,
                source_facility_id=cand.source_facility_id,
                source_name=cand.source_name,
                donor_blood_group=cand.donor_blood_group,
                units_allocated=take_units,
                transport_mode=mode,
                distance_km=cand.distance_km,
                estimated_eta_minutes=eta_mins,
                dispatch_status="PENDING",
            )
            allocated_items.append(item)
            total_allocated += take_units
            remaining_needed -= take_units

        unmet = units_requested - total_allocated
        donor_standby = unmet > 0 or total_allocated == 0

        # Calculate confidence score
        confidence = cls._calculate_confidence(
            units_requested=units_requested,
            total_allocated=total_allocated,
            max_eta=max_eta,
            target_eta=max_eta_minutes,
            candidate_count=len(allocated_items),
        )

        # Candidate status: CANDIDATE if viable allocations found, FAILED if 0 units allocated
        candidate_status = "CANDIDATE" if total_allocated > 0 else "FAILED"

        rationale = cls._generate_rationale(
            units_requested=units_requested,
            total_allocated=total_allocated,
            unmet_units=unmet,
            blood_group=blood_group,
            allocated_items=allocated_items,
            max_eta=max_eta,
            donor_standby=donor_standby,
        )
        if excluded:
            rationale = f"[REPLAN v{parent_plan.version + 1} EXCLUDING: {', '.join(excluded)}] {rationale}"

        new_plan = AllocationPlan(
            id=str(uuid.uuid4()),
            request_id=parent_plan.request_id,
            parent_plan_id=parent_plan.id,
            trigger_event_id=trigger_event_id,
            version=parent_plan.version + 1,
            status=candidate_status,
            total_allocated_units=total_allocated,
            unmet_units=unmet,
            donor_standby_activated=donor_standby,
            max_eta_minutes=max_eta,
            confidence_score=round(confidence, 3),
            plan_type="ADAPTIVE_REPLAN_CANDIDATE",
            rationale=rationale,
            items=allocated_items,
        )

        db.add(new_plan)
        db.commit()
        db.refresh(new_plan)

        return new_plan

    @classmethod
    def activate_replacement_plan(
        cls,
        db: Session,
        parent_plan_id: str,
        candidate_plan_id: str,
        trigger_event_id: Optional[str] = None,
        plan_diff: Optional[Dict[str, Any]] = None,
        recipient_blood_group: Optional[str] = None,
        units_requested: Optional[int] = None,
        component_type: Optional[str] = None,
    ) -> Tuple[AllocationPlan, AllocationPlan, bool]:
        """
        Step 3 & 4 & 5 of safe plan lifecycle:
        Validates candidate Plan B against the 6-point deterministic safety gate.
        If Plan B passes validation:
            Atomically:
            - Mark Plan A as SUPERSEDED.
            - Mark Plan B as ACTIVE.
            - Persist parent plan ID, version, triggering event, and diff summary.
        If Plan B fails validation:
            - Never activate Plan B (mark Plan B as FAILED).
            - Never supersede Plan A merely because an attempt was made.
            - Re-evaluate whether Plan A remains valid under changed conditions.
            - If Plan A is no longer safe/feasible, mark it as 'INVIABLE' (no feasible plan).
        """
        from app.services.planning.validator import PlanValidator

        parent_plan = db.query(AllocationPlan).filter(AllocationPlan.id == parent_plan_id).first()
        if not parent_plan:
            raise ValueError(f"Parent allocation plan with ID '{parent_plan_id}' not found.")

        candidate_plan = db.query(AllocationPlan).filter(AllocationPlan.id == candidate_plan_id).first()
        if not candidate_plan:
            raise ValueError(f"Candidate allocation plan with ID '{candidate_plan_id}' not found.")

        # Stale plan protection check
        if parent_plan.status == "SUPERSEDED":
            raise ValueError(
                f"Stale replan rejection: Parent plan '{parent_plan_id}' is already SUPERSEDED. "
                f"Cannot activate candidate against an outdated parent revision."
            )

        if candidate_plan.parent_plan_id != parent_plan.id:
            raise ValueError(
                f"Plan lineage mismatch: Candidate plan '{candidate_plan_id}' parent is "
                f"'{candidate_plan.parent_plan_id}', expected '{parent_plan.id}'."
            )

        # Derive validation request parameters
        blood_request = db.query(BloodRequest).filter(BloodRequest.id == parent_plan.request_id).first()
        recip_group = recipient_blood_group or (blood_request.blood_group if blood_request else "O-")
        units_req = units_requested or (blood_request.units_requested if blood_request else candidate_plan.total_allocated_units + candidate_plan.unmet_units)
        comp_type = component_type or (blood_request.component_type if blood_request else "RBC")

        # Deterministic 6-point validation of candidate plan
        val_res = PlanValidator.validate_plan_object(
            db=db,
            plan=candidate_plan,
            recipient_blood_group=recip_group,
            units_requested=units_req,
            component_type=comp_type,
        )

        is_candidate_valid = val_res.is_valid and candidate_plan.total_allocated_units > 0

        if is_candidate_valid:
            # Atomic plan activation transition
            parent_plan.status = "SUPERSEDED"
            parent_plan.updated_at = datetime.now(timezone.utc)

            candidate_plan.status = "ACTIVE"
            candidate_plan.updated_at = datetime.now(timezone.utc)
            if trigger_event_id:
                candidate_plan.trigger_event_id = trigger_event_id

            if plan_diff and isinstance(plan_diff, dict):
                summary = plan_diff.get("structural_summary")
                if summary and candidate_plan.rationale:
                    candidate_plan.rationale = f"{candidate_plan.rationale} [DIFF: {summary}]"

            db.add(parent_plan)
            db.add(candidate_plan)
            db.commit()
            db.refresh(parent_plan)
            db.refresh(candidate_plan)
            return parent_plan, candidate_plan, True

        else:
            # Candidate plan failed validation or has 0 allocated units! Never activate!
            candidate_plan.status = "FAILED"
            candidate_plan.updated_at = datetime.now(timezone.utc)

            # Re-evaluate parent plan feasibility under the changed conditions
            is_parent_feasible = cls.evaluate_plan_feasibility(db, parent_plan)
            if not is_parent_feasible:
                # Parent plan is no longer safe or feasible: mark as INVIABLE (no feasible plan)
                parent_plan.status = "INVIABLE"
                parent_plan.updated_at = datetime.now(timezone.utc)
                db.add(parent_plan)

            db.add(candidate_plan)
            db.commit()
            db.refresh(parent_plan)
            db.refresh(candidate_plan)
            return parent_plan, candidate_plan, False

    @classmethod
    def replan(
        cls,
        db: Session,
        parent_plan_id: str,
        excluded_facility_ids: Optional[List[str]] = None,
        trigger_event_id: Optional[str] = None,
        urgency_override: Optional[str] = None,
        max_eta_minutes_override: Optional[int] = None,
        additional_units_requested: int = 0,
        plan_diff: Optional[Dict[str, Any]] = None,
    ) -> AllocationPlan:
        """
        Executes the complete safe adaptive re-planning lifecycle:
        1. Keep parent Plan A active.
        2. Generate candidate Plan B (status='CANDIDATE' or 'FAILED').
        3. If candidate Plan B is FAILED (0 units viable), re-evaluate Plan A and return.
        4. Validate candidate Plan B using 6-point validator.
        5. Atomically supersede Plan A and activate Plan B only if Plan B passes validation.
        """
        candidate_plan = cls.generate_replan_candidate(
            db=db,
            parent_plan_id=parent_plan_id,
            excluded_facility_ids=excluded_facility_ids,
            trigger_event_id=trigger_event_id,
            urgency_override=urgency_override,
            max_eta_minutes_override=max_eta_minutes_override,
            additional_units_requested=additional_units_requested,
        )

        if candidate_plan.status == "FAILED" or candidate_plan.total_allocated_units == 0:
            # No alternative feasible sources
            parent_plan = db.query(AllocationPlan).filter(AllocationPlan.id == parent_plan_id).first()
            if parent_plan and not cls.evaluate_plan_feasibility(db, parent_plan):
                parent_plan.status = "INVIABLE"
                db.add(parent_plan)
                db.commit()
            return candidate_plan

        # Execute safe atomic validation and activation
        parent_plan, activated_plan, success = cls.activate_replacement_plan(
            db=db,
            parent_plan_id=parent_plan_id,
            candidate_plan_id=candidate_plan.id,
            trigger_event_id=trigger_event_id,
            plan_diff=plan_diff,
        )

        return activated_plan

    @classmethod
    def _calculate_confidence(
        cls,
        units_requested: int,
        total_allocated: int,
        max_eta: int,
        target_eta: int,
        candidate_count: int,
    ) -> float:
        if units_requested == 0:
            return 1.0

        # Fulfillment weight: 0.60
        fulfillment_score = min(1.0, total_allocated / units_requested)

        # ETA timeliness weight: 0.25
        if max_eta <= target_eta:
            eta_score = 1.0
        else:
            eta_score = max(0.2, target_eta / max(1, max_eta))

        # Coordination complexity penalty: 0.15 (single source is cleaner than 4 fragmented sources)
        frag_penalty = max(0.6, 1.0 - (0.1 * max(0, candidate_count - 1)))

        return (0.60 * fulfillment_score) + (0.25 * eta_score) + (0.15 * frag_penalty)

    @classmethod
    def _generate_rationale(
        cls,
        units_requested: int,
        total_allocated: int,
        unmet_units: int,
        blood_group: str,
        allocated_items: List[AllocationItem],
        max_eta: int,
        donor_standby: bool,
    ) -> str:
        parts = [
            f"Deterministic plan formulated for {units_requested} units of {blood_group}."
        ]

        if total_allocated == units_requested:
            parts.append(
                f"100% fulfillment achieved across {len(allocated_items)} facility source(s) with max ETA of {max_eta} min."
            )
        elif total_allocated > 0:
            parts.append(
                f"Partial fulfillment: {total_allocated}/{units_requested} units allocated. Deficit of {unmet_units} units."
            )
        else:
            parts.append("Zero network inventory available within safety reserve bounds.")

        for idx, itm in enumerate(allocated_items, 1):
            parts.append(
                f"Source {idx}: {itm.source_name} ({itm.source_facility_type}) supplying {itm.units_allocated} unit(s) of {itm.donor_blood_group} via {itm.transport_mode} (ETA: {itm.estimated_eta_minutes}m, {itm.distance_km}km)."
            )

        if donor_standby:
            parts.append(
                f"Donor standby activation triggered for {blood_group} emergency cohort."
            )

        return " ".join(parts)
