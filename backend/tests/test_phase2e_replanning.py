import uuid
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from app.main import app
from app.database.session import SessionLocal, get_db
from app.database.seed import seed_database
from app.models.facility import Hospital, BloodBank
from app.models.inventory import InventoryBatch
from app.models.plan import AllocationPlan, AllocationItem
from app.models.request import BloodRequest
from app.models.event import Event
from app.schemas.planning import (
    EmergencyPlanRequest,
    AdaptiveReplanRequest,
)
from app.services.planning.builder import EmergencyPlanBuilder
from app.services.planning.validator import PlanValidator
from app.services.planning.impact import PlanImpactService
from app.orchestration.state import create_initial_agent_state
from app.orchestration.invalidation import invalidate_stale_findings, AGENT_DEPENDENCY_MAP
from app.tools.planning import ComputePlanDiffTool

client = TestClient(app)


@pytest.fixture(autouse=True)
def reset_seed():
    """Seeds a fresh database before tests in this module."""
    seed_database()
    yield


def test_scenario_a_successful_source_replacement():
    """
    Scenario A: Successful source replacement
    - Generate and validate Plan A.
    - Activate Plan A.
    - Make its selected source unavailable.
    - Detect the impact.
    - Re-run necessary agents.
    - Generate and validate Plan B.
    - Mark Plan A superseded.
    - Activate Plan B.
    - Produce a plan comparison and explanation.
    """
    db = SessionLocal()
    try:
        # 1. Generate Plan A
        req_payload = EmergencyPlanRequest(
            hospital_id="hosp-aiims-01",
            blood_group="O+",
            component_type="RBC",
            units_requested=10,
            urgency="CRITICAL",
            max_eta_minutes=45,
        )
        plan_a = EmergencyPlanBuilder.generate_plan(db, req_payload)
        assert plan_a.status == "ACTIVE"
        assert plan_a.total_allocated_units == 10
        assert len(plan_a.items) > 0
        plan_a_id = plan_a.id
        request_id = plan_a.request_id

        # 2. Validate Plan A passes 6-point validator
        val_a = PlanValidator.validate_plan_object(
            db=db,
            plan=plan_a,
            recipient_blood_group="O+",
            units_requested=10,
            component_type="RBC",
        )
        assert val_a.is_valid is True

        # 3. Disqualify selected primary source
        primary_source_id = plan_a.items[0].source_facility_id
        primary_source_name = plan_a.items[0].source_name

        # 4. Trigger simulation event via API
        event_resp = client.post(
            "/api/v1/events",
            json={
                "event_type": "SOURCE_UNAVAILABLE",
                "entity_type": "BLOOD_BANK",
                "entity_id": primary_source_id,
                "payload": "{\"reason\": \"Power Grid Outage\"}",
            },
        )
        assert event_resp.status_code == 201
        event_data = event_resp.json()
        event_id = event_data["id"]

        # 5. Call adaptive replan endpoint
        replan_resp = client.post(
            "/api/v1/planning/replan",
            json={
                "request_id": request_id,
                "event_id": event_id,
                "event_type": "SOURCE_UNAVAILABLE",
                "entity_type": "BLOOD_BANK",
                "entity_id": primary_source_id,
                "payload": {"reason": "Power Grid Outage"},
                "max_eta_minutes": 45,
            },
        )
        assert replan_resp.status_code == 200
        replan_data = replan_resp.json()

        # 6. Verify impact analysis
        impact = replan_data["impact_analysis"]
        assert impact["is_impacted"] is True
        assert impact["requires_replan"] is True
        assert primary_source_id in impact["invalidated_source_ids"]
        assert "matching_findings" in impact["affected_findings"]
        assert "inventory_findings" in impact["preserved_findings"]
        assert "demand_findings" in impact["preserved_findings"]

        # 7. Verify atomic activation & supersession
        assert replan_data["status"] == "ACTIVE"
        assert replan_data["requires_replan"] is True
        plan_b_id = replan_data["active_plan_id"]
        assert plan_b_id != plan_a_id

        # Reload from DB to confirm database transaction atomicity
        db.expire_all()
        reloaded_plan_a = db.query(AllocationPlan).filter(AllocationPlan.id == plan_a_id).first()
        reloaded_plan_b = db.query(AllocationPlan).filter(AllocationPlan.id == plan_b_id).first()

        assert reloaded_plan_a.status == "SUPERSEDED"
        assert reloaded_plan_b.status == "ACTIVE"
        assert reloaded_plan_b.parent_plan_id == plan_a_id
        assert reloaded_plan_b.version == reloaded_plan_a.version + 1
        assert reloaded_plan_b.total_allocated_units == 10

        # Disqualified source must NOT be in Plan B
        b_sources = [i.source_facility_id for i in reloaded_plan_b.items]
        assert primary_source_id not in b_sources

        # 8. Verify plan diff and explanation
        diff = replan_data["plan_diff"]
        assert diff is not None
        assert diff["parent_plan_id"] == plan_a_id
        assert diff["new_plan_id"] == plan_b_id
        assert diff["sources_removed_count"] >= 1
        assert diff["sources_added_count"] >= 1

        assert replan_data["explanation"] is not None
        assert len(replan_data["explanation"]) > 0

    finally:
        db.close()


