import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.plan import AllocationPlan
from app.models.request import BloodRequest
from app.models.event import Event
from app.schemas.planning import (
    EmergencyPlanRequest,
    EmergencyPlanResponse,
    AdaptiveReplanRequest,
    AdaptiveReplanResponse,
    PlanImpactAnalysis,
    PlanDiff,
    AllocationItemDTO,
)
from app.schemas.validation import PlanValidationRequest, PlanValidationResponse
from app.services.planning.builder import EmergencyPlanBuilder
from app.services.planning.validator import PlanValidator
from app.services.planning.impact import PlanImpactService
from app.tools.planning import ComputePlanDiffTool
from app.orchestration.state import create_initial_agent_state, RheonAgentState
from app.orchestration.invalidation import invalidate_stale_findings
from app.orchestration.graph import run_rheon_orchestrated_workflow

router = APIRouter(prefix="/planning", tags=["Planning"])


def _to_plan_response(plan: AllocationPlan) -> EmergencyPlanResponse:
    items_dto = [
        AllocationItemDTO(
            id=i.id,
            source_facility_type=i.source_facility_type,
            source_facility_id=i.source_facility_id,
            source_name=i.source_name,
            donor_blood_group=i.donor_blood_group,
            units_allocated=i.units_allocated,
            transport_mode=i.transport_mode,
            distance_km=i.distance_km,
            estimated_eta_minutes=i.estimated_eta_minutes,
            dispatch_status=i.dispatch_status,
        )
        for i in (plan.items or [])
    ]
    return EmergencyPlanResponse(
        id=plan.id,
        request_id=plan.request_id,
        parent_plan_id=plan.parent_plan_id,
        trigger_event_id=plan.trigger_event_id,
        version=plan.version,
        status=plan.status,
        plan_type=plan.plan_type,
        total_allocated_units=plan.total_allocated_units,
        unmet_units=plan.unmet_units,
        is_fully_fulfilled=(plan.unmet_units == 0 and plan.total_allocated_units > 0),
        donor_standby_activated=plan.donor_standby_activated,
        max_eta_minutes=plan.max_eta_minutes,
        confidence_score=plan.confidence_score,
        rationale=plan.rationale or "",
        items=items_dto,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )


@router.post(
    "/generate",
    response_model=EmergencyPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Generate Emergency Allocation Plan",
    description="Deterministic greedy multi-source emergency plan generation with safety reserve protection.",
)
def generate_emergency_plan(
    payload: EmergencyPlanRequest,
    db: Session = Depends(get_db),
) -> EmergencyPlanResponse:
    plan = EmergencyPlanBuilder.generate_plan(db, payload)
    return _to_plan_response(plan)


@router.get(
    "/plans/{plan_id}",
    response_model=EmergencyPlanResponse,
    summary="Get Allocation Plan",
    description="Fetch a previously generated allocation plan and its individual source dispatches.",
)
def get_plan(
    plan_id: str,
    db: Session = Depends(get_db),
) -> EmergencyPlanResponse:
    plan = db.query(AllocationPlan).filter(AllocationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Allocation plan '{plan_id}' not found.",
        )
    return _to_plan_response(plan)


@router.get(
    "/requests/{request_id}/active",
    response_model=EmergencyPlanResponse,
    summary="Get Active Allocation Plan for Request",
    description="Fetch the currently ACTIVE allocation plan for a specific emergency blood request.",
)
def get_active_plan_for_request(
    request_id: str,
    db: Session = Depends(get_db),
) -> EmergencyPlanResponse:
    plan = (
        db.query(AllocationPlan)
        .filter(AllocationPlan.request_id == request_id, AllocationPlan.status == "ACTIVE")
        .order_by(AllocationPlan.version.desc())
        .first()
    )
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active allocation plan found for request '{request_id}'.",
        )
    return _to_plan_response(plan)


@router.get(
    "/active",
    response_model=EmergencyPlanResponse,
    summary="Get Active Allocation Plan",
    description="Fetch the most recent active allocation plan, optionally filtered by request_id.",
)
def get_active_plan(
    request_id: Optional[str] = Query(None, description="Optional request ID filter"),
    db: Session = Depends(get_db),
) -> EmergencyPlanResponse:
    query = db.query(AllocationPlan).filter(AllocationPlan.status == "ACTIVE")
    if request_id:
        query = query.filter(AllocationPlan.request_id == request_id)
    plan = query.order_by(AllocationPlan.version.desc(), AllocationPlan.created_at.desc()).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active allocation plan found in the system.",
        )
    return _to_plan_response(plan)


