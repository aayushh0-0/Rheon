import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import get_db, SessionLocal
from app.database.seed import seed_database

client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    """Ensure database has seeded data for integration testing."""
    seed_database()


def test_root_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["project"] == "RHEON AI"


def test_api_v1_health():
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


def test_list_hospitals():
    response = client.get("/api/v1/facilities/hospitals")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 7
    # Verify AIIMS is in the list
    names = [h["name"] for h in data]
    assert any("AIIMS" in n for n in names)


def test_list_blood_banks():
    response = client.get("/api/v1/facilities/blood-banks")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) >= 6


def test_inventory_batches_and_summary():
    batches_resp = client.get("/api/v1/inventory/batches")
    assert batches_resp.status_code == 200
    batches = batches_resp.json()
    assert len(batches) > 0

    summary_resp = client.get("/api/v1/inventory/summary?component_type=RBC")
    assert summary_resp.status_code == 200
    summaries = summary_resp.json()
    assert len(summaries) == 8  # 8 blood groups


def test_safety_reserve_calc_endpoint():
    hospitals = client.get("/api/v1/facilities/hospitals").json()
    aiims = next(h for h in hospitals if "AIIMS" in h["name"])

    resp = client.get(f"/api/v1/inventory/safety-reserve/hospital/{aiims['id']}")
    assert resp.status_code == 200
    data = resp.json()
    assert data["hospital_id"] == aiims["id"]
    assert "required_safety_reserves" in data
    assert data["required_safety_reserves"]["O-"] >= 10


def test_donors_endpoint():
    resp = client.get("/api/v1/donors?limit=10")
    assert resp.status_code == 200
    donors = resp.json()
    assert len(donors) == 10


def test_matching_compatibility_matrix():
    resp = client.get("/api/v1/matching/compatibility-matrix?component_type=RBC")
    assert resp.status_code == 200
    data = resp.json()
    assert data["component_type"] == "RBC"
    assert "O-" in data["matrix"]


def test_matching_compatibility_check():
    # Compatible: O- into A+
    resp = client.get("/api/v1/matching/compatibility-check?recipient_blood_group=A%2B&donor_blood_group=O-&component_type=RBC")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_compatible"] is True
    assert data["is_universal_donor"] is True

    # Incompatible: A+ into O-
    resp2 = client.get("/api/v1/matching/compatibility-check?recipient_blood_group=O-&donor_blood_group=A%2B&component_type=RBC")
    assert resp2.status_code == 200
    data2 = resp2.json()
    assert data2["is_compatible"] is False


def test_matching_evaluate():
    # Evaluate candidates for 4 units of O- at AIIMS
    hospitals = client.get("/api/v1/facilities/hospitals").json()
    aiims = next(h for h in hospitals if "AIIMS" in h["name"])

    eval_payload = {
        "hospital_id": aiims["id"],
        "blood_group": "O-",
        "component_type": "RBC",
        "units_requested": 4,
        "urgency": "CRITICAL",
        "max_eta_minutes": 45,
    }
    resp = client.post("/api/v1/matching/evaluate", json=eval_payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["request_blood_group"] == "O-"
    assert len(data["candidates"]) > 0


def test_planning_generate_and_validate():
    hospitals = client.get("/api/v1/facilities/hospitals").json()
    aiims = next(h for h in hospitals if "AIIMS" in h["name"])

    plan_payload = {
        "hospital_id": aiims["id"],
        "blood_group": "A+",
        "component_type": "RBC",
        "units_requested": 4,
        "urgency": "CRITICAL",
        "max_eta_minutes": 45,
    }
    resp = client.post("/api/v1/planning/generate", json=plan_payload)
    assert resp.status_code == 201
    plan = resp.json()
    assert plan["total_allocated_units"] > 0
    assert len(plan["items"]) > 0

    # Validate the generated plan
    val_resp = client.post(f"/api/v1/planning/plans/{plan['id']}/validate")
    assert val_resp.status_code == 200
    val_data = val_resp.json()
    assert val_data["is_valid"] is True
    assert val_data["checks"]["compatibility"] is True
    assert val_data["checks"]["quantity_conservation"] is True
    assert val_data["checks"]["source_status"] is True


def test_simulation_events():
    event_payload = {
        "event_type": "WEATHER_ALERT",
        "entity_type": "ZONE",
        "entity_id": "south-delhi",
        "severity": "MEDIUM",
        "description": "Heavy monsoon rainfall slowing surface traffic",
    }
    resp = client.post("/api/v1/events", json=event_payload)
    assert resp.status_code == 201
    created_event = resp.json()
    assert created_event["event_type"] == "WEATHER_ALERT"

    list_resp = client.get("/api/v1/events?event_type=WEATHER_ALERT")
    assert list_resp.status_code == 200
    events = list_resp.json()
    assert len(events) >= 1