def test_scenario_b_no_feasible_alternative():
    """
    Scenario B: No feasible alternative
    - Generate Plan A.
    - Make all viable alternative sources unavailable.
    - Verify no replacement is fabricated.
    - Verify no invalid plan is activated.
    - Verify the final status accurately represents NO_FEASIBLE_PLAN.
    """
    db = SessionLocal()
    try:
        # Generate initial Plan A
        req_payload = EmergencyPlanRequest(
            hospital_id="hosp-aiims-01",
            blood_group="O-",
            component_type="RBC",
            units_requested=25,  # High quantity of O-
            urgency="CRITICAL",
            max_eta_minutes=45,
        )
        plan_a = EmergencyPlanBuilder.generate_plan(db, req_payload)
        plan_a_id = plan_a.id
        request_id = plan_a.request_id

        # Take all regional blood banks and hospitals offline to simulate catastrophic network loss (no viable alternative)
        for b in db.query(BloodBank).all():
            b.is_online = False
            b.operational_status = "OFFLINE"
            db.add(b)
        for h in db.query(Hospital).all():
            h.is_active = False
            db.add(h)
        db.commit()

        # Trigger re-planning targeting the allocated source
        primary_item = plan_a.items[0]
        replan_resp = client.post(
            "/api/v1/planning/replan",
            json={
                "request_id": request_id,
                "event_type": "FACILITY_OFFLINE",
                "entity_type": primary_item.source_facility_type,
                "entity_id": primary_item.source_facility_id,
                "payload": {"reason": "Massive Regional Grid Failure"},
                "max_eta_minutes": 45,
            },
        )
        assert replan_resp.status_code == 200
        data = replan_resp.json()

        # Verify safe failure
        assert data["status"] in ["NO_FEASIBLE_PLAN", "FAILED"]
        assert data["active_plan"] is None
        assert data["active_plan_id"] is None
        assert data["donor_standby_activated"] is True

        # Verify Plan A is not falsely represented as valid
        db.expire_all()
        reloaded_plan_a = db.query(AllocationPlan).filter(AllocationPlan.id == plan_a_id).first()
        assert reloaded_plan_a.status == "INVIABLE"

    finally:
        db.close()


