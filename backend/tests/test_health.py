import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_health():
    """Verify root GET /health returns 200 and valid JSON."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["project"] == "RHEON AI"
    assert data["version"] == "0.1.0"
    assert "timestamp" in data


def test_v1_health():
    """Verify v1 GET /api/v1/health returns 200 and valid JSON."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["project"] == "RHEON AI"
