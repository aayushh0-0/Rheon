from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Index
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.models.base import TimestampMixin


class InventoryBatch(Base, TimestampMixin):
    __tablename__ = "blood_inventory"

    facility_type = Column(String(16), nullable=False, default="BLOOD_BANK")  # BLOOD_BANK, HOSPITAL
    blood_bank_id = Column(String(36), ForeignKey("blood_banks.id", ondelete="CASCADE"), nullable=True, index=True)
    hospital_id = Column(String(36), ForeignKey("hospitals.id", ondelete="CASCADE"), nullable=True, index=True)

    blood_group = Column(String(8), nullable=False, index=True)  # O+, O-, A+, A-, B+, B-, AB+, AB-
    component_type = Column(String(16), nullable=False, default="RBC")  # RBC / PRBC, FFP, PLATELETS, CRYO

    total_units = Column(Integer, nullable=False, default=0)
    available_units = Column(Integer, nullable=False, default=0)
    reserved_units = Column(Integer, nullable=False, default=0)
    safety_reserve_units = Column(Integer, nullable=False, default=0)

    expiry_date = Column(DateTime, nullable=True)
    batch_number = Column(String(32), nullable=False)
    status = Column(String(32), nullable=False, default="HEALTHY")  # HEALTHY, LOW, CRITICAL, OUT_OF_STOCK, EXPIRED

    # Relationships
    blood_bank = relationship("BloodBank", back_populates="inventory")

    __table_args__ = (
        Index("ix_inventory_bank_blood", "blood_bank_id", "blood_group", "component_type"),
        Index("ix_inventory_hosp_blood", "hospital_id", "blood_group", "component_type"),
    )

    @property
    def usable_units(self) -> int:
        """Usable units strictly protecting safety reserves and reserved units."""
        return max(0, self.available_units - self.safety_reserve_units)

    @property
    def facility_id(self) -> str:
        return self.blood_bank_id or self.hospital_id or ""
