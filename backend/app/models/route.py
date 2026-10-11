from sqlalchemy import Column, String, Float, Integer, ForeignKey
from app.database.session import Base
from app.models.base import TimestampMixin


class Route(Base, TimestampMixin):
    __tablename__ = "transfer_routes"

    source_type = Column(String(16), nullable=False, default="BLOOD_BANK")  # BLOOD_BANK, HOSPITAL
    source_id = Column(String(36), nullable=False, index=True)
    destination_hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=False, index=True)
    distance_km = Column(Float, nullable=False)
    estimated_minutes = Column(Integer, nullable=False)
    traffic_factor = Column(Float, nullable=False, default=1.0)
    status = Column(String(32), nullable=False, default="OPEN")  # OPEN, CONGESTED, BLOCKED
