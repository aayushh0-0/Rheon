import uuid
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database.session import get_db
from app.models.inventory import InventoryBatch
from app.models.facility import Hospital, BloodBank
from app.schemas.inventory import (
    InventoryBatchCreate,
    InventoryBatchUpdate,
    InventoryBatchResponse,
    InventorySummary,
)
from app.services.inventory.engine import InventoryReserveEngine

router = APIRouter(prefix="/inventory", tags=["Inventory"])


@router.get(
    "/batches",
    response_model=List[InventoryBatchResponse],
    summary="List Inventory Batches",
    description="Query blood inventory batches with multi-dimensional filtering.",
)
def list_batches(
    facility_type: Optional[str] = Query(None, description="Filter by facility type (BLOOD_BANK, HOSPITAL)"),
    blood_bank_id: Optional[str] = Query(None, description="Filter by blood bank ID"),
    hospital_id: Optional[str] = Query(None, description="Filter by hospital ID"),
    blood_group: Optional[str] = Query(None, description="Filter by blood group (e.g. O-, A+)"),
    status: Optional[str] = Query(None, description="Filter by inventory status"),
    db: Session = Depends(get_db),
) -> List[InventoryBatchResponse]:
    query = db.query(InventoryBatch)
    if facility_type:
        query = query.filter(InventoryBatch.facility_type == facility_type)
    if blood_bank_id:
        query = query.filter(InventoryBatch.blood_bank_id == blood_bank_id)
    if hospital_id:
        query = query.filter(InventoryBatch.hospital_id == hospital_id)
    if blood_group:
        query = query.filter(InventoryBatch.blood_group == blood_group)
    if status:
        query = query.filter(InventoryBatch.status == status)

    return query.all()


@router.get(
    "/batches/{batch_id}",
    response_model=InventoryBatchResponse,
    summary="Get Inventory Batch",
    description="Retrieve full details and usable stock metrics for a single inventory batch.",
)
def get_batch(
    batch_id: str,
    db: Session = Depends(get_db),
) -> InventoryBatchResponse:
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory batch with id '{batch_id}' not found.",
        )
    return batch


@router.post(
    "/batches",
    response_model=InventoryBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Inventory Batch",
    description="Record a new inventory batch with automated reserve calculation.",
)
def create_batch(
    payload: InventoryBatchCreate,
    db: Session = Depends(get_db),
) -> InventoryBatchResponse:
    data = payload.model_dump()

    # Calculate safety reserve if zero/unspecified
    if data.get("safety_reserve_units", 0) == 0:
        if data.get("facility_type") == "BLOOD_BANK" and data.get("blood_bank_id"):
            bank = db.query(BloodBank).filter(BloodBank.id == data["blood_bank_id"]).first()
            is_hub = bank.is_regional_hub if bank else False
            data["safety_reserve_units"] = InventoryReserveEngine.calculate_blood_bank_safety_reserve(
                blood_group=data["blood_group"],
                total_units=data["total_units"],
                is_regional_hub=is_hub,
            )
        elif data.get("facility_type") == "HOSPITAL" and data.get("hospital_id"):
            hosp = db.query(Hospital).filter(Hospital.id == data["hospital_id"]).first()
            trauma_lvl = hosp.trauma_level if hosp else 2
            cap = hosp.emergency_capacity if hosp else "STANDARD"
            data["safety_reserve_units"] = InventoryReserveEngine.calculate_hospital_safety_reserve(
                blood_group=data["blood_group"],
                trauma_level=trauma_lvl,
                emergency_capacity=cap,
            )

    # Evaluate status
    data["status"] = InventoryReserveEngine.evaluate_inventory_status(
        available_units=data["available_units"],
        safety_reserve_units=data["safety_reserve_units"],
    ).value

    batch = InventoryBatch(
        id=str(uuid.uuid4()),
        **data,
    )
    db.add(batch)
    db.commit()
    db.refresh(batch)
    return batch


@router.patch(
    "/batches/{batch_id}",
    response_model=InventoryBatchResponse,
    summary="Update Inventory Batch",
    description="Update batch units, available count, or manual safety reserve overrides.",
)
def update_batch(
    batch_id: str,
    payload: InventoryBatchUpdate,
    db: Session = Depends(get_db),
) -> InventoryBatchResponse:
    batch = db.query(InventoryBatch).filter(InventoryBatch.id == batch_id).first()
    if not batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Inventory batch with id '{batch_id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(batch, k, v)

    # Re-evaluate status based on updated units
    batch.status = InventoryReserveEngine.evaluate_inventory_status(
        available_units=batch.available_units,
        safety_reserve_units=batch.safety_reserve_units,
    ).value

    db.commit()
    db.refresh(batch)
    return batch


