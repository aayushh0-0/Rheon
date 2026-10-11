from typing import Optional, List, Dict
from pydantic import BaseModel, ConfigDict
from app.schemas.enums import BloodGroup, ComponentType, UrgencyLevel


class MatchingRequest(BaseModel):
    hospital_id: Optional[str] = None
    recipient_latitude: Optional[float] = None
    recipient_longitude: Optional[float] = None
    blood_group: str
    component_type: str = ComponentType.RBC.value
    units_requested: int
    urgency: str = UrgencyLevel.URGENT.value
    max_eta_minutes: int = 45


class MatchingCandidate(BaseModel):
    source_facility_id: str
    source_facility_type: str  # BLOOD_BANK or HOSPITAL
    source_name: str
    donor_blood_group: str
    is_compatible: bool
    is_exact_match: bool
    is_universal_donor: bool
    total_units: int
    available_units: int
    safety_reserve_units: int
    usable_units: int
    units_available_for_request: int
    distance_km: float
    estimated_minutes: int
    traffic_factor: float
    is_operational: bool
    is_hub: bool
    composite_score: float
    is_feasible: bool
    rejection_reasons: List[str] = []

    model_config = ConfigDict(from_attributes=True)


class MatchingResponse(BaseModel):
    request_blood_group: str
    component_type: str
    units_requested: int
    urgency: str
    max_eta_minutes: int
    compatible_donor_groups: List[str]
    candidates: List[MatchingCandidate]
    total_network_usable_units: int
    feasible_candidates_count: int
    sufficient_inventory_available: bool
