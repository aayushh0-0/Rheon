import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.request import BloodRequest
from app.models.facility import Hospital
from app.models.plan import AllocationPlan
from app.schemas.request import (
    BloodRequestCreate,
    BloodRequestUpdate,
    BloodRequestResponse,
)
from app.schemas.planning import EmergencyPlanResponse

router = APIRouter(prefix="/requests", tags=["Requests"])


@router.get(
    "",
    response_model=List[BloodRequestResponse],
    summary="List Blood Requests",
    description="Retrieve hospital emergency blood requests with multi-attribute filtering.",
)
def list_requests(
    hospital_id: Optional[str] = Query(None, description="Filter by requesting hospital ID"),
    status: Optional[str] = Query(None, description="Filter by status (PENDING, PLANNED, FULFILLED, etc.)"),
    blood_group: Optional[str] = Query(None, description="Filter by blood group"),
    urgency: Optional[str] = Query(None, description="Filter by urgency level"),
    db: Session = Depends(get_db),
) -> List[BloodRequestResponse]:
    query = db.query(BloodRequest).order_by(BloodRequest.created_at.desc())
    if hospital_id:
        query = query.filter(BloodRequest.hospital_id == hospital_id)
    if status:
        query = query.filter(BloodRequest.status == status)
    if blood_group:
        query = query.filter(BloodRequest.blood_group == blood_group)
    if urgency:
        query = query.filter(BloodRequest.urgency == urgency)

    return query.all()


@router.get(
    "/{request_id}",
    response_model=BloodRequestResponse,
    summary="Get Blood Request Details",
    description="Fetch a specific blood request by ID.",
)
def get_request(
    request_id: str,
    db: Session = Depends(get_db),
) -> BloodRequestResponse:
    req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request '{request_id}' not found.",
        )
    return req


@router.post(
    "",
    response_model=BloodRequestResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Emergency Blood Request",
    description="Log a new critical or urgent blood requirement from a registered hospital.",
)
def create_request(
    payload: BloodRequestCreate,
    db: Session = Depends(get_db),
) -> BloodRequestResponse:
    # Verify hospital exists
    hospital = db.query(Hospital).filter(Hospital.id == payload.hospital_id).first()
    if not hospital:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Hospital '{payload.hospital_id}' not found.",
        )

    req = BloodRequest(
        id=str(uuid.uuid4()),
        requested_at=datetime.now(timezone.utc),
        **payload.model_dump(),
    )
    db.add(req)
    db.commit()
    db.refresh(req)
    return req


@router.patch(
    "/{request_id}",
    response_model=BloodRequestResponse,
    summary="Update Blood Request",
    description="Update lifecycle status, max ETA requirements, or clinical notes for an emergency request.",
)
def update_request(
    request_id: str,
    payload: BloodRequestUpdate,
    db: Session = Depends(get_db),
) -> BloodRequestResponse:
    req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request '{request_id}' not found.",
        )

    update_data = payload.model_dump(exclude_unset=True)
    for k, v in update_data.items():
        setattr(req, k, v)

    db.commit()
    db.refresh(req)
    return req


@router.get(
    "/{request_id}/plans",
    response_model=List[EmergencyPlanResponse],
    summary="List Plans for Request",
    description="Retrieve all allocation plans generated for a specific blood request.",
)
def get_plans_for_request(
    request_id: str,
    db: Session = Depends(get_db),
) -> List[EmergencyPlanResponse]:
    req = db.query(BloodRequest).filter(BloodRequest.id == request_id).first()
    if not req:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Blood request '{request_id}' not found.",
        )

    plans = db.query(AllocationPlan).filter(AllocationPlan.request_id == request_id).all()
    response_items = []
    for plan in plans:
        response_items.append(
            EmergencyPlanResponse(
                id=plan.id,
                request_id=plan.request_id,
                version=plan.version,
                status=plan.status,
                plan_type=plan.plan_type,
                total_allocated_units=plan.total_allocated_units,
                unmet_units=plan.unmet_units,
                is_fully_fulfilled=(plan.unmet_units == 0 and plan.total_allocated_units > 0),
                donor_standby_activated=plan.donor_standby_activated,
                max_eta_minutes=plan.max_eta_minutes,
                confidence_score=plan.confidence_score,
                rationale=plan.rationale or "",
                items=plan.items,
                created_at=plan.created_at,
                updated_at=plan.updated_at,
            )
        )
    return response_items