@router.get(
    "/summary",
    response_model=List[InventorySummary],
    summary="Network Inventory Summary",
    description="Aggregated network-wide inventory levels, reserve requirements, and health status by blood group.",
)
def get_inventory_summary(
    component_type: str = Query("RBC", description="Component type filter (RBC, FFP, PLATELETS, CRYO)"),
    db: Session = Depends(get_db),
) -> List[InventorySummary]:
    batches = db.query(InventoryBatch).filter(
        InventoryBatch.component_type == component_type
    ).all()

    grouped: Dict[str, Dict[str, Any]] = {}
    for b in batches:
        bg = b.blood_group
        if bg not in grouped:
            grouped[bg] = {
                "blood_group": bg,
                "component_type": component_type,
                "total_available_units": 0,
                "total_safety_reserve": 0,
                "total_usable_units": 0,
                "facility_count": 0,
                "seen_facilities": set(),
            }
        grouped[bg]["total_available_units"] += b.available_units
        grouped[bg]["total_safety_reserve"] += b.safety_reserve_units
        grouped[bg]["total_usable_units"] += max(0, b.available_units - b.safety_reserve_units)
        fac = b.blood_bank_id or b.hospital_id
        if fac:
            grouped[bg]["seen_facilities"].add(fac)

    summaries = []
    for bg, data in sorted(grouped.items()):
        status_val = InventoryReserveEngine.evaluate_inventory_status(
            available_units=data["total_available_units"],
            safety_reserve_units=data["total_safety_reserve"],
        ).value

        summaries.append(
            InventorySummary(
                blood_group=bg,
                component_type=component_type,
                total_available_units=data["total_available_units"],
                total_safety_reserve=data["total_safety_reserve"],
                total_usable_units=data["total_usable_units"],
                status=status_val,
                facility_count=len(data["seen_facilities"]),
            )
        )

    return summaries


@router.get(
    "/safety-reserve/hospital/{hospital_id}",
    summary="Calculate Hospital Safety Reserve",
    description="Determines the minimum mandatory safety reserve for all blood groups at a hospital.",
)
def get_hospital_safety_reserve(
    hospital_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    hosp = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hosp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital '{hospital_id}' not found.",
        )

    groups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
    reserves = {}
    for bg in groups:
        res = InventoryReserveEngine.calculate_hospital_safety_reserve(
            blood_group=bg,
            trauma_level=hosp.trauma_level,
            emergency_capacity=hosp.emergency_capacity or "STANDARD",
        )
        reserves[bg] = res

    return {
        "hospital_id": hosp.id,
        "hospital_name": hosp.name,
        "trauma_level": hosp.trauma_level,
        "emergency_capacity": hosp.emergency_capacity,
        "required_safety_reserves": reserves,
    }


@router.get(
    "/safety-reserve/blood-bank/{blood_bank_id}",
    summary="Calculate Blood Bank Safety Reserve",
    description="Determines the minimum mandatory safety reserve for all blood groups at a blood bank.",
)
def get_blood_bank_safety_reserve(
    blood_bank_id: str,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    bank = db.query(BloodBank).filter(BloodBank.id == blood_bank_id).first()
    if not bank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood bank '{blood_bank_id}' not found.",
        )

    groups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
    reserves = {}
    for bg in groups:
        # Get total units if available, or assume baseline
        batch = db.query(InventoryBatch).filter(
            InventoryBatch.blood_bank_id == bank.id,
            InventoryBatch.blood_group == bg,
        ).first()
        total_units = batch.total_units if batch else 30
        res = InventoryReserveEngine.calculate_blood_bank_safety_reserve(
            blood_group=bg,
            total_units=total_units,
            is_regional_hub=bank.is_regional_hub,
        )
        reserves[bg] = res

    return {
        "blood_bank_id": bank.id,
        "blood_bank_name": bank.name,
        "is_regional_hub": bank.is_regional_hub,
        "required_safety_reserves": reserves,
    }
