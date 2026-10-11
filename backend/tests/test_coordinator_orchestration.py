import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal
from app.database.seed import seed_database
from app.core.config import settings
from app.agents.registry import CoordinatorAgent, agent_registry
from app.orchestration.state import create_initial_agent_state, RheonAgentState
from app.orchestration.guards import (
    validate_agent_transition,
    determine_next_orchestration_step,
    route_coordinator,
)
from app.orchestration.graph import (
    build_rheon_orchestrated_graph,
    run_rheon_orchestrated_workflow,
)
from app.schemas.orchestration import CoordinatorDecision, OrchestrationStatus


client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database(drop_all=True)


# ---------------------------------------------------------
# 1. Deterministic Routing Guards Tests
# ---------------------------------------------------------
def test_guard_valid_initial_transitions():
    """Verify inventory and demand can transition from initial state."""
    state = create_initial_agent_state(
        recipient_hospital_id="aiims-delhi",
        blood_group="O-",
        units_requested=2,
    )
    is_valid_inv, err_inv = validate_agent_transition(state, "inventory")
    assert is_valid_inv is True
    assert err_inv is None

    is_valid_dem, err_dem = validate_agent_transition(state, "demand")
    assert is_valid_dem is True
    assert err_dem is None


def test_guard_prerequisite_enforcement():
    """Verify guards block illegal jumps when prerequisites are missing."""
    state = create_initial_agent_state(
        recipient_hospital_id="aiims-delhi",
        blood_group="O-",
        units_requested=2,
    )

    # 1. Matching requires inventory findings
    is_valid, err = validate_agent_transition(state, "matching")
    assert is_valid is False
    assert "missing required 'inventory_findings'" in err

    # 2. Logistics requires matching findings
    is_valid, err = validate_agent_transition(state, "logistics")
    assert is_valid is False
    assert "missing required 'matching_findings'" in err

    # 3. Donor requires inventory findings
    is_valid, err = validate_agent_transition(state, "donor")
    assert is_valid is False
    assert "missing required 'inventory_findings'" in err

    # 4. Explainability requires matching & logistics findings
    is_valid, err = validate_agent_transition(state, "explainability")
    assert is_valid is False
    assert "missing required 'matching_findings'" in err


def test_guard_unknown_and_terminal_nodes():
    """Verify rejection of unknown nodes and acceptance of terminal markers."""
    state = create_initial_agent_state()

    is_valid, err = validate_agent_transition(state, "non_existent_node")
    assert is_valid is False
    assert "Unknown or invalid target agent node" in err

    for term in ["END", "__end__", "terminal"]:
        is_valid, err = validate_agent_transition(state, term)
        assert is_valid is True
        assert err is None


def test_guard_hard_iteration_ceiling():
    """Verify guard enforces hard loop safety bound."""
    state = create_initial_agent_state()
    state["iteration_count"] = 16

    is_valid, err = validate_agent_transition(state, "inventory", max_steps=16)
    assert is_valid is False
    assert "Hard orchestration bound reached" in err


# ---------------------------------------------------------
# 2. Deterministic Next Step Resolution Tests
# ---------------------------------------------------------
def test_determine_next_orchestration_step_progression():
    """Verify deterministic dependency resolution order across findings lifecycle."""
    state = create_initial_agent_state()

    # Initial -> inventory
    assert determine_next_orchestration_step(state) == "inventory"

    # With inventory -> demand
    state["inventory_findings"] = {"status": "SUCCESS"}
    assert determine_next_orchestration_step(state) == "demand"

    # With demand -> matching
    state["demand_findings"] = {"status": "SUCCESS"}
    assert determine_next_orchestration_step(state) == "matching"

    # With matching -> logistics
    state["matching_findings"] = {"status": "SUCCESS"}
    assert determine_next_orchestration_step(state) == "logistics"

    # With logistics -> donor
    state["logistics_findings"] = {"status": "SUCCESS"}
    assert determine_next_orchestration_step(state) == "donor"

    # With donor -> explainability
    state["donor_findings"] = {"status": "SUCCESS"}
    assert determine_next_orchestration_step(state) == "explainability"

    # With explainability -> END
    state["explainability_findings"] = {"status": "SUCCESS"}
    assert determine_next_orchestration_step(state) == "END"


