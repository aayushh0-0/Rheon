from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.enums import OperationalStatus


class HospitalBase(BaseModel):
    name: str
    code: str
    location: str
    trauma_level: int = 2
    latitude: float
    longitude: float
    contact_phone: str
    emergency_capacity: Optional[str] = "STANDARD"
    google_maps_url: Optional[str] = None
    google_maps_embed_url: Optional[str] = None
    is_active: bool = True


class HospitalCreate(HospitalBase):
    pass


class HospitalResponse(HospitalBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class BloodBankBase(BaseModel):
    name: str
    code: str
    location: str
    is_regional_hub: bool = False
    operational_status: str = OperationalStatus.ONLINE.value
    is_online: bool = True
    latitude: float
    longitude: float
    contact_phone: str


class BloodBankCreate(BloodBankBase):
    pass


class BloodBankResponse(BloodBankBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
