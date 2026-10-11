from typing import Optional
from pydantic import BaseModel
from app.schemas.enums import TransportMode, UrgencyLevel


class LogisticsEstimateRequest(BaseModel):
    origin_latitude: float
    origin_longitude: float
    destination_latitude: float
    destination_longitude: float
    urgency: str = UrgencyLevel.URGENT.value
    traffic_factor: float = 1.0


class LogisticsEstimateResponse(BaseModel):
    distance_km: float
    estimated_minutes: int
    transport_mode: str = TransportMode.STANDARD_COURIER.value
    traffic_factor: float = 1.0
    is_drone_eligible: bool = False