def test_scenario_c_unrelated_event():
    """
    Scenario C: Unrelated event
    - Change an unrelated source.
    - Verify Plan A remains active if still valid.
    - Verify no unnecessary re-planning occurs.
    """
    db = SessionLocal()
    try:
        req_payload = EmergencyPlanRequest(
            hospital_id="hosp-aiims-01",
            blood_group="O+",
            component_type="RBC",
            units_requested=4,
            urgency="CRITICAL",
            max_eta_minutes=45,
        )
        plan_a = EmergencyPlanBuilder.generate_plan(db, req_payload)
        plan_a_id = plan_a.id
        request_id = plan_a.request_id

        allocated_source_ids = {i.source_facility_id for i in plan_a.items}

        # Pick an unallocated blood bank (e.g. gurugram)
        unrelated_bank = db.query(BloodBank).filter(~BloodBank.id.in_(allocated_source_ids)).first()
        assert unrelated_bank is not None

        replan_resp = client.post(
            "/api/v1/planning/replan",
            json={
                "request_id": request_id,
                "event_type": "SOURCE_UNAVAILABLE",
                "entity_type": "BLOOD_BANK",
                "entity_id": unrelated_bank.id,
                "payload": {"reason": "Unrelated maintenance"},
                "max_eta_minutes": 45,
            },
        )
        assert replan_resp.status_code == 200
        data = replan_resp.json()

        # Zero impact on active plan
        assert data["requires_replan"] is False
        assert data["status"] == "NO_CHANGE"
        assert data["active_plan_id"] == plan_a_id
        assert data["impact_analysis"]["is_impacted"] is False

        # Plan A must remain ACTIVE
        db.expire_all()
        reloaded_plan_a = db.query(AllocationPlan).filter(AllocationPlan.id == plan_a_id).first()
        assert reloaded_plan_a.status == "ACTIVE"

    finally:
        db.close()


def test_scenario_d_route_delay():
    """
    Scenario D: Route delay
    - Delay within SLA: plan remains feasible, no re-planning.
    - Delay breaching SLA: re-planning triggered.
    """
    db = SessionLocal()
    try:
        req_payload = EmergencyPlanRequest(
            hospital_id="hosp-aiims-01",
            blood_group="O+",
            component_type="RBC",
            units_requested=4,
            urgency="CRITICAL",
            max_eta_minutes=45,
        )
        plan_a = EmergencyPlanBuilder.generate_plan(db, req_payload)
        request_id = plan_a.request_id
        source_id = plan_a.items[0].source_facility_id

        # 1. Minor delay (+5 min) within 45 min SLA
        resp_minor = client.post(
            "/api/v1/planning/replan",
            json={
                "request_id": request_id,
                "event_type": "ROUTE_DELAY",
                "entity_type": "BLOOD_BANK",
                "entity_id": source_id,
                "payload": {"delay_minutes": 5, "source_facility_id": source_id},
                "max_eta_minutes": 45,
            },
        )
        assert resp_minor.status_code == 200
        data_minor = resp_minor.json()
        assert data_minor["requires_replan"] is False
        assert data_minor["status"] == "NO_CHANGE"

        # 2. Major delay (+50 min) breaching 45 min SLA
        resp_major = client.post(
            "/api/v1/planning/replan",
            json={
                "request_id": request_id,
                "event_type": "ROUTE_DELAY",
                "entity_type": "BLOOD_BANK",
                "entity_id": source_id,
                "payload": {"delay_minutes": 50, "source_facility_id": source_id},
                "max_eta_minutes": 45,
            },
        )
        assert resp_major.status_code == 200
        data_major = resp_major.json()
        assert data_major["requires_replan"] is True
        assert data_major["impact_analysis"]["requires_replan"] is True

    finally:
        db.close()


