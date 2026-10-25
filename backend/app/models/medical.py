from sqlalchemy import Column, String, Float, Text, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from app.database.session import Base
from app.models.base import TimestampMixin


class MedicalReport(Base, TimestampMixin):
    __tablename__ = "medical_reports"

    patient_id = Column(String(64), nullable=False, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(512), nullable=True)
    report_type = Column(String(64), nullable=False, default="BLOOD_WORK")
    status = Column(String(32), nullable=False, default="PENDING_EXTRACTION")
    summary = Column(Text, nullable=True)
    extracted_data = Column(Text, nullable=True)

    measurements = relationship("MedicalMeasurement", back_populates="report", cascade="all, delete-orphan")


class MedicalMeasurement(Base, TimestampMixin):
    __tablename__ = "medical_measurements"

    report_id = Column(String(36), ForeignKey("medical_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    parameter_name = Column(String(128), nullable=False)
    value = Column(String(64), nullable=False)
    unit = Column(String(32), nullable=True)
    reference_range = Column(String(64), nullable=True)
    status = Column(String(32), nullable=False, default="NORMAL")
    is_verified = Column(Boolean, default=False, nullable=False)
    notes = Column(Text, nullable=True)

    report = relationship("MedicalReport", back_populates="measurements")
