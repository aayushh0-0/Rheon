from sqlalchemy import Column, String, Integer, Float, Boolean, Text, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.models.base import TimestampMixin


class AllocationPlan(Base, TimestampMixin):
    __tablename__ = "allocation_plans"

    request_id = Column(String(36), ForeignKey("blood_requests.id", ondelete="CASCADE"), nullable=False, index=True)
    parent_plan_id = Column(String(36), ForeignKey("allocation_plans.id", ondelete="SET NULL"), nullable=True, index=True)
    trigger_event_id = Column(String(36), ForeignKey("simulation_events.id", ondelete="SET NULL"), nullable=True, index=True)
    version = Column(Integer, nullable=False, default=1)
    status = Column(String(32), nullable=False, default="ACTIVE")  # ACTIVE, SUPERSEDED, FAILED, CANCELLED
    total_allocated_units = Column(Integer, nullable=False, default=0)
    unmet_units = Column(Integer, nullable=False, default=0)
    donor_standby_activated = Column(Boolean, default=False, nullable=False)
    max_eta_minutes = Column(Integer, nullable=False, default=0)
    confidence_score = Column(Float, nullable=False, default=1.0)
    plan_type = Column(String(32), nullable=False, default="DETERMINISTIC_CANDIDATE")
    rationale = Column(Text, nullable=True)

    # Relationships
    request = relationship("BloodRequest", back_populates="plans")
    items = relationship("AllocationItem", back_populates="plan", cascade="all, delete-orphan")


class AllocationItem(Base, TimestampMixin):
    __tablename__ = "allocation_items"

    plan_id = Column(String(36), ForeignKey("allocation_plans.id", ondelete="CASCADE"), nullable=False, index=True)
    source_facility_type = Column(String(16), nullable=False, default="BLOOD_BANK")
    source_facility_id = Column(String(36), nullable=False, index=True)
    source_name = Column(String(128), nullable=False)
    donor_blood_group = Column(String(8), nullable=False)
    units_allocated = Column(Integer, nullable=False)
    transport_mode = Column(String(32), nullable=False, default="STANDARD_COURIER")  # AMBULANCE_SIREN, STANDARD_COURIER, DRONE
    distance_km = Column(Float, nullable=False, default=0.0)
    estimated_eta_minutes = Column(Integer, nullable=False, default=0)
    dispatch_status = Column(String(32), nullable=False, default="PENDING")

    # Relationships
    plan = relationship("AllocationPlan", back_populates="items")
