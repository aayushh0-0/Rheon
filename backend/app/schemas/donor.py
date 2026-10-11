from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict
from app.schemas.enums import BloodGroup


class DonorBase(BaseModel):
    anonymous_id: str
    name: str
    blood_group: str
    location: str
    latitude: float
    longitude: float
    availability_status: str = "AVAILABLE_IMMEDIATE"  # AVAILABLE_IMMEDIATE, STANDBY_ON_CALL, BUSY
    last_donated_date: Optional[datetime] = None
    contact_token: str


class DonorCreate(DonorBase):
    pass


class DonorUpdate(BaseModel):
    availability_status: Optional[str] = None
    last_donated_date: Optional[datetime] = None
    location: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DonorResponse(DonorBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
