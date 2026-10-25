# RHEON AI - Existing Features Inventory

Documented as part of Phase 0 Frontend Design Audit for RHEON AI.

## 1. Existing Features (Verified Working)
- **Emergency Blood Coordination**: Request creation, real-time matching, donor allocation, and logistics route tracking.
- **Facility Registry**: Hospital and blood bank lookup with interactive Google Maps integration (`View Location on Google Maps`).
- **Inventory Management**: Blood inventory batches, component tracking, and donut chart visualizations.
- **Role-Based Workspaces**: Patient Portal (`PatientShell`), Verifier Workspace (`VerifierShell`), and Admin Workspace.
- **Personal Health Intelligence Module**:
  - Health Overview KPI metrics & summary dashboard.
  - OCR document ingestion & file dropzone (`UploadReportView`).
  - Extracted parameter review, inline editing, and status verification (`ReportAnalysisView`).
  - Longitudinal health trends and interactive SVG trajectory charts (`HealthTrends`).
  - Chronological medical history archive and search ledger (`MedicalHistory`).
  - Downloadable PDF health summary generator (`DownloadableReportsView`).

## 2. Existing API Endpoints (`backend/app/api/v1/`)
- `/api/v1/medical/reports`: List medical reports (with patient ID filtering).
- `/api/v1/medical/reports/upload`: Ingest report and run automated OCR/NLP extraction.
- `/api/v1/medical/reports/{report_id}`: Fetch report details and measurements.
- `/api/v1/medical/measurements/{measurement_id}`: Update or verify extracted measurements (`PUT`/`PATCH`).
- `/api/v1/medical/reports/{report_id}/pdf`: Generate and download genuine PDF health summaries.
- Existing endpoints for requests, matching, planning, inventory, and facilities.

## 3. Existing Tests
- Backend pytest suite (`backend/tests/`) containing 104 passing tests (including `test_medical.py`, `test_api_v1.py`, `test_agents.py`, etc.).
- Frontend build (`frontend/dist/`) compiling successfully with `tsc` and Vite.

## 4. Discovered Notes & Observations
- The Personal Health Intelligence features are fully implemented and integrated with backend SQLAlchemy models (`MedicalReport`, `MedicalMeasurement`) and Pydantic schemas.
- LocalStorage offline resilience fallback is present in `medicalApi.ts`.
- Patient ownership and isolation are enforced in backend endpoints via `patient_id` filters.