def test_scenario_e_invalid_replacement_safety_gate():
    """
    Scenario E: Invalid replacement
    - Force the replacement plan to fail validation.
    - Verify it is never activated.
    - Verify Plan A is not prematurely marked superseded.
    - Verify the scenario's final status reflects whether Plan A remains feasible.
    """
    db = SessionLocal()
    try:
        req_payload = EmergencyPlanRequest(
            hospital_id="hosp-aiims-01",
            blood_group="O+",
            component_type="RBC",
            units_requested=4,
            urgency="CRITICAL",
            max_eta_minutes=45,
        )
        plan_a = EmergencyPlanBuilder.generate_plan(db, req_payload)
        plan_a_id = plan_a.id

        # Manually create a corrupt candidate plan with incompatible donor blood group (B+ for O+ recipient)
        candidate_item = AllocationItem(
            id=str(uuid.uuid4()),
            source_facility_type="BLOOD_BANK",
            source_facility_id="bank-rotary-02",
            source_name="Rotary Depot",
            donor_blood_group="B+",  # Incompatible!
            units_allocated=4,
            transport_mode="STANDARD_COURIER",
            distance_km=10.0,
            estimated_eta_minutes=20,
            dispatch_status="PENDING",
        )
        candidate_plan = AllocationPlan(
            id=str(uuid.uuid4()),
            request_id=plan_a.request_id,
            parent_plan_id=plan_a.id,
            version=2,
            status="CANDIDATE",
            total_allocated_units=4,
            unmet_units=0,
            donor_standby_activated=False,
            max_eta_minutes=20,
            confidence_score=0.9,
            plan_type="ADAPTIVE_REPLAN_CANDIDATE",
            items=[candidate_item],
        )
        db.add(candidate_plan)
        db.commit()

        # Attempt to activate the invalid replacement candidate
        parent_out, candidate_out, is_activated = EmergencyPlanBuilder.activate_replacement_plan(
            db=db,
            parent_plan_id=plan_a.id,
            candidate_plan_id=candidate_plan.id,
            recipient_blood_group="O+",
            units_requested=4,
            component_type="RBC",
        )

        assert is_activated is False
        assert candidate_out.status == "FAILED"  # NEVER ACTIVATED!
        # Plan A is still feasible, so it remains ACTIVE (not superseded)
        assert parent_out.status == "ACTIVE"

    finally:
        db.close()


def test_scenario_f_duplicate_event():
    """
    Scenario F: Duplicate event
    - Submit the same event twice.
    - Verify the event's effect and re-planning operation occur at most once.
    """
    db = SessionLocal()
    try:
        bank = db.query(BloodBank).first()
        unique_event_id = f"evt-dup-{uuid.uuid4().hex[:8]}"

        payload = {
            "id": unique_event_id,
            "event_type": "SOURCE_UNAVAILABLE",
            "entity_type": "BLOOD_BANK",
            "entity_id": bank.id,
            "payload": "{\"test\": \"duplicate\"}",
        }

        # First submission
        resp1 = client.post("/api/v1/events", json=payload)
        assert resp1.status_code == 201
        data1 = resp1.json()
        assert data1["id"] == unique_event_id

        # Second submission of identical event ID
        resp2 = client.post("/api/v1/events", json=payload)
        assert resp2.status_code in [200, 201]
        data2 = resp2.json()
        assert data2["id"] == unique_event_id

        # Total events in DB with this ID is exactly 1
        count = db.query(Event).filter(Event.id == unique_event_id).count()
        assert count == 1

    finally:
        db.close()


def test_scenario_g_stale_plan_protection():
    """
    Scenario G: Stale plan protection
    - Attempt to activate a candidate based on an outdated parent revision.
    - Verify that activation is rejected.
    """
    db = SessionLocal()
    try:
        req_payload = EmergencyPlanRequest(
            hospital_id="hosp-aiims-01",
            blood_group="O+",
            component_type="RBC",
            units_requested=2,
            urgency="CRITICAL",
            max_eta_minutes=45,
        )
        plan_a = EmergencyPlanBuilder.generate_plan(db, req_payload)

        # Mark Plan A superseded (e.g. earlier replan succeeded)
        plan_a.status = "SUPERSEDED"
        db.add(plan_a)
        db.commit()

        # Create a candidate pointing to the already superseded Plan A
        candidate_item = AllocationItem(
            id=str(uuid.uuid4()),
            source_facility_type="BLOOD_BANK",
            source_facility_id="bank-rotary-02",
            source_name="Rotary Depot",
            donor_blood_group="O+",
            units_allocated=2,
            transport_mode="STANDARD_COURIER",
            distance_km=10.0,
            estimated_eta_minutes=20,
            dispatch_status="PENDING",
        )
        candidate_plan = AllocationPlan(
            id=str(uuid.uuid4()),
            request_id=plan_a.request_id,
            parent_plan_id=plan_a.id,
            version=2,
            status="CANDIDATE",
            total_allocated_units=2,
            unmet_units=0,
            items=[candidate_item],
        )
        db.add(candidate_plan)
        db.commit()

        # Activating against superseded plan must be rejected
        with pytest.raises(ValueError, match="Stale replan rejection"):
            EmergencyPlanBuilder.activate_replacement_plan(
                db=db,
                parent_plan_id=plan_a.id,
                candidate_plan_id=candidate_plan.id,
            )

    finally:
        db.close()


