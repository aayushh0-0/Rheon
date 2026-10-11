from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class ValidationCheckDetail(BaseModel):
    check_name: str
    passed: bool
    message: str
    details: Optional[Dict[str, Any]] = None


class ValidationChecksSummary(BaseModel):
    compatibility: bool
    quantity_conservation: bool
    reserve_protection: bool
    source_status: bool
    logistics_validity: bool
    mathematical_consistency: bool


class PlanValidationRequest(BaseModel):
    plan_id: Optional[str] = None
    recipient_hospital_id: str
    recipient_blood_group: str
    component_type: str = "RBC"
    units_requested: int
    max_eta_minutes: int = 45
    allocations: List[Dict[str, Any]]


class PlanValidationResponse(BaseModel):
    is_valid: bool
    errors: List[str]
    warnings: List[str]
    checks: ValidationChecksSummary
    check_details: List[ValidationCheckDetail]
