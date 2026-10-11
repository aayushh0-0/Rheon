from sqlalchemy import Column, String, Float, DateTime
from app.database.session import Base
from app.models.base import TimestampMixin


class Donor(Base, TimestampMixin):
    __tablename__ = "synthetic_donors"

    anonymous_id = Column(String(32), unique=True, nullable=False, index=True)
    name = Column(String(128), nullable=False)
    blood_group = Column(String(8), nullable=False, index=True)
    location = Column(String(128), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    availability_status = Column(String(32), nullable=False, default="AVAILABLE_IMMEDIATE")  # AVAILABLE_IMMEDIATE, STANDBY_ON_CALL, BUSY
    last_donated_date = Column(DateTime, nullable=True)
    contact_token = Column(String(64), nullable=False)