@router.get(
    "/requests/{request_id}/history",
    response_model=List[EmergencyPlanResponse],
    summary="Get Plan Revision History",
    description="Retrieve all plan revisions (v1, v2, etc.) and statuses for an emergency request.",
)
def get_plan_history(
    request_id: str,
    db: Session = Depends(get_db),
) -> List[EmergencyPlanResponse]:
    plans = (
        db.query(AllocationPlan)
        .filter(AllocationPlan.request_id == request_id)
        .order_by(AllocationPlan.version.asc(), AllocationPlan.created_at.asc())
        .all()
    )
    return [_to_plan_response(p) for p in plans]


@router.get(
    "/compare",
    response_model=PlanDiff,
    summary="Compare Two Plan Versions",
    description="Computes structural and metric differential between parent and replacement plans.",
)
def compare_plans(
    parent_plan_id: str = Query(..., description="UUID of the parent plan (v1)"),
    new_plan_id: str = Query(..., description="UUID of the replacement candidate plan (v2)"),
    db: Session = Depends(get_db),
) -> PlanDiff:
    parent_plan = db.query(AllocationPlan).filter(AllocationPlan.id == parent_plan_id).first()
    if not parent_plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Parent plan '{parent_plan_id}' not found.")

    new_plan = db.query(AllocationPlan).filter(AllocationPlan.id == new_plan_id).first()
    if not new_plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"New plan '{new_plan_id}' not found.")

    parent_dict = {
        "id": parent_plan.id,
        "version": parent_plan.version,
        "total_allocated_units": parent_plan.total_allocated_units,
        "max_eta_minutes": parent_plan.max_eta_minutes,
        "items": [
            {
                "source_facility_id": i.source_facility_id,
                "source_name": i.source_name,
                "units_allocated": i.units_allocated,
                "transport_mode": i.transport_mode,
                "estimated_eta_minutes": i.estimated_eta_minutes,
            }
            for i in parent_plan.items
        ],
    }
    new_dict = {
        "id": new_plan.id,
        "version": new_plan.version,
        "total_allocated_units": new_plan.total_allocated_units,
        "max_eta_minutes": new_plan.max_eta_minutes,
        "items": [
            {
                "source_facility_id": i.source_facility_id,
                "source_name": i.source_name,
                "units_allocated": i.units_allocated,
                "transport_mode": i.transport_mode,
                "estimated_eta_minutes": i.estimated_eta_minutes,
            }
            for i in new_plan.items
        ],
    }

    diff_tool = ComputePlanDiffTool()
    res = diff_tool.execute(
        parent_plan=parent_dict,
        new_plan=new_dict,
        trigger_event_type="DISRUPTION",
    )
    return PlanDiff(**res)


@router.post(
    "/validate",
    response_model=PlanValidationResponse,
    summary="Deterministic 6-Point Safety Gate",
    description="Validates compatibility, quantity conservation, reserve limits, facility status, logistics, and mathematics.",
)
def validate_plan_payload(
    payload: PlanValidationRequest,
    db: Session = Depends(get_db),
) -> PlanValidationResponse:
    return PlanValidator.validate_plan(db, payload)


@router.post(
    "/plans/{plan_id}/validate",
    response_model=PlanValidationResponse,
    summary="Validate Stored Plan",
    description="Runs the 6-point deterministic safety validation against an existing plan in the database.",
)
def validate_stored_plan(
    plan_id: str,
    db: Session = Depends(get_db),
) -> PlanValidationResponse:
    plan = db.query(AllocationPlan).filter(AllocationPlan.id == plan_id).first()
    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Allocation plan '{plan_id}' not found.",
        )

    req = db.query(BloodRequest).filter(BloodRequest.id == plan.request_id).first()
    recipient_group = req.blood_group if req else "O-"
    units_requested = req.units_requested if req else plan.total_allocated_units + plan.unmet_units
    component_type = req.component_type if req else "RBC"

    return PlanValidator.validate_plan_object(
        db=db,
        plan=plan,
        recipient_blood_group=recipient_group,
        units_requested=units_requested,
        component_type=component_type,
    )


