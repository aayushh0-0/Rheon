from sqlalchemy import Column, String, Boolean, Text
from app.database.session import Base
from app.models.base import TimestampMixin


class Event(Base, TimestampMixin):
    __tablename__ = "simulation_events"

    event_type = Column(String(32), nullable=False)  # FACILITY_OFFLINE, SOURCE_UNAVAILABLE, ROUTE_BLOCKED, ROUTE_DELAY, DEMAND_SURGE, INVENTORY_DEPLETION, INVENTORY_DROP
    entity_type = Column(String(32), nullable=False)  # HOSPITAL, BLOOD_BANK, ROUTE, INVENTORY
    entity_id = Column(String(36), nullable=False, index=True)
    payload = Column(Text, nullable=False, default="{}")
    triggered_replan = Column(Boolean, default=False, nullable=False)

    @property
    def status(self) -> str:
        return "PROCESSED"