def test_determine_next_step_hard_bound():
    """Verify fallback to END when iteration ceiling is reached."""
    state = create_initial_agent_state()
    state["iteration_count"] = 10
    assert determine_next_orchestration_step(state, max_steps=10) == "END"


# ---------------------------------------------------------
# 3. LangGraph Conditional Route Coordinator Function Tests
# ---------------------------------------------------------
def test_route_coordinator_valid_and_invalid_transitions():
    """Verify route_coordinator routes to valid requested node or deterministically falls back."""
    state = create_initial_agent_state()

    # Requested valid node
    state["next_agent"] = "inventory"
    assert route_coordinator(state) == "inventory"

    # Requested invalid jump (matching before inventory) -> fallback to inventory
    state["next_agent"] = "matching"
    assert route_coordinator(state) == "inventory"

    # Requested terminal
    state["next_agent"] = "END"
    assert route_coordinator(state) == "END"


# ---------------------------------------------------------
# 4. CoordinatorAgent Decision & Autonomous Planning Tests
# ---------------------------------------------------------
def test_coordinator_agent_initial_decision():
    """Verify Coordinator creates structured CoordinatorDecision on step 1."""
    coordinator = CoordinatorAgent()
    state = create_initial_agent_state(
        recipient_hospital_id="aiims-delhi",
        blood_group="O-",
        units_requested=2,
        urgency="CRITICAL",
    )
    result_state = coordinator(state)

    assert result_state["status"] == "IN_PROGRESS"
    assert result_state["orchestration_status"] == "ANALYZING"
    assert result_state["next_agent"] == "inventory"
    assert result_state["coordinator_decision"] is not None

    decision = CoordinatorDecision(**result_state["coordinator_decision"])
    assert decision.next_agent == "inventory"
    assert decision.priority == "CRITICAL"
    assert decision.workflow_status == "ANALYZING"
    assert decision.is_terminal is False
    assert len(decision.required_actions) > 0


def test_coordinator_autonomous_plan_generation_and_validation():
    """Verify Coordinator autonomously invokes planning and validation tools when matching and logistics findings exist."""
    db = SessionLocal()
    try:
        coordinator = CoordinatorAgent()
        state = create_initial_agent_state(
            recipient_hospital_id="aiims-delhi",
            blood_group="O-",
            units_requested=2,
            urgency="CRITICAL",
        )
        # Populate inventory, demand, matching, logistics
        state["inventory_findings"] = {"status": "SUCCESS"}
        state["demand_findings"] = {"status": "SUCCESS"}
        state["matching_findings"] = {"status": "SUCCESS", "top_candidate_name": "Max Super Speciality Hospital Saket"}
        state["logistics_findings"] = {"status": "SUCCESS", "recommended_modality": "AMBULANCE_SIREN"}

        result_state = coordinator(state, db=db)

        assert result_state["candidate_plan"] is not None
        assert result_state["validation_result"] is not None
        assert result_state["validation_result"]["is_valid"] is True
        checks = result_state["validation_result"]["checks"]
        assert sum(1 for v in checks.values() if v) == 6
        assert result_state["next_agent"] == "donor"
    finally:
        db.close()