@router.post(
    "/replan",
    response_model=AdaptiveReplanResponse,
    status_code=status.HTTP_200_OK,
    summary="Adaptive Emergency Re-planning Workflow",
    description="Evaluates disruption event, invalidates stale findings, runs selective agent orchestration, generates candidate Plan B, validates Plan B, and atomically activates Plan B.",
)
def execute_adaptive_replan(
    payload: AdaptiveReplanRequest,
    db: Session = Depends(get_db),
) -> AdaptiveReplanResponse:
    # 1. Verify blood request exists
    blood_req = db.query(BloodRequest).filter(BloodRequest.id == payload.request_id).first()
    if not blood_req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request '{payload.request_id}' not found.",
        )

    # 2. Identify active Plan A
    active_plan = (
        db.query(AllocationPlan)
        .filter(AllocationPlan.request_id == payload.request_id, AllocationPlan.status == "ACTIVE")
        .order_by(AllocationPlan.version.desc())
        .first()
    )
    if not active_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"No active allocation plan found for request '{payload.request_id}'. Cannot replan.",
        )

    # 3. Duplicate event check (Idempotency)
    if payload.event_id:
        existing_event = db.query(Event).filter(Event.id == payload.event_id).first()
        if existing_event and existing_event.triggered_replan:
            # Event was already processed and triggered replan
            # Find the plan activated for this event
            replanned_plan = (
                db.query(AllocationPlan)
                .filter(AllocationPlan.trigger_event_id == payload.event_id)
                .order_by(AllocationPlan.version.desc())
                .first()
            )
            impact = PlanImpactService.analyze_impact(
                active_plan={
                    "id": active_plan.id,
                    "total_allocated_units": active_plan.total_allocated_units,
                    "items": [
                        {
                            "source_facility_id": i.source_facility_id,
                            "source_name": i.source_name,
                            "units_allocated": i.units_allocated,
                            "estimated_eta_minutes": i.estimated_eta_minutes,
                            "transport_mode": i.transport_mode,
                        }
                        for i in active_plan.items
                    ],
                },
                event_type=payload.event_type,
                entity_type=payload.entity_type,
                entity_id=payload.entity_id,
                event_id=payload.event_id,
                payload=payload.payload,
                max_eta_minutes=payload.max_eta_minutes or 45,
                db=db,
            )
            return AdaptiveReplanResponse(
                request_id=payload.request_id,
                parent_plan_id=active_plan.parent_plan_id or active_plan.id,
                active_plan_id=active_plan.id,
                version=active_plan.version,
                status="ALREADY_PROCESSED",
                requires_replan=False,
                impact_analysis=impact,
                active_plan=_to_plan_response(active_plan),
                explanation="Event was already processed and incorporated into active plan.",
            )

    # 4. Deterministic impact analysis
    active_plan_dict = {
        "id": active_plan.id,
        "total_allocated_units": active_plan.total_allocated_units,
        "unmet_units": active_plan.unmet_units,
        "items": [
            {
                "id": i.id,
                "source_facility_type": i.source_facility_type,
                "source_facility_id": i.source_facility_id,
                "source_name": i.source_name,
                "donor_blood_group": i.donor_blood_group,
                "units_allocated": i.units_allocated,
                "transport_mode": i.transport_mode,
                "distance_km": i.distance_km,
                "estimated_eta_minutes": i.estimated_eta_minutes,
            }
            for i in active_plan.items
        ],
    }

    impact = PlanImpactService.analyze_impact(
        active_plan=active_plan_dict,
        event_type=payload.event_type,
        entity_type=payload.entity_type,
        entity_id=payload.entity_id,
        event_id=payload.event_id,
        payload=payload.payload,
        max_eta_minutes=payload.max_eta_minutes or blood_req.max_eta_minutes or 45,
        db=db,
    )

    # If disruption does not require re-planning, keep Plan A active
    if not impact.requires_replan:
        return AdaptiveReplanResponse(
            request_id=payload.request_id,
            parent_plan_id=active_plan.id,
            active_plan_id=active_plan.id,
            version=active_plan.version,
            status="NO_CHANGE",
            requires_replan=False,
            impact_analysis=impact,
            active_plan=_to_plan_response(active_plan),
            explanation=impact.root_cause_summary,
            donor_standby_activated=active_plan.donor_standby_activated,
            agent_execution_history=[],
        )

    # 5. Selective Invalidation and Coordinator Multi-Agent Re-execution
    # Prepare agent state preserving valid upstream findings
    additional_units = int(payload.payload.get("additional_units_requested", 0)) if payload.payload else 0
    total_requested_units = blood_req.units_requested + additional_units

    state = create_initial_agent_state(
        request_id=blood_req.id,
        recipient_hospital_id=blood_req.hospital_id,
        blood_group=blood_req.blood_group,
        component_type=blood_req.component_type,
        units_requested=total_requested_units,
        urgency=blood_req.urgency,
        max_eta_minutes=payload.max_eta_minutes or blood_req.max_eta_minutes or 45,
    )

    # Seed state with existing plan context and findings
    state["candidate_plan"] = active_plan_dict
    state["parent_plan"] = active_plan_dict
    state["parent_plan_id"] = active_plan.id
    state["trigger_event"] = {
        "id": payload.event_id,
        "event_type": payload.event_type,
        "entity_type": payload.entity_type,
        "entity_id": payload.entity_id,
        "payload": payload.payload,
    }
    state["inventory_findings"] = {"summary": "Pre-event network inventory verified."}
    state["demand_findings"] = {"summary": "Pre-event baseline demand verified."}
    state["matching_findings"] = {"summary": "Pre-event matching verified."}
    state["logistics_findings"] = {"summary": "Pre-event logistics verified."}
    state["donor_findings"] = {"summary": "Pre-event donor standby verified."}
    state["explainability_findings"] = {"summary": "Pre-event explainability verified."}
    state["agents_completed"] = ["inventory", "demand", "matching", "logistics", "donor", "explainability"]

    # Selectively invalidate findings according to dependency map
    state, invalidated_keys = invalidate_stale_findings(state, impact.model_dump())

    # 6. Execute Coordinator LangGraph Orchestration Machine
    final_state = run_rheon_orchestrated_workflow(initial_state=state, db=db)

    # Record that event triggered replan in Event record if event_id exists
    if payload.event_id:
        db_event = db.query(Event).filter(Event.id == payload.event_id).first()
        if db_event:
            db_event.triggered_replan = True
            db.add(db_event)
            db.commit()

    candidate_plan_dict = final_state.get("candidate_plan")
    candidate_db_id = candidate_plan_dict.get("id") if candidate_plan_dict else None
    plan_diff_dict = final_state.get("plan_diff")

    # Check candidate feasibility
    if not candidate_db_id or candidate_plan_dict.get("total_allocated_units", 0) == 0:
        # No alternative feasible plan could be formulated!
        # Do NOT supersede Plan A merely because an attempt was made!
        # Re-evaluate whether Plan A remains viable
        is_parent_viable = EmergencyPlanBuilder.evaluate_plan_feasibility(db, active_plan)
        if not is_parent_viable:
            active_plan.status = "INVIABLE"
            db.add(active_plan)
            db.commit()

        return AdaptiveReplanResponse(
            request_id=payload.request_id,
            parent_plan_id=active_plan.id,
            active_plan_id=None,
            version=active_plan.version,
            status="NO_FEASIBLE_PLAN",
            requires_replan=True,
            impact_analysis=impact,
            plan_diff=PlanDiff(**plan_diff_dict) if plan_diff_dict else None,
            active_plan=None,
            validation_result=final_state.get("validation_result"),
            explanation="No alternative feasible allocation plan exists within network constraints (NO_FEASIBLE_PLAN).",
            donor_standby_activated=True,
            agent_execution_history=final_state.get("agent_execution_history", []),
        )

    # Candidate plan exists. Verify activation status in DB
    candidate_obj = db.query(AllocationPlan).filter(AllocationPlan.id == candidate_db_id).first()
    if candidate_obj and candidate_obj.status == "CANDIDATE":
        # Atomically validate and activate candidate
        parent_plan, activated_plan, is_valid = EmergencyPlanBuilder.activate_replacement_plan(
            db=db,
            parent_plan_id=active_plan.id,
            candidate_plan_id=candidate_obj.id,
            trigger_event_id=payload.event_id,
            plan_diff=plan_diff_dict,
        )
    else:
        activated_plan = candidate_obj

    if not activated_plan or activated_plan.status != "ACTIVE":
        # Replacement failed validation
        return AdaptiveReplanResponse(
            request_id=payload.request_id,
            parent_plan_id=active_plan.id,
            active_plan_id=None,
            version=active_plan.version,
            status="FAILED",
            requires_replan=True,
            impact_analysis=impact,
            plan_diff=PlanDiff(**plan_diff_dict) if plan_diff_dict else None,
            active_plan=None,
            validation_result=final_state.get("validation_result"),
            explanation="Replacement candidate plan failed deterministic safety validation.",
            donor_standby_activated=True,
            agent_execution_history=final_state.get("agent_execution_history", []),
        )

    # Success: Replacement Plan B is active and Plan A is superseded
    plan_diff_dto = PlanDiff(**plan_diff_dict) if plan_diff_dict else None
    explanation_dto = final_state.get("explanation")
    explanation_str = (
        explanation_dto.get("summary")
        if isinstance(explanation_dto, dict)
        else (str(explanation_dto) if explanation_dto else activated_plan.rationale)
    )

    return AdaptiveReplanResponse(
        request_id=payload.request_id,
        parent_plan_id=active_plan.id,
        active_plan_id=activated_plan.id,
        version=activated_plan.version,
        status="ACTIVE",
        requires_replan=True,
        impact_analysis=impact,
        plan_diff=plan_diff_dto,
        active_plan=_to_plan_response(activated_plan),
        validation_result=final_state.get("validation_result"),
        explanation=explanation_str,
        donor_standby_activated=activated_plan.donor_standby_activated,
        agent_execution_history=final_state.get("agent_execution_history", []),
    )
