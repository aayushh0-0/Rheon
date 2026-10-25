# RHEON AI - Personal Health Intelligence Implementation Plan

Documented as part of Phase 0 Frontend Design Audit for RHEON AI.

## 1. Objective
Maintain and verify the existing Personal Health Intelligence module without recreating or disrupting existing emergency blood coordination workflows, UI components, or design tokens.

## 2. Component & File Mapping
- **API Services**: `frontend/src/services/medicalApi.ts` (reused and verified).
- **Backend Endpoints**: `backend/app/api/v1/endpoints/medical.py` (reused and verified).
- **Backend Models**: `backend/app/models/medical.py` (reused and verified).
- **Frontend Views**:
  - `HealthOverview.tsx`: Command center KPI & summary view.
  - `UploadReportView.tsx`: OCR ingestion & file dropzone.
  - `ReportAnalysisView.tsx`: Extracted parameter verification & AI explanations.
  - `HealthTrends.tsx`: Longitudinal charts & trajectory tracking.
  - `MedicalHistory.tsx`: Chronological archive & search ledger.
  - `DownloadableReportsView.tsx`: PDF summary export & hospital map integration.

## 3. Verification & Testing Plan
1. Run backend pytest suite (`pytest`).
2. Run frontend production build (`npm run build`).
3. Verify backend database persistence and patient isolation (`patient_id` scoping).
4. Verify Google Maps location links and PDF export functionality.
5. Verify design system preservation (fonts, colors, tokens).

## 4. Preservation Guardrails
- Do not run destructive git commands (`reset --hard`, `clean`).
- Do not modify core design tokens or typography.
- Preserve emergency blood coordination and facility registry features.