def test_hero_scenario():
    """
    Section 13 Hero Scenario:
    1. Submit an emergency request for 10 units of O+ RBC.
    2. Generate Plan A.
    3. Confirm Plan A passes the six-point validator.
    4. Confirm Plan A is active.
    5. Simulate the selected source becoming unavailable.
    6. Confirm impact analysis identifies the affected allocation.
    7. Confirm only necessary findings are invalidated.
    8. Confirm required agents execute again.
    9. Confirm a feasible Plan B is generated from actual synthetic data.
    10. Confirm Plan B passes deterministic validation.
    11. Confirm Plan A becomes superseded and Plan B becomes active.
    12. Confirm the plan diff identifies what changed and why.
    13. Repeat with no feasible alternative and confirm safe failure.
    """
    db = SessionLocal()
    try:
        # Step 1 & 2: Generate initial Plan A for 10 units O+ RBC
        plan_a_resp = client.post(
            "/api/v1/planning/generate",
            json={
                "hospital_id": "hosp-aiims-01",
                "blood_group": "O+",
                "component_type": "RBC",
                "units_requested": 10,
                "urgency": "CRITICAL",
                "max_eta_minutes": 45,
            },
        )
        assert plan_a_resp.status_code == 201
        plan_a_data = plan_a_resp.json()
        plan_a_id = plan_a_data["id"]
        request_id = plan_a_data["request_id"]

        # Step 3: Validate Plan A passes 6-point validator
        val_resp = client.post(f"/api/v1/planning/plans/{plan_a_id}/validate")
        assert val_resp.status_code == 200
        assert val_resp.json()["is_valid"] is True

        # Step 4: Confirm Plan A is active
        active_resp = client.get(f"/api/v1/planning/requests/{request_id}/active")
        assert active_resp.status_code == 200
        assert active_resp.json()["id"] == plan_a_id
        assert active_resp.json()["status"] == "ACTIVE"

        primary_source_id = plan_a_data["items"][0]["source_facility_id"]

        # Step 5: Simulate the selected source becoming unavailable
        event_resp = client.post(
            "/api/v1/events",
            json={
                "event_type": "SOURCE_UNAVAILABLE",
                "entity_type": "BLOOD_BANK",
                "entity_id": primary_source_id,
                "payload": "{\"cause\": \"Transformer Fire\"}",
            },
        )
        assert event_resp.status_code == 201
        event_id = event_resp.json()["id"]

        # Step 6-12: Execute re-planning workflow
        replan_resp = client.post(
            "/api/v1/planning/replan",
            json={
                "request_id": request_id,
                "event_id": event_id,
                "event_type": "SOURCE_UNAVAILABLE",
                "entity_type": "BLOOD_BANK",
                "entity_id": primary_source_id,
                "payload": {"cause": "Transformer Fire"},
                "max_eta_minutes": 45,
            },
        )
        assert replan_resp.status_code == 200
        replan_data = replan_resp.json()

        # Step 6 & 7: Impact analysis and finding invalidation
        impact = replan_data["impact_analysis"]
        assert impact["is_impacted"] is True
        assert impact["requires_replan"] is True
        assert primary_source_id in impact["invalidated_source_ids"]
        assert "matching_findings" in impact["affected_findings"]
        assert "inventory_findings" in impact["preserved_findings"]
        assert "demand_findings" in impact["preserved_findings"]

        # Step 8-11: Plan B generation, validation, and atomic transition
        assert replan_data["status"] == "ACTIVE"
        plan_b_id = replan_data["active_plan_id"]
        assert plan_b_id != plan_a_id

        # Confirm Plan B passes validation
        val_b_resp = client.post(f"/api/v1/planning/plans/{plan_b_id}/validate")
        assert val_b_resp.status_code == 200
        assert val_b_resp.json()["is_valid"] is True

        # Confirm Plan A is SUPERSEDED and Plan B is ACTIVE
        db.expire_all()
        db_plan_a = db.query(AllocationPlan).filter(AllocationPlan.id == plan_a_id).first()
        db_plan_b = db.query(AllocationPlan).filter(AllocationPlan.id == plan_b_id).first()
        assert db_plan_a.status == "SUPERSEDED"
        assert db_plan_b.status == "ACTIVE"

        # Step 12: Plan diff identifies changes
        diff = replan_data["plan_diff"]
        assert diff is not None
        assert diff["sources_removed_count"] >= 1
        assert diff["sources_added_count"] >= 1
        assert len(replan_data["explanation"]) > 0

        # Step 13: Repeat with no feasible alternative and confirm safe failure
        # Offline all remaining blood banks and peer hospitals
        for b in db.query(BloodBank).all():
            b.is_online = False
            b.operational_status = "OFFLINE"
            db.add(b)
        for h in db.query(Hospital).all():
            h.is_active = False
            db.add(h)
        db.commit()

        replan_fail = client.post(
            "/api/v1/planning/replan",
            json={
                "request_id": request_id,
                "event_type": "FACILITY_OFFLINE",
                "entity_type": db_plan_b.items[0].source_facility_type,
                "entity_id": db_plan_b.items[0].source_facility_id,
                "payload": {"cause": "Total blackout"},
                "max_eta_minutes": 45,
            },
        )
        assert replan_fail.status_code == 200
        fail_data = replan_fail.json()
        assert fail_data["status"] in ["NO_FEASIBLE_PLAN", "FAILED"]
        assert fail_data["active_plan"] is None

    finally:
        db.close()


