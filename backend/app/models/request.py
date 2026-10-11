from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.models.base import TimestampMixin


class BloodRequest(Base, TimestampMixin):
    __tablename__ = "blood_requests"

    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True)
    blood_group = Column(String(8), nullable=False, index=True)
    component_type = Column(String(16), nullable=False, default="RBC")
    units_requested = Column(Integer, nullable=False)
    urgency = Column(String(32), nullable=False, default="URGENT")  # ROUTINE, URGENT, CRITICAL
    max_eta_minutes = Column(Integer, nullable=False, default=45)
    clinical_notes = Column(Text, nullable=True)
    status = Column(String(32), nullable=False, default="PENDING")  # PENDING, PLANNED, DISPATCHED, FULFILLED, CANCELLED
    requested_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    required_by = Column(DateTime, nullable=True)

    # Relationships
    hospital = relationship("Hospital", back_populates="requests")
    plans = relationship("AllocationPlan", back_populates="request", cascade="all, delete-orphan")
