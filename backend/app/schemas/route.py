from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class RouteBase(BaseModel):
    source_facility_type: str = "BLOOD_BANK"  # BLOOD_BANK or HOSPITAL
    source_id: str
    destination_hospital_id: str
    distance_km: float
    estimated_minutes: int
    traffic_factor: float = 1.0
    status: str = "OPEN"  # OPEN, CONGESTED, BLOCKED
    route_name: Optional[str] = None


class RouteCreate(RouteBase):
    pass


class RouteResponse(RouteBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