def test_api_endpoints_inspection():
    """
    Tests history, active plan, and compare endpoints.
    """
    db = SessionLocal()
    try:
        req_payload = EmergencyPlanRequest(
            hospital_id="hosp-aiims-01",
            blood_group="O+",
            component_type="RBC",
            units_requested=2,
            urgency="CRITICAL",
            max_eta_minutes=45,
        )
        plan1 = EmergencyPlanBuilder.generate_plan(db, req_payload)
        plan2 = EmergencyPlanBuilder.replan(
            db=db,
            parent_plan_id=plan1.id,
            excluded_facility_ids=[plan1.items[0].source_facility_id],
        )

        # 1. GET /api/v1/planning/requests/{request_id}/active
        r1 = client.get(f"/api/v1/planning/requests/{plan1.request_id}/active")
        assert r1.status_code == 200
        assert r1.json()["id"] == plan2.id

        # 2. GET /api/v1/planning/requests/{request_id}/history
        r2 = client.get(f"/api/v1/planning/requests/{plan1.request_id}/history")
        assert r2.status_code == 200
        history = r2.json()
        assert len(history) == 2
        assert history[0]["version"] == 1
        assert history[1]["version"] == 2

        # 3. GET /api/v1/planning/compare
        r3 = client.get(f"/api/v1/planning/compare?parent_plan_id={plan1.id}&new_plan_id={plan2.id}")
        assert r3.status_code == 200
        diff = r3.json()
        assert diff["parent_plan_id"] == plan1.id
        assert diff["new_plan_id"] == plan2.id
        assert diff["sources_removed_count"] >= 1

    finally:
        db.close()
