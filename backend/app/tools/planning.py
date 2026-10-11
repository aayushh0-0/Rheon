from typing import Dict, Any, Optional, List
from datetime import datetime
from sqlalchemy.orm import Session
from app.tools.base import BaseTool
from app.services.planning.builder import EmergencyPlanBuilder
from app.schemas.planning import (
    EmergencyPlanRequest,
    PlanImpactAnalysis,
    PlanDiff,
    PlanDiffItem,
)
from app.models.plan import AllocationPlan


class GenerateEmergencyPlanTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_generate_emergency_plan",
            description="Generates and persists a deterministic multi-source emergency allocation plan.",
            category="planning",
            parameters_schema={
                "type": "object",
                "properties": {
                    "hospital_id": {
                        "type": "string",
                        "description": "Recipient hospital identifier.",
                    },
                    "blood_group": {
                        "type": "string",
                        "description": "Requested blood group.",
                    },
                    "units_requested": {
                        "type": "integer",
                        "description": "Total units requested.",
                    },
                    "component_type": {
                        "type": "string",
                        "enum": ["RBC", "WHOLE_BLOOD", "PLATELETS", "PLASMA", "CRYO"],
                        "description": "Blood component type (default 'RBC').",
                    },
                    "urgency": {
                        "type": "string",
                        "enum": ["CRITICAL", "URGENT", "ROUTINE"],
                        "description": "Clinical urgency level (default 'CRITICAL').",
                    },
                    "max_eta_minutes": {
                        "type": "integer",
                        "description": "Maximum allowed ETA minutes (default 45).",
                    },
                    "request_id": {
                        "type": "string",
                        "description": "Optional emergency blood request ID.",
                    },
                },
                "required": ["hospital_id", "blood_group", "units_requested"],
            },
        )

    def execute(
        self,
        db: Session,
        hospital_id: str,
        blood_group: str,
        units_requested: int,
        component_type: str = "RBC",
        urgency: str = "CRITICAL",
        max_eta_minutes: int = 45,
        request_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        plan_req = EmergencyPlanRequest(
            request_id=request_id,
            hospital_id=hospital_id,
            blood_group=blood_group,
            component_type=component_type,
            units_requested=units_requested,
            urgency=urgency,
            max_eta_minutes=max_eta_minutes,
        )
        plan = EmergencyPlanBuilder.generate_plan(db, plan_req)
        items_dto = [
            {
                "id": itm.id,
                "source_facility_type": itm.source_facility_type,
                "source_facility_id": itm.source_facility_id,
                "source_name": itm.source_name,
                "donor_blood_group": itm.donor_blood_group,
                "units_allocated": itm.units_allocated,
                "transport_mode": itm.transport_mode,
                "distance_km": itm.distance_km,
                "estimated_eta_minutes": itm.estimated_eta_minutes,
                "dispatch_status": itm.dispatch_status,
            }
            for itm in plan.items
        ]
        return {
            "id": plan.id,
            "request_id": plan.request_id,
            "version": plan.version,
            "status": plan.status,
            "total_allocated_units": plan.total_allocated_units,
            "unmet_units": plan.unmet_units,
            "donor_standby_activated": plan.donor_standby_activated,
            "max_eta_minutes": plan.max_eta_minutes,
            "confidence_score": plan.confidence_score,
            "plan_type": plan.plan_type,
            "rationale": plan.rationale,
            "items": items_dto,
        }


class ReplanEmergencyPlanTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_replan_emergency_plan",
            description="Generates an alternative AllocationPlan (v2) superseding parent plan (v1) and excluding disqualified facilities.",
            category="planning",
            parameters_schema={
                "type": "object",
                "properties": {
                    "parent_plan_id": {
                        "type": "string",
                        "description": "UUID of the existing parent allocation plan (v1).",
                    },
                    "excluded_facility_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "List of facility IDs to disqualify from allocation.",
                    },
                    "trigger_event_id": {
                        "type": "string",
                        "description": "Optional simulation event ID that triggered this replan.",
                    },
                    "urgency_override": {
                        "type": "string",
                        "description": "Optional clinical urgency override.",
                    },
                    "max_eta_minutes_override": {
                        "type": "integer",
                        "description": "Optional max ETA minutes override.",
                    },
                    "additional_units_requested": {
                        "type": "integer",
                        "description": "Optional additional units requested (e.g. for demand surge).",
                    },
                },
                "required": ["parent_plan_id"],
            },
        )

    def execute(
        self,
        db: Session,
        parent_plan_id: str,
        excluded_facility_ids: Optional[List[str]] = None,
        trigger_event_id: Optional[str] = None,
        urgency_override: Optional[str] = None,
        max_eta_minutes_override: Optional[int] = None,
        additional_units_requested: int = 0,
    ) -> Dict[str, Any]:
        plan = EmergencyPlanBuilder.replan(
            db=db,
            parent_plan_id=parent_plan_id,
            excluded_facility_ids=excluded_facility_ids,
            trigger_event_id=trigger_event_id,
            urgency_override=urgency_override,
            max_eta_minutes_override=max_eta_minutes_override,
            additional_units_requested=additional_units_requested,
        )
        items_dto = [
            {
                "id": itm.id,
                "source_facility_type": itm.source_facility_type,
                "source_facility_id": itm.source_facility_id,
                "source_name": itm.source_name,
                "donor_blood_group": itm.donor_blood_group,
                "units_allocated": itm.units_allocated,
                "transport_mode": itm.transport_mode,
                "distance_km": itm.distance_km,
                "estimated_eta_minutes": itm.estimated_eta_minutes,
                "dispatch_status": itm.dispatch_status,
            }
            for itm in plan.items
        ]
        return {
            "id": plan.id,
            "request_id": plan.request_id,
            "parent_plan_id": plan.parent_plan_id,
            "trigger_event_id": plan.trigger_event_id,
            "version": plan.version,
            "status": plan.status,
            "total_allocated_units": plan.total_allocated_units,
            "unmet_units": plan.unmet_units,
            "donor_standby_activated": plan.donor_standby_activated,
            "max_eta_minutes": plan.max_eta_minutes,
            "confidence_score": plan.confidence_score,
            "plan_type": plan.plan_type,
            "rationale": plan.rationale,
            "items": items_dto,
        }


class AnalyzePlanImpactTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_analyze_plan_impact",
            description="Evaluates a simulation disruption event against active allocation items to determine impact, deficit, and whether re-planning is required.",
            category="planning",
            parameters_schema={
                "type": "object",
                "properties": {
                    "active_plan": {
                        "type": "object",
                        "description": "Active allocation plan dictionary containing allocated items, units, and status.",
                    },
                    "event_type": {
                        "type": "string",
                        "description": "Disruption event type (SOURCE_UNAVAILABLE, INVENTORY_DROP, ROUTE_DELAY, DEMAND_SURGE, FACILITY_OFFLINE, ROUTE_BLOCKED, INVENTORY_DEPLETION).",
                    },
                    "entity_type": {
                        "type": "string",
                        "description": "Entity category (BLOOD_BANK, HOSPITAL, ROUTE, INVENTORY).",
                    },
                    "entity_id": {
                        "type": "string",
                        "description": "Identifier of the disrupted entity.",
                    },
                    "event_id": {
                        "type": "string",
                        "description": "Optional event UUID.",
                    },
                    "payload": {
                        "type": "object",
                        "description": "Optional simulation event payload metadata (e.g. delay_minutes, units_lost, surge_units).",
                    },
                    "max_eta_minutes": {
                        "type": "integer",
                        "description": "SLA maximum allowed ETA in minutes (default 45).",
                    },
                },
                "required": ["active_plan", "event_type", "entity_type", "entity_id"],
            },
        )

    def execute(
        self,
        active_plan: Dict[str, Any],
        event_type: str,
        entity_type: str,
        entity_id: str,
        event_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        max_eta_minutes: int = 45,
    ) -> Dict[str, Any]:
        from app.services.planning.impact import PlanImpactService
        analysis = PlanImpactService.analyze_impact(
            active_plan=active_plan,
            event_type=event_type,
            entity_type=entity_type,
            entity_id=entity_id,
            event_id=event_id,
            payload=payload,
            max_eta_minutes=max_eta_minutes,
        )
        res = analysis.model_dump()
        if "timestamp" in res and hasattr(res["timestamp"], "isoformat"):
            res["timestamp"] = res["timestamp"].isoformat()
        return res



class ComputePlanDiffTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_compute_plan_diff",
            description="Computes deterministic structural and metric differential between parent plan (v1) and replanned candidate plan (v2).",
            category="planning",
            parameters_schema={
                "type": "object",
                "properties": {
                    "parent_plan": {
                        "type": "object",
                        "description": "Parent allocation plan dictionary (v1).",
                    },
                    "new_plan": {
                        "type": "object",
                        "description": "Replanned candidate allocation plan dictionary (v2).",
                    },
                    "trigger_event_type": {
                        "type": "string",
                        "description": "Optional triggering disruption event type.",
                    },
                },
                "required": ["parent_plan", "new_plan"],
            },
        )

    def execute(
        self,
        parent_plan: Dict[str, Any],
        new_plan: Dict[str, Any],
        trigger_event_type: Optional[str] = None,
    ) -> Dict[str, Any]:
        parent_items = {i.get("source_facility_id"): i for i in parent_plan.get("items", [])}
        new_items = {i.get("source_facility_id"): i for i in new_plan.get("items", [])}

        all_source_ids = set(parent_items.keys()).union(set(new_items.keys()))
        diff_items: List[Dict[str, Any]] = []

        sources_added = 0
        sources_removed = 0
        sources_modified = 0

        for sid in all_source_ids:
            p_itm = parent_items.get(sid)
            n_itm = new_items.get(sid)

            if p_itm and not n_itm:
                sources_removed += 1
                diff_items.append({
                    "source_facility_id": sid,
                    "source_name": p_itm.get("source_name", sid),
                    "change_type": "REMOVED",
                    "previous_units": p_itm.get("units_allocated", 0),
                    "new_units": 0,
                    "previous_transport_mode": p_itm.get("transport_mode"),
                    "new_transport_mode": None,
                    "previous_eta_minutes": p_itm.get("estimated_eta_minutes"),
                    "new_eta_minutes": None,
                    "reason": "Facility disqualified or excluded during adaptive re-planning.",
                })
            elif not p_itm and n_itm:
                sources_added += 1
                diff_items.append({
                    "source_facility_id": sid,
                    "source_name": n_itm.get("source_name", sid),
                    "change_type": "ADDED",
                    "previous_units": 0,
                    "new_units": n_itm.get("units_allocated", 0),
                    "previous_transport_mode": None,
                    "new_transport_mode": n_itm.get("transport_mode"),
                    "previous_eta_minutes": None,
                    "new_eta_minutes": n_itm.get("estimated_eta_minutes"),
                    "reason": "Alternative facility allocated to replace deficit units.",
                })
            else:
                # In both
                p_units = p_itm.get("units_allocated", 0)
                n_units = n_itm.get("units_allocated", 0)
                p_mode = p_itm.get("transport_mode")
                n_mode = n_itm.get("transport_mode")
                p_eta = p_itm.get("estimated_eta_minutes")
                n_eta = n_itm.get("estimated_eta_minutes")

                if p_units != n_units or p_mode != n_mode or p_eta != n_eta:
                    sources_modified += 1
                    reasons = []
                    if p_units != n_units:
                        reasons.append(f"Units changed {p_units} -> {n_units}")
                    if p_mode != n_mode:
                        reasons.append(f"Transport shifted {p_mode} -> {n_mode}")
                    if p_eta != n_eta:
                        reasons.append(f"ETA updated {p_eta}m -> {n_eta}m")

                    diff_items.append({
                        "source_facility_id": sid,
                        "source_name": n_itm.get("source_name", sid),
                        "change_type": "MODIFIED",
                        "previous_units": p_units,
                        "new_units": n_units,
                        "previous_transport_mode": p_mode,
                        "new_transport_mode": n_mode,
                        "previous_eta_minutes": p_eta,
                        "new_eta_minutes": n_eta,
                        "reason": "; ".join(reasons),
                    })
                else:
                    diff_items.append({
                        "source_facility_id": sid,
                        "source_name": n_itm.get("source_name", sid),
                        "change_type": "UNCHANGED",
                        "previous_units": p_units,
                        "new_units": n_units,
                        "previous_transport_mode": p_mode,
                        "new_transport_mode": n_mode,
                        "previous_eta_minutes": p_eta,
                        "new_eta_minutes": n_eta,
                        "reason": "Allocation parameters preserved across re-planning.",
                    })

        parent_total = parent_plan.get("total_allocated_units", sum(i.get("units_allocated", 0) for i in parent_items.values()))
        new_total = new_plan.get("total_allocated_units", sum(i.get("units_allocated", 0) for i in new_items.values()))
        total_units_delta = new_total - parent_total

        parent_max_eta = parent_plan.get("max_eta_minutes", 0)
        new_max_eta = new_plan.get("max_eta_minutes", 0)
        max_eta_delta = new_max_eta - parent_max_eta

        # Generate structural summary
        summary_parts = [
            f"Plan Reconfiguration (v{parent_plan.get('version', 1)} -> v{new_plan.get('version', 2)}):",
            f"Units: {parent_total} -> {new_total} (delta: {total_units_delta:+d}).",
            f"Max ETA: {parent_max_eta}m -> {new_max_eta}m (delta: {max_eta_delta:+d}m).",
            f"Sources: +{sources_added} added, -{sources_removed} removed, ~{sources_modified} modified.",
        ]
        structural_summary = " ".join(summary_parts)

        return {
            "parent_plan_id": parent_plan.get("id"),
            "new_plan_id": new_plan.get("id"),
            "parent_version": parent_plan.get("version", 1),
            "new_version": new_plan.get("version", 2),
            "trigger_event_type": trigger_event_type,
            "total_units_delta": total_units_delta,
            "max_eta_delta_minutes": max_eta_delta,
            "sources_added_count": sources_added,
            "sources_removed_count": sources_removed,
            "sources_modified_count": sources_modified,
            "items_diff": diff_items,
            "structural_summary": structural_summary,
        }


class CalculatePlanConfidenceTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_calculate_plan_confidence",
            description="Calculates deterministic confidence score for an allocation plan based on fulfillment, timeliness, and fragmentation.",
            category="planning",
            parameters_schema={
                "type": "object",
                "properties": {
                    "units_requested": {"type": "integer", "description": "Requested units count."},
                    "total_allocated": {"type": "integer", "description": "Allocated units count."},
                    "max_eta": {"type": "integer", "description": "Actual max ETA in minutes."},
                    "target_eta": {"type": "integer", "description": "Target ETA in minutes (default 45)."},
                    "candidate_count": {"type": "integer", "description": "Number of dispatch sources used (default 1)."},
                },
                "required": ["units_requested", "total_allocated", "max_eta"],
            },
        )

    def execute(
        self,
        units_requested: int,
        total_allocated: int,
        max_eta: int,
        target_eta: int = 45,
        candidate_count: int = 1,
    ) -> float:
        score = EmergencyPlanBuilder._calculate_confidence(
            units_requested=units_requested,
            total_allocated=total_allocated,
            max_eta=max_eta,
            target_eta=target_eta,
            candidate_count=candidate_count,
        )
        return round(score, 3)
