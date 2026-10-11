import uuid
import json
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.models.event import Event
from app.models.facility import BloodBank, Hospital
from app.models.route import Route
from app.models.inventory import InventoryBatch
from app.schemas.event import EventCreate, EventResponse
from app.schemas.enums import EventType

router = APIRouter(prefix="/events", tags=["Simulation Events"])

VALID_EVENT_TYPES = {e.value for e in EventType}
VALID_ENTITY_TYPES = {"HOSPITAL", "BLOOD_BANK", "ROUTE", "INVENTORY"}


@router.get(
    "",
    response_model=List[EventResponse],
    summary="List Simulation Events",
    description="Query simulation disruption and demand events.",
)
def list_events(
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    entity_type: Optional[str] = Query(None, description="Filter by entity type"),
    limit: int = Query(50, ge=1, le=200, description="Max events to return"),
    db: Session = Depends(get_db),
) -> List[EventResponse]:
    query = db.query(Event).order_by(Event.created_at.desc())
    if event_type:
        query = query.filter(Event.event_type == event_type.upper())
    if entity_type:
        query = query.filter(Event.entity_type == entity_type.upper())
    return query.limit(limit).all()


@router.post(
    "",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Record & Simulate Disruption Event",
    description="Inject a simulation event (e.g. facility outage, road blockage, demand surge) and apply state changes safely.",
)
def create_event(
    payload: EventCreate,
    db: Session = Depends(get_db),
) -> EventResponse:
    evt_type = payload.event_type.upper().strip()
    ent_type = payload.entity_type.upper().strip()
    ent_id = payload.entity_id.strip()

    # 1. Validate non-empty fields
    if not evt_type or not ent_type or not ent_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="event_type, entity_type, and entity_id must all be non-empty strings.",
        )

    # 2. Duplicate event check (Idempotency)
    # If client supplied an id, check if it was already processed
    if payload.id:
        existing = db.query(Event).filter(Event.id == payload.id).first()
        if existing:
            # Return existing event indicating DUPLICATE without reapplying side effects
            return existing

    # Check if an identical event was processed recently for this entity
    payload_raw = payload.payload if isinstance(payload.payload, str) else json.dumps(payload.payload or {})
    duplicate_event = (
        db.query(Event)
        .filter(
            Event.event_type == evt_type,
            Event.entity_type == ent_type,
            Event.entity_id == ent_id,
            Event.payload == payload_raw,
        )
        .order_by(Event.created_at.desc())
        .first()
    )
    if duplicate_event and duplicate_event.status == "PROCESSED" and payload.id is not None:
        return duplicate_event

    # 3. Parse and validate payload safely
    parsed_payload: Dict[str, Any] = {}
    if isinstance(payload.payload, str):
        try:
            parsed_payload = json.loads(payload.payload) if payload.payload else {}
        except Exception:
            parsed_payload = {}
    elif isinstance(payload.payload, dict):
        parsed_payload = payload.payload

    event_id = payload.id or str(uuid.uuid4())
    event = Event(
        id=event_id,
        event_type=evt_type,
        entity_type=ent_type,
        entity_id=ent_id,
        payload=json.dumps(parsed_payload),
        triggered_replan=payload.triggered_replan,
    )
    db.add(event)

    # 4. Apply simulated state changes deterministically to models
    if evt_type in ["FACILITY_OFFLINE", "SOURCE_UNAVAILABLE"]:
        if ent_type == "BLOOD_BANK":
            bank = db.query(BloodBank).filter(BloodBank.id == ent_id).first()
            if not bank:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Blood bank '{ent_id}' not found.",
                )
            bank.is_online = False
            bank.operational_status = "OFFLINE"
            db.add(bank)
        elif ent_type == "HOSPITAL":
            hosp = db.query(Hospital).filter(Hospital.id == ent_id).first()
            if not hosp:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail=f"Hospital '{ent_id}' not found.",
                )
            hosp.is_active = False
            db.add(hosp)

    elif evt_type in ["ROUTE_BLOCKED", "ROUTE_DELAY"] and ent_type == "ROUTE":
        route = db.query(Route).filter(Route.id == ent_id).first()
        if route:
            if evt_type == "ROUTE_BLOCKED":
                route.status = "BLOCKED"
            db.add(route)

    elif evt_type in ["INVENTORY_DEPLETION", "INVENTORY_DROP"]:
        deplete_by = int(parsed_payload.get("deplete_units", parsed_payload.get("units_lost", 0)))
        if ent_type == "INVENTORY":
            batch = db.query(InventoryBatch).filter(InventoryBatch.id == ent_id).first()
            if batch:
                units = deplete_by if deplete_by > 0 else batch.available_units
                batch.available_units = max(0, batch.available_units - units)
                db.add(batch)
        elif ent_type in ["BLOOD_BANK", "HOSPITAL"]:
            # Deplete batches belonging to this facility
            b_query = db.query(InventoryBatch)
            if ent_type == "BLOOD_BANK":
                b_query = b_query.filter(InventoryBatch.blood_bank_id == ent_id)
            else:
                b_query = b_query.filter(InventoryBatch.hospital_id == ent_id)
            
            target_group = parsed_payload.get("blood_group")
            if target_group:
                b_query = b_query.filter(InventoryBatch.blood_group == target_group)

            batches = b_query.all()
            for b in batches:
                units = deplete_by if deplete_by > 0 else b.available_units
                b.available_units = max(0, b.available_units - units)
                db.add(b)

    db.commit()
    db.refresh(event)
    return event
