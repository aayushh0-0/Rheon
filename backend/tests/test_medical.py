import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal, init_db
from app.models.facility import Hospital
from app.api.v1.endpoints.medical import create_access_token

client = TestClient(app)


def get_auth_headers(patient_id: str = "pat-demo-001", role: str = "patient"):
    token = create_access_token({"sub": f"user-{patient_id}", "patient_id": patient_id, "role": role})
    return {"Authorization": f"Bearer {token}"}


def test_hospital_google_maps_support():
    """Verify hospital registration includes Google Maps location support and map endpoint."""
    init_db()
    db = SessionLocal()
    try:
        hosp = db.query(Hospital).filter(Hospital.code == "TEST-MAP-HOSP").first()
        if not hosp:
            hosp = Hospital(
                id="hosp-test-map-01",
                name="Test Map Hospital",
                code="TEST-MAP-HOSP",
                location="Connaught Place, New Delhi",
                trauma_level=1,
                latitude=28.6139,
                longitude=77.2090,
                contact_phone="+91-11-12345678",
                google_maps_url="https://www.google.com/maps/search/?api=1&query=28.6139,77.2090",
                google_maps_embed_url="https://maps.google.com/maps?q=28.6139,77.2090&z=15&output=embed",
            )
            db.add(hosp)
            db.commit()
    finally:
        db.close()

    response = client.get("/api/v1/facilities/hospitals")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    h = next((x for x in data if x["code"] == "TEST-MAP-HOSP"), None)
    assert h is not None
    assert "google_maps_url" in h
    assert "google_maps_embed_url" in h
    assert h["latitude"] == 28.6139

    map_response = client.get(f"/api/v1/facilities/hospitals/{h['id']}/map")
    assert map_response.status_code == 200
    map_data = map_response.json()
    assert "google_maps_url" in map_data
    assert "directions_query_url" in map_data


def test_medical_report_upload_and_extraction():
    """Verify uploading a medical report triggers extraction of measurements with JWT authentication."""
    headers = get_auth_headers("pat-demo-001", "patient")
    payload = {
        "patient_id": "pat-demo-001",
        "report_type": "BLOOD_WORK",
        "filename": "patient_blood_work.txt",
        "content_text": "Patient trauma blood panel report. Hemoglobin: 13.8 g/dL, Platelets: 240 K/uL"
    }
    response = client.post("/api/v1/medical/reports/upload", json=payload, headers=headers)
    assert response.status_code == 201
    rep_data = response.json()
    assert rep_data["patient_id"] == "pat-demo-001"
    assert rep_data["status"] == "EXTRACTED"
    assert len(rep_data["measurements"]) >= 3

    report_id = rep_data["id"]

    # Test get report details with auth
    get_resp = client.get(f"/api/v1/medical/reports/{report_id}", headers=headers)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == report_id

    # Test update/verify measurement
    meas_id = rep_data["measurements"][0]["id"]
    update_resp = client.put(
        f"/api/v1/medical/measurements/{meas_id}",
        json={"is_verified": True, "notes": "Clinician verified."},
        headers=headers,
    )
    assert update_resp.status_code == 200
    assert update_resp.json()["is_verified"] is True

    # Test report review endpoint
    review_resp = client.put(
        f"/api/v1/medical/reports/{report_id}/review",
        json={
            "status": "REVIEWED",
            "summary": "Reviewed and verified by trauma specialist.",
            "measurements": [{"id": meas_id, "is_verified": True, "status": "NORMAL"}]
        },
        headers=headers,
    )
    assert review_resp.status_code == 200
    assert review_resp.json()["status"] == "REVIEWED"

    # Test PDF health summary generation
    pdf_resp = client.get(f"/api/v1/medical/reports/{report_id}/pdf", headers=headers)
    assert pdf_resp.status_code == 200
    assert pdf_resp.headers["content-type"] == "application/pdf"
    assert len(pdf_resp.content) > 0
    assert pdf_resp.content.startswith(b"%PDF-1.4")


