from typing import TypedDict, Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
import uuid
import datetime


class AgentExecutionRecord(BaseModel):
    """Execution trace entry for a single agent node run."""
    execution_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    agent_name: str
    state_node: str
    started_at: str = Field(default_factory=lambda: datetime.datetime.utcnow().isoformat())
    completed_at: Optional[str] = None
    status: str = "COMPLETED"  # SUCCESS, COMPLETED, FAILED, SKIPPED
    latency_ms: Optional[int] = None
    tools_called: List[str] = Field(default_factory=list)
    reasoning_summary: Optional[str] = None
    error: Optional[str] = None
    input_summary: Optional[Dict[str, Any]] = None
    output_summary: Optional[Dict[str, Any]] = None


class RheonAgentState(TypedDict, total=False):
    """
    TypedDict representing the shared multi-agent state across the LangGraph state machine.
    """
    # Emergency Request Context
    request_id: str
    patient_id: Optional[str]
    urgency: str  # CRITICAL, STAT, ROUTINE
    recipient_hospital_id: str
    recipient_hospital_name: Optional[str]
    recipient_coordinates: Optional[Dict[str, float]]
    blood_group: str
    component_type: str
    units_requested: int
    max_eta_minutes: Optional[int]
    special_requirements: Optional[List[str]]

    # Specialized Agent Findings
    inventory_findings: Optional[Dict[str, Any]]
    demand_findings: Optional[Dict[str, Any]]
    matching_findings: Optional[Dict[str, Any]]
    logistics_findings: Optional[Dict[str, Any]]
    donor_findings: Optional[Dict[str, Any]]
    explainability_findings: Optional[Dict[str, Any]]

    # Orchestration State Tracking
    current_node: Optional[str]
    agents_requested: List[str]
    agents_completed: List[str]
    agents_failed: List[str]
    next_agent: Optional[str]
    orchestration_status: str
    decision_reason: Optional[str]
    coordinator_decision: Optional[Dict[str, Any]]

    # Sourced Candidate Plan & Safety Validation
    candidate_plan: Optional[Dict[str, Any]]
    validation_result: Optional[Dict[str, Any]]
    explanation: Optional[Dict[str, Any]]
    confidence_score: Optional[float]
    allocations: Optional[List[Dict[str, Any]]]
    transport_mode: Optional[str]
    donor_strategy: Optional[str]

    # Re-planning & Disruption Context (Phase 2E)
    is_replanned: Optional[bool]
    replan_required: Optional[bool]
    trigger_event: Optional[Dict[str, Any]]
    parent_plan_id: Optional[str]
    parent_plan: Optional[Dict[str, Any]]
    plan_diff: Optional[Dict[str, Any]]
    impact_analysis: Optional[Dict[str, Any]]
    invalidated_findings: Optional[List[str]]
    excluded_facility_ids: Optional[List[str]]

    # Workflow Control & Execution Tracing
    status: str  # PENDING, IN_PROGRESS, VALIDATED, COORDINATOR_READY, COMPLETED, FAILED
    errors: List[str]
    warnings: List[str]
    agent_execution_history: List[Dict[str, Any]]
    messages: List[Dict[str, Any]]
    iteration_count: int
    metadata: Dict[str, Any]


def create_initial_agent_state(
    request_id: Optional[str] = None,
    recipient_hospital_id: str = "",
    blood_group: str = "O-",
    component_type: str = "RBC",
    units_requested: int = 1,
    urgency: str = "CRITICAL",
    max_eta_minutes: Optional[int] = 45,
    patient_id: Optional[str] = None,
    recipient_hospital_name: Optional[str] = None,
    recipient_coordinates: Optional[Dict[str, float]] = None,
    special_requirements: Optional[List[str]] = None,
) -> RheonAgentState:
    """
    Factory helper to create a clean, strongly-typed initial RheonAgentState.
    """
    req_id = request_id or str(uuid.uuid4())
    return RheonAgentState(
        request_id=req_id,
        patient_id=patient_id,
        urgency=urgency,
        recipient_hospital_id=recipient_hospital_id,
        recipient_hospital_name=recipient_hospital_name,
        recipient_coordinates=recipient_coordinates,
        blood_group=blood_group,
        component_type=component_type,
        units_requested=units_requested,
        max_eta_minutes=max_eta_minutes,
        special_requirements=special_requirements or [],
        inventory_findings=None,
        demand_findings=None,
        matching_findings=None,
        logistics_findings=None,
        donor_findings=None,
        explainability_findings=None,
        current_node=None,
        agents_requested=[],
        agents_completed=[],
        agents_failed=[],
        next_agent=None,
        orchestration_status="INITIALIZING",
        decision_reason=None,
        coordinator_decision=None,
        candidate_plan=None,
        validation_result=None,
        explanation=None,
        confidence_score=0.0,
        allocations=[],
        transport_mode=None,
        donor_strategy=None,
        is_replanned=False,
        replan_required=False,
        trigger_event=None,
        parent_plan_id=None,
        parent_plan=None,
        plan_diff=None,
        impact_analysis=None,
        invalidated_findings=[],
        excluded_facility_ids=[],
        status="PENDING",
        errors=[],
        warnings=[],
        agent_execution_history=[],
        messages=[],
        iteration_count=0,
        metadata={},
    )
