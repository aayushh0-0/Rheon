from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict, Field
from app.schemas.enums import BloodGroup, ComponentType, UrgencyLevel, TransportMode


class AllocationItemDTO(BaseModel):
    id: Optional[str] = None
    source_facility_type: str = "BLOOD_BANK"  # BLOOD_BANK or HOSPITAL
    source_facility_id: str
    source_name: str
    donor_blood_group: str
    units_allocated: int
    transport_mode: str = TransportMode.STANDARD_COURIER.value
    distance_km: float = 0.0
    estimated_eta_minutes: int = 0
    dispatch_status: str = "PENDING"

    model_config = ConfigDict(from_attributes=True)


class EmergencyPlanRequest(BaseModel):
    request_id: Optional[str] = None
    hospital_id: str
    blood_group: str
    component_type: str = ComponentType.RBC.value
    units_requested: int
    urgency: str = UrgencyLevel.URGENT.value
    max_eta_minutes: int = 45


class EmergencyPlanResponse(BaseModel):
    id: str
    request_id: Optional[str] = None
    parent_plan_id: Optional[str] = None
    trigger_event_id: Optional[str] = None
    version: int = 1
    status: str = "ACTIVE"
    plan_type: str = "DETERMINISTIC_CANDIDATE"
    total_allocated_units: int
    unmet_units: int
    is_fully_fulfilled: bool = False
    donor_standby_activated: bool
    max_eta_minutes: int
    confidence_score: float
    rationale: str
    items: List[AllocationItemDTO]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PlanImpactAnalysis(BaseModel):
    """
    Deterministic evaluation of a disruption simulation event against active plan allocations.
    """
    event_id: Optional[str] = None
    event_type: str
    is_impacted: bool
    requires_replan: bool
    invalidated_source_ids: List[str] = Field(default_factory=list)
    invalidated_units: int = 0
    remaining_viable_units: int = 0
    deficit_units: int = 0
    affected_findings: List[str] = Field(default_factory=list)
    preserved_findings: List[str] = Field(default_factory=list)
    root_cause_summary: str
    timestamp: datetime = Field(default_factory=datetime.utcnow)

    model_config = ConfigDict(from_attributes=True)


class PlanDiffItem(BaseModel):
    """
    Detailed source-level differential between parent plan (v1) and candidate plan (v2).
    """
    source_facility_id: str
    source_name: str
    change_type: str  # ADDED, REMOVED, MODIFIED, UNCHANGED
    previous_units: int = 0
    new_units: int = 0
    previous_transport_mode: Optional[str] = None
    new_transport_mode: Optional[str] = None
    previous_eta_minutes: Optional[int] = None
    new_eta_minutes: Optional[int] = None
    reason: str = ""

    model_config = ConfigDict(from_attributes=True)


class PlanDiff(BaseModel):
    """
    Structural and metric comparison between two versions of an allocation plan.
    """
    parent_plan_id: Optional[str] = None
    new_plan_id: Optional[str] = None
    parent_version: int = 1
    new_version: int = 2
    trigger_event_type: Optional[str] = None
    total_units_delta: int = 0
    max_eta_delta_minutes: int = 0
    sources_added_count: int = 0
    sources_removed_count: int = 0
    sources_modified_count: int = 0
    items_diff: List[PlanDiffItem] = Field(default_factory=list)
    structural_summary: str = ""

    model_config = ConfigDict(from_attributes=True)


class AdaptiveReplanRequest(BaseModel):
    """
    Payload to trigger adaptive emergency re-planning from a synthetic disruption event.
    """
    request_id: str
    event_id: Optional[str] = None
    event_type: str = "SOURCE_UNAVAILABLE"  # SOURCE_UNAVAILABLE, INVENTORY_DROP, ROUTE_DELAY, DEMAND_SURGE, FACILITY_OFFLINE, ROUTE_BLOCKED, INVENTORY_DEPLETION
    entity_type: str = "BLOOD_BANK"  # BLOOD_BANK, HOSPITAL, ROUTE, INVENTORY
    entity_id: str
    payload: Optional[Dict[str, Any]] = None
    max_eta_minutes: Optional[int] = 45


class AdaptiveReplanResponse(BaseModel):
    """
    Comprehensive response for an adaptive re-planning run.
    """
    request_id: str
    parent_plan_id: Optional[str] = None
    active_plan_id: Optional[str] = None
    version: int = 1
    status: str = "ACTIVE"  # ACTIVE, SUPERSEDED, FAILED, NO_CHANGE
    requires_replan: bool = False
    impact_analysis: PlanImpactAnalysis
    plan_diff: Optional[PlanDiff] = None
    active_plan: Optional[EmergencyPlanResponse] = None
    validation_result: Optional[Dict[str, Any]] = None
    explanation: Optional[str] = None
    donor_standby_activated: bool = False
    agent_execution_history: List[Dict[str, Any]] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

