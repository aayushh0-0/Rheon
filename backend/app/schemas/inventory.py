from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, ConfigDict
from app.schemas.enums import BloodGroup, ComponentType, InventoryStatus


class InventoryBatchBase(BaseModel):
    facility_type: str = "BLOOD_BANK"  # BLOOD_BANK or HOSPITAL
    blood_bank_id: Optional[str] = None
    hospital_id: Optional[str] = None
    blood_group: str
    component_type: str = ComponentType.RBC.value
    total_units: int = 0
    available_units: int = 0
    reserved_units: int = 0
    safety_reserve_units: int = 0
    expiry_date: Optional[datetime] = None
    batch_number: str
    status: str = InventoryStatus.HEALTHY.value


class InventoryBatchCreate(InventoryBatchBase):
    pass


class InventoryBatchUpdate(BaseModel):
    total_units: Optional[int] = None
    available_units: Optional[int] = None
    reserved_units: Optional[int] = None
    safety_reserve_units: Optional[int] = None
    status: Optional[str] = None


class InventoryBatchResponse(InventoryBatchBase):
    id: str
    usable_units: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InventorySummary(BaseModel):
    blood_group: str
    component_type: str
    total_available_units: int
    total_safety_reserve: int
    total_usable_units: int
    status: str
    facility_count: int
