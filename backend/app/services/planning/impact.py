from datetime import datetime
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.models.facility import BloodBank, Hospital
from app.models.inventory import InventoryBatch
from app.schemas.planning import PlanImpactAnalysis


class PlanImpactService:
    """
    Deterministic evaluation engine for disruption simulation events against active plan allocations.
    Strictly calculates whether an event affects the active plan, which findings are stale vs preserved,
    and whether re-planning is required.
    """

    @classmethod
    def analyze_impact(
        cls,
        active_plan: Dict[str, Any],
        event_type: str,
        entity_type: str,
        entity_id: str,
        event_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        max_eta_minutes: int = 45,
        db: Optional[Session] = None,
    ) -> PlanImpactAnalysis:
        payload = payload or {}
        items = active_plan.get("items", []) or []
        total_allocated = active_plan.get(
            "total_allocated_units",
            sum(int(i.get("units_allocated", 0)) for i in items),
        )

        invalidated_source_ids: List[str] = []
        invalidated_units = 0
        affected_findings: List[str] = []
        preserved_findings: List[str] = []
        is_impacted = False
        requires_replan = False
        root_cause_summary = ""

        evt = event_type.upper().strip()
        ent = entity_type.upper().strip()

        # Helper to find items matching entity
        matching_items = [
            i for i in items if i.get("source_facility_id") == entity_id
        ]

        if evt in ["SOURCE_UNAVAILABLE", "FACILITY_OFFLINE"]:
            if matching_items:
                is_impacted = True
                requires_replan = True
                invalidated_source_ids = [entity_id]
                invalidated_units = sum(int(i.get("units_allocated", 0)) for i in matching_items)
                affected_findings = [
                    "matching_findings",
                    "logistics_findings",
                    "explainability_findings",
                    "candidate_plan",
                    "validation_result",
                ]
                preserved_findings = ["inventory_findings", "demand_findings"]
                source_name = matching_items[0].get("source_name", entity_id)
                root_cause_summary = (
                    f"Facility {source_name} ({entity_id}) went offline/unavailable. "
                    f"{invalidated_units} unit(s) invalidated from active dispatch."
                )
            else:
                is_impacted = False
                requires_replan = False
                preserved_findings = [
                    "inventory_findings",
                    "demand_findings",
                    "matching_findings",
                    "logistics_findings",
                    "donor_findings",
                    "explainability_findings",
                    "candidate_plan",
                    "validation_result",
                ]
                root_cause_summary = (
                    f"Facility {entity_id} disruption does not affect active allocation plan. "
                    f"No allocated sources impacted."
                )

        elif evt in ["INVENTORY_DEPLETION", "INVENTORY_DROP"]:
            # If entity is an inventory batch, resolve its facility ID
            target_facility_id = entity_id
            if ent == "INVENTORY" and db:
                batch = db.query(InventoryBatch).filter(InventoryBatch.id == entity_id).first()
                if batch:
                    target_facility_id = batch.blood_bank_id or batch.hospital_id or entity_id

            matching_for_inv = [
                i for i in items
                if i.get("source_facility_id") == target_facility_id
            ]

            if matching_for_inv:
                units_allocated_here = sum(int(i.get("units_allocated", 0)) for i in matching_for_inv)
                units_lost = payload.get("units_lost", payload.get("deplete_units", units_allocated_here))

                # Check if this drop causes a deficit in allocated units
                # If units_lost > 0, check if remaining usable stock is less than allocated
                deficit_incurred = min(units_allocated_here, units_lost) if units_lost > 0 else 0

                if deficit_incurred > 0:
                    is_impacted = True
                    requires_replan = True
                    invalidated_source_ids = [target_facility_id]
                    invalidated_units = deficit_incurred
                    affected_findings = [
                        "inventory_findings",
                        "matching_findings",
                        "logistics_findings",
                        "explainability_findings",
                        "candidate_plan",
                        "validation_result",
                    ]
                    preserved_findings = ["demand_findings"]
                    root_cause_summary = (
                        f"Inventory drop at source {target_facility_id}. "
                        f"{invalidated_units} unit(s) deficit incurred on active plan."
                    )
                else:
                    is_impacted = False
                    requires_replan = False
                    preserved_findings = [
                        "inventory_findings",
                        "demand_findings",
                        "matching_findings",
                        "logistics_findings",
                        "donor_findings",
                        "explainability_findings",
                        "candidate_plan",
                        "validation_result",
                    ]
                    root_cause_summary = f"Inventory drop at {target_facility_id} did not breach allocated quantities."
            else:
                is_impacted = False
                requires_replan = False
                preserved_findings = [
                    "inventory_findings",
                    "demand_findings",
                    "matching_findings",
                    "logistics_findings",
                    "donor_findings",
                    "explainability_findings",
                    "candidate_plan",
                    "validation_result",
                ]
                root_cause_summary = f"Inventory event at unallocated facility {entity_id} has zero impact on active plan."

        elif evt in ["ROUTE_DELAY", "ROUTE_BLOCKED"]:
            delay_mins = int(payload.get("delay_minutes", 20))
            affected_source = payload.get("source_facility_id") or entity_id

            matching_route_items = [
                i for i in items if i.get("source_facility_id") == affected_source
            ]
            if not matching_route_items and ent == "ROUTE":
                # Route affecting all ground dispatch items
                matching_route_items = items

            if matching_route_items:
                is_impacted = True
                breached_items = [
                    i for i in matching_route_items
                    if (int(i.get("estimated_eta_minutes", 0)) + delay_mins) > max_eta_minutes
                ]

                if breached_items or evt == "ROUTE_BLOCKED":
                    requires_replan = True
                    target_items = breached_items if breached_items else matching_route_items
                    invalidated_source_ids = list(set(
                        i.get("source_facility_id") for i in target_items if i.get("source_facility_id")
                    ))
                    invalidated_units = sum(int(i.get("units_allocated", 0)) for i in target_items)
                    affected_findings = [
                        "matching_findings",
                        "logistics_findings",
                        "explainability_findings",
                        "candidate_plan",
                        "validation_result",
                    ]
                    preserved_findings = ["inventory_findings", "demand_findings"]
                    root_cause_summary = (
                        f"Transit corridor delay (+{delay_mins} min) breaches SLA threshold ({max_eta_minutes} min). "
                        f"{invalidated_units} unit(s) require re-routing or source reassignment."
                    )
                else:
                    # Minor delay within SLA threshold: plan remains valid, no replan required
                    requires_replan = False
                    invalidated_source_ids = []
                    invalidated_units = 0
                    affected_findings = []
                    preserved_findings = [
                        "inventory_findings",
                        "demand_findings",
                        "matching_findings",
                        "logistics_findings",
                        "donor_findings",
                        "explainability_findings",
                        "candidate_plan",
                        "validation_result",
                    ]
                    root_cause_summary = (
                        f"Transit delay (+{delay_mins} min) remains within SLA threshold ({max_eta_minutes} min). "
                        f"Active allocation plan remains feasible and safe."
                    )
            else:
                is_impacted = False
                requires_replan = False
                preserved_findings = [
                    "inventory_findings",
                    "demand_findings",
                    "matching_findings",
                    "logistics_findings",
                    "donor_findings",
                    "explainability_findings",
                    "candidate_plan",
                    "validation_result",
                ]
                root_cause_summary = f"Route disruption on corridor {entity_id} does not intersect active dispatch routes."

        elif evt == "DEMAND_SURGE":
            surge_units = int(payload.get("additional_units_requested", payload.get("surge_units", 2)))
            is_impacted = True
            requires_replan = True
            invalidated_units = 0
            affected_findings = [
                "demand_findings",
                "matching_findings",
                "logistics_findings",
                "explainability_findings",
                "candidate_plan",
                "validation_result",
            ]
            preserved_findings = ["inventory_findings"]
            root_cause_summary = (
                f"Emergency demand surge: +{surge_units} additional units requested at {entity_id}. "
                f"Re-evaluating network inventory capacity."
            )

        else:
            is_impacted = False
            requires_replan = False
            preserved_findings = [
                "inventory_findings",
                "demand_findings",
                "matching_findings",
                "logistics_findings",
                "donor_findings",
                "explainability_findings",
                "candidate_plan",
                "validation_result",
            ]
            root_cause_summary = f"Disruption event {event_type} evaluated. No operational impact detected."

        remaining_viable = max(0, total_allocated - invalidated_units)
        deficit = invalidated_units

        return PlanImpactAnalysis(
            event_id=event_id,
            event_type=event_type,
            is_impacted=is_impacted,
            requires_replan=requires_replan,
            invalidated_source_ids=invalidated_source_ids,
            invalidated_units=invalidated_units,
            remaining_viable_units=remaining_viable,
            deficit_units=deficit,
            affected_findings=affected_findings,
            preserved_findings=preserved_findings,
            root_cause_summary=root_cause_summary,
            timestamp=datetime.utcnow(),
        )

