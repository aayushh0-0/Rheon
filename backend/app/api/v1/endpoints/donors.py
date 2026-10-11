import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.donor import Donor
from app.schemas.donor import DonorCreate, DonorUpdate, DonorResponse

router = APIRouter(prefix="/donors", tags=["Donors"])


@router.get(
    "",
    response_model=List[DonorResponse],
    summary="List Synthetic Donors",
    description="Retrieve registered synthetic emergency donors with availability and blood group filters.",
)
def list_donors(
    blood_group: Optional[str] = Query(None, description="Filter by blood group (e.g. O-, A+)"),
    availability_status: Optional[str] = Query(None, description="Filter by availability status"),
    limit: int = Query(50, ge=1, le=200, description="Max records to return"),
    db: Session = Depends(get_db),
) -> List[DonorResponse]:
    query = db.query(Donor)
    if blood_group:
        query = query.filter(Donor.blood_group == blood_group)
    if availability_status:
        query = query.filter(Donor.availability_status == availability_status)
    return query.limit(limit).all()


@router.get(
    "/{donor_id}",
    response_model=DonorResponse,
    summary="Get Donor Details",
    description="Retrieve an individual synthetic donor profile by ID.",
)
def get_donor(
    donor_id: str,
    db: Session = Depends(get_db),
) -> DonorResponse:
    donor = db.query(Donor).filter(
        (Donor.id == donor_id) | (Donor.anonymous_id == donor_id)
    ).first()
    if not donor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donor '{donor_id}' not found.",
        )
    return donor


@router.post(
    "",
    response_model=DonorResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register Synthetic Donor",
    description="Register a new synthetic donor candidate into the emergency standby registry.",
)
def create_donor(
    payload: DonorCreate,
    db: Session = Depends(get_db),
) -> DonorResponse:
    existing = db.query(Donor).filter(Donor.anonymous_id == payload.anonymous_id).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Donor with anonymous ID '{payload.anonymous_id}' already exists.",
        )

    donor = Donor(
        id=str(uuid.uuid4()),
        **payload.model_dump(),
    )
    db.add(donor)
    db.commit()
    db.refresh(donor)
    return donor


@router.patch(
    "/{donor_id}/status",
    response_model=DonorResponse,
    summary="Update Donor Availability",
    description="Update standby readiness status or recent donation history for a donor.",
)
def update_donor_status(
    donor_id: str,
    payload: DonorUpdate,
    db: Session = Depends(get_db),
) -> DonorResponse:
    donor = db.query(Donor).filter(
        (Donor.id == donor_id) | (Donor.anonymous_id == donor_id)
    ).first()
    if not donor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Donor '{donor_id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(donor, k, v)

    db.commit()
    db.refresh(donor)
    return donor
