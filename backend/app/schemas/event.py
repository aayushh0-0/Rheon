from datetime import datetime
from typing import Optional, Dict, Any, Union
from pydantic import BaseModel, ConfigDict
from app.schemas.enums import EventType


class EventBase(BaseModel):
    id: Optional[str] = None
    event_type: str  # FACILITY_OFFLINE, SOURCE_UNAVAILABLE, ROUTE_BLOCKED, ROUTE_DELAY, DEMAND_SURGE, INVENTORY_DEPLETION, INVENTORY_DROP
    entity_type: str  # HOSPITAL, BLOOD_BANK, ROUTE, INVENTORY
    entity_id: str
    payload: Optional[Union[str, Dict[str, Any]]] = "{}"
    triggered_replan: bool = False
    status: Optional[str] = "PROCESSED"  # PROCESSED, DUPLICATE, NO_CHANGE, FAILED


class EventCreate(EventBase):
    pass


class EventResponse(EventBase):
    id: str
    status: str = "PROCESSED"
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
