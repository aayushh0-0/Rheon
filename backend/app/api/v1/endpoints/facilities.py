import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.facility import Hospital, BloodBank
from app.schemas.facility import (
    HospitalCreate,
    HospitalResponse,
    BloodBankCreate,
    BloodBankResponse,
)

router = APIRouter(prefix="/facilities", tags=["Facilities"])


# --- Hospitals ---

@router.get(
    "/hospitals",
    response_model=List[HospitalResponse],
    summary="List Hospitals",
    description="Retrieve all registered trauma hospitals with optional filtering.",
)
def list_hospitals(
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    trauma_level: Optional[int] = Query(None, description="Filter by trauma level (1-3)"),
    db: Session = Depends(get_db),
) -> List[HospitalResponse]:
    query = db.query(Hospital)
    if is_active is not None:
        query = query.filter(Hospital.is_active == is_active)
    if trauma_level is not None:
        query = query.filter(Hospital.trauma_level == trauma_level)
    return query.all()


@router.get(
    "/hospitals/{hospital_id}",
    response_model=HospitalResponse,
    summary="Get Hospital Details",
    description="Fetch a specific hospital by its unique identifier.",
)
def get_hospital(
    hospital_id: str,
    db: Session = Depends(get_db),
) -> HospitalResponse:
    hospital = db.query(Hospital).filter(Hospital.id == hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital with id '{hospital_id}' not found.",
        )
    return hospital


@router.post(
    "/hospitals",
    response_model=HospitalResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Hospital",
    description="Add a new hospital facility to the network.",
)
def create_hospital(
    payload: HospitalCreate,
    db: Session = Depends(get_db),
) -> HospitalResponse:
    existing = db.query(Hospital).filter(Hospital.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Hospital with code '{payload.code}' already exists.",
        )

    hospital = Hospital(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(hospital)
    db.commit()
    db.refresh(hospital)
    return hospital


# --- Blood Banks ---

@router.get(
    "/blood-banks",
    response_model=List[BloodBankResponse],
    summary="List Blood Banks",
    description="Retrieve all registered blood depository banks and regional hubs.",
)
def list_blood_banks(
    is_online: Optional[bool] = Query(None, description="Filter by operational connectivity"),
    is_regional_hub: Optional[bool] = Query(None, description="Filter by regional hub tier"),
    db: Session = Depends(get_db),
) -> List[BloodBankResponse]:
    query = db.query(BloodBank)
    if is_online is not None:
        query = query.filter(BloodBank.is_online == is_online)
    if is_regional_hub is not None:
        query = query.filter(BloodBank.is_regional_hub == is_regional_hub)
    return query.all()


@router.get(
    "/blood-banks/{blood_bank_id}",
    response_model=BloodBankResponse,
    summary="Get Blood Bank Details",
    description="Fetch a specific blood bank depository by its unique identifier.",
)
def get_blood_bank(
    blood_bank_id: str,
    db: Session = Depends(get_db),
) -> BloodBankResponse:
    bank = db.query(BloodBank).filter(BloodBank.id == blood_bank_id).first()
    if not bank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood bank with id '{blood_bank_id}' not found.",
        )
    return bank


@router.post(
    "/blood-banks",
    response_model=BloodBankResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Blood Bank",
    description="Add a new blood bank or regional depository hub to the network.",
)
def create_blood_bank(
    payload: BloodBankCreate,
    db: Session = Depends(get_db),
) -> BloodBankResponse:
    existing = db.query(BloodBank).filter(BloodBank.code == payload.code).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Blood bank with code '{payload.code}' already exists.",
        )

    bank = BloodBank(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(bank)
    db.commit()
    db.refresh(bank)
    return bank


@router.patch(
    "/blood-banks/{blood_bank_id}/status",
    response_model=BloodBankResponse,
    summary="Update Blood Bank Operational Status",
    description="Toggle or update blood bank online status and operational mode.",
)
def update_blood_bank_status(
    blood_bank_id: str,
    is_online: bool = Query(..., description="Operational status online/offline"),
    operational_status: Optional[str] = Query(None, description="Operational status code"),
    db: Session = Depends(get_db),
) -> BloodBankResponse:
    bank = db.query(BloodBank).filter(BloodBank.id == blood_bank_id).first()
    if not bank:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood bank with id '{blood_bank_id}' not found.",
        )

    bank.is_online = is_online
    if operational_status:
        bank.operational_status = operational_status
    elif not is_online:
        bank.operational_status = "OFFLINE"
    else:
        bank.operational_status = "ONLINE"

    db.commit()
    db.refresh(bank)
    return bank