# ---------------------------------------------------------
# 5. Full Cyclic Orchestrated LangGraph Execution Tests
# ---------------------------------------------------------
def test_full_cyclic_orchestrated_workflow_execution():
    """Verify end-to-end cyclic LangGraph workflow execution with all 7 agents and guards."""
    db = SessionLocal()
    try:
        initial_state = create_initial_agent_state(
            recipient_hospital_id="aiims-delhi",
            recipient_hospital_name="AIIMS New Delhi Trauma Center",
            blood_group="O-",
            component_type="RBC",
            units_requested=2,
            urgency="CRITICAL",
            max_eta_minutes=45,
        )

        final_state = run_rheon_orchestrated_workflow(initial_state, db=db)

        # 1. State machine completion
        assert final_state.get("status") in ["VALIDATED", "COMPLETED"]
        assert final_state.get("orchestration_status") == "COMPLETED"

        # 2. Coordinator decision terminal state
        coordinator_dec = final_state.get("coordinator_decision")
        assert coordinator_dec is not None
        assert coordinator_dec.get("is_terminal") is True
        assert coordinator_dec.get("next_agent") == "END"

        # 3. All specialized findings populated
        assert final_state.get("inventory_findings") is not None
        assert final_state.get("demand_findings") is not None
        assert final_state.get("matching_findings") is not None
        assert final_state.get("logistics_findings") is not None
        assert final_state.get("donor_findings") is not None
        assert final_state.get("explainability_findings") is not None

        # 4. Sourced candidate plan and 6-point deterministic validation
        candidate_plan = final_state.get("candidate_plan")
        assert candidate_plan is not None
        assert candidate_plan.get("total_allocated_units") == 2

        val_result = final_state.get("validation_result")
        assert val_result is not None
        assert val_result.get("is_valid") is True
        checks = val_result.get("checks", {})
        assert sum(1 for v in checks.values() if v) == 6

        # 5. Cold-chain & ground transport enforcement (zero drones)
        transport_mode = final_state.get("transport_mode")
        assert transport_mode in ["AMBULANCE_SIREN", "AMBULANCE_ROUTINE", "REFRIGERATED_VAN", "MOTORCYCLE_COURIER"]
        assert "DRONE" not in transport_mode.upper()

        # 6. Clinical explanation & confidence score
        explanation = final_state.get("explanation")
        assert explanation is not None
        assert final_state.get("confidence_score") is not None
        assert final_state.get("confidence_score") > 0.0

        # 7. Cyclic history execution count (Coordinator interleaved between subagents)
        history = final_state.get("agent_execution_history", [])
        assert len(history) == 13  # 7 Coordinator passes + 6 specialized agent executions
        coordinator_runs = [h for h in history if h["agent_name"] == "Emergency Coordinator Agent"]
        assert len(coordinator_runs) == 7

        agent_names = set(h["agent_name"] for h in history)
        assert len(agent_names) == 7
    finally:
        db.close()


# ---------------------------------------------------------
# 6. REST API Endpoint Tests for Orchestration
# ---------------------------------------------------------
def test_api_orchestration_run_endpoint():
    """Verify POST /api/v1/agents/orchestration/run endpoint executes cyclic state machine."""
    payload = {
        "recipient_hospital_id": "aiims-delhi",
        "blood_group": "O-",
        "component_type": "RBC",
        "units_requested": 2,
        "urgency": "CRITICAL",
        "max_eta_minutes": 45,
    }
    resp = client.post("/api/v1/agents/orchestration/run", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["request_id"] is not None
    assert data["status"] in ["VALIDATED", "COMPLETED"]
    assert data["orchestration_status"] == "COMPLETED"
    assert data["coordinator_decision"]["is_terminal"] is True
    assert data["coordinator_decision"]["next_agent"] == "END"
    assert data["blood_group"] == "O-"
    assert data["units_requested"] == 2
    assert len(data["allocations"]) > 0
    assert data["transport_mode"] is not None
    assert "DRONE" not in data["transport_mode"].upper()
    assert data["validation_result"]["is_valid"] is True
    checks = data["validation_result"]["checks"]
    assert sum(1 for v in checks.values() if v) == 6
    assert data["confidence_score"] > 0.0
    assert data["explanation"] is not None
    assert len(data["agent_execution_history"]) == 13
    assert data["total_tools_called"] > 0
