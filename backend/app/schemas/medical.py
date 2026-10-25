from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class MedicalMeasurementBase(BaseModel):
    parameter_name: str
    value: str
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = "NORMAL"
    is_verified: bool = False
    notes: Optional[str] = None


class MedicalMeasurementCreate(MedicalMeasurementBase):
    pass


class MedicalMeasurementUpdate(BaseModel):
    parameter_name: Optional[str] = None
    value: Optional[str] = None
    unit: Optional[str] = None
    reference_range: Optional[str] = None
    status: Optional[str] = None
    is_verified: Optional[bool] = None
    notes: Optional[str] = None


class MedicalMeasurementResponse(MedicalMeasurementBase):
    id: str
    report_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MedicalReportBase(BaseModel):
    patient_id: str
    report_type: str = "BLOOD_WORK"


class MedicalReportCreate(MedicalReportBase):
    filename: str
    file_path: Optional[str] = None
    summary: Optional[str] = None
    extracted_data: Optional[str] = None


class MedicalReportUploadRequest(BaseModel):
    patient_id: str
    report_type: str = "BLOOD_WORK"
    filename: str = "medical_report.txt"
    content_text: Optional[str] = "Patient trauma and blood work panel report."


class MedicalReportResponse(MedicalReportBase):
    id: str
    filename: str
    file_path: Optional[str] = None
    status: str
    summary: Optional[str] = None
    extracted_data: Optional[str] = None
    measurements: List[MedicalMeasurementResponse] = []
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ReportReviewRequest(BaseModel):
    status: Optional[str] = "REVIEWED"
    summary: Optional[str] = None
    measurements: Optional[List[Dict[str, Any]]] = None