def test_server_side_authorization_cross_patient():
    """Verify that a patient cannot access another patient's medical records (403 Forbidden)."""
    headers_a = get_auth_headers("patient-alpha", "patient")
    payload_a = {
        "patient_id": "patient-alpha",
        "report_type": "BLOOD_WORK",
        "filename": "alpha_report.txt",
        "content_text": "Patient Alpha blood report: Hemoglobin 14.2 g/dL"
    }
    resp_a = client.post("/api/v1/medical/reports/upload", json=payload_a, headers=headers_a)
    assert resp_a.status_code == 201
    report_id = resp_a.json()["id"]

    # Patient B attempts to access Patient A's report
    headers_b = get_auth_headers("patient-beta", "patient")
    resp_b = client.get(f"/api/v1/medical/reports/{report_id}", headers=headers_b)
    assert resp_b.status_code == 403

    # Patient B attempts to download Patient A's PDF summary
    pdf_resp_b = client.get(f"/api/v1/medical/reports/{report_id}/pdf", headers=headers_b)
    assert pdf_resp_b.status_code == 403

    # Verifier/Admin can access Patient A's report
    admin_headers = get_auth_headers("admin-001", "verifier")
    admin_resp = client.get(f"/api/v1/medical/reports/{report_id}", headers=admin_headers)
    assert admin_resp.status_code == 200


def test_jwt_authentication_failures():
    """Verify missing, invalid, or expired tokens are rejected with 401 Unauthorized."""
    # 1. Missing token
    resp = client.get("/api/v1/medical/reports")
    assert resp.status_code == 401

    # 2. Invalid token signature / malformed token
    resp = client.get("/api/v1/medical/reports", headers={"Authorization": "Bearer invalid.jwt.token"})
    assert resp.status_code == 401

    # 3. Expired token
    expired_token = create_access_token({"sub": "user-123", "patient_id": "pat-123", "role": "patient"}, expires_delta_seconds=-10)
    resp = client.get("/api/v1/medical/reports", headers={"Authorization": f"Bearer {expired_token}"})
    assert resp.status_code == 401


def test_real_pdf_extraction_and_validation():
    """Verify genuine PDF text extraction, scanned PDF detection, and malformed file validation."""
    headers = get_auth_headers("pat-demo-001", "patient")

    # 1. Valid text-based PDF fixture (simulated PDF bytes with text stream)
    valid_pdf_bytes = b"%PDF-1.4 1 0 obj << /Type /Catalog >> endobj stream BT (Hemoglobin: 12.5 g/dL Platelets: 200 K/uL) Tj ET endstream"
    payload_pdf = {
        "patient_id": "pat-demo-001",
        "report_type": "PDF_LAB",
        "filename": "test_lab_report.pdf",
        "content_text": valid_pdf_bytes.decode("latin1")
    }
    resp_pdf = client.post("/api/v1/medical/reports/upload", json=payload_pdf, headers=headers)
    assert resp_pdf.status_code == 201
    assert resp_pdf.json()["status"] == "EXTRACTED"

    # 2. Scanned PDF fixture (PDF bytes with no text streams)
    scanned_pdf_bytes = b"%PDF-1.4 1 0 obj << /Type /Catalog >> endobj stream /Image X0 Do endstream"
    payload_scanned = {
        "patient_id": "pat-demo-001",
        "report_type": "PDF_SCANNED",
        "filename": "scanned_report.pdf",
        "content_text": scanned_pdf_bytes.decode("latin1")
    }
    resp_scanned = client.post("/api/v1/medical/reports/upload", json=payload_scanned, headers=headers)
    assert resp_scanned.status_code == 201
    assert resp_scanned.json()["status"] == "SCANNED_PENDING_REVIEW"
    assert "scanned" in resp_scanned.json()["summary"].lower()

    # 3. Malformed file upload (invalid format)
    payload_malformed = {
        "patient_id": "pat-demo-001",
        "report_type": "CORRUPT",
        "filename": "corrupt.bin",
        "content_text": "\x00\x01\x02\x03\x04\x05"
    }
    resp_malformed = client.post("/api/v1/medical/reports/upload", json=payload_malformed, headers=headers)
    assert resp_malformed.status_code == 400
