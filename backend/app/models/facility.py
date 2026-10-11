from sqlalchemy import Column, String, Integer, Float, Boolean
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.models.base import TimestampMixin


class Hospital(Base, TimestampMixin):
    __tablename__ = "hospitals"

    name = Column(String(128), nullable=False)
    code = Column(String(16), unique=True, nullable=False, index=True)
    location = Column(String(128), nullable=False)
    trauma_level = Column(Integer, nullable=False, default=2)  # Level 1, 2, 3
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_phone = Column(String(32), nullable=False)
    emergency_capacity = Column(String(64), nullable=True, default="STANDARD")
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationships
    requests = relationship("BloodRequest", back_populates="hospital", cascade="all, delete-orphan")


class BloodBank(Base, TimestampMixin):
    __tablename__ = "blood_banks"

    name = Column(String(128), nullable=False)
    code = Column(String(16), unique=True, nullable=False, index=True)
    location = Column(String(128), nullable=False)
    is_regional_hub = Column(Boolean, default=False, nullable=False)
    operational_status = Column(String(32), default="ONLINE", nullable=False)  # ONLINE, DEGRADED, OFFLINE
    is_online = Column(Boolean, default=True, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    contact_phone = Column(String(32), nullable=False)

    # Relationships
    inventory = relationship("InventoryBatch", back_populates="blood_bank", cascade="all, delete-orphan")
