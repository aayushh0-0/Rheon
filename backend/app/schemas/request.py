from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.enums import BloodGroup, ComponentType, UrgencyLevel, RequestStatus


class BloodRequestBase(BaseModel):
    hospital_id: str
    blood_group: str
    component_type: str = ComponentType.RBC.value
    units_requested: int
    urgency: str = UrgencyLevel.URGENT.value
    max_eta_minutes: int = 45
    clinical_notes: Optional[str] = None
    status: str = RequestStatus.PENDING.value
    requested_at: Optional[datetime] = None
    required_by: Optional[datetime] = None


class BloodRequestCreate(BaseModel):
    hospital_id: str
    blood_group: str
    component_type: str = ComponentType.RBC.value
    units_requested: int
    urgency: str = UrgencyLevel.URGENT.value
    max_eta_minutes: int = 45
    clinical_notes: Optional[str] = None
    status: str = RequestStatus.PENDING.value
    required_by: Optional[datetime] = None


class BloodRequestUpdate(BaseModel):
    status: Optional[str] = None
    max_eta_minutes: Optional[int] = None
    urgency: Optional[str] = None
    clinical_notes: Optional[str] = None


class BloodRequestResponse(BloodRequestBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
