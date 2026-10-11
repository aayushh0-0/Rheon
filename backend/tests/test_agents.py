import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database.session import SessionLocal
from app.database.seed import seed_database
from app.core.config import settings

from app.llm.client import ClaudeClient, get_claude_client, LLMResponse
from app.llm.prompts import (
    SYSTEM_PRINCIPLE,
    COORDINATOR_SYSTEM_PROMPT,
    INVENTORY_AGENT_PROMPT,
    DEMAND_AGENT_PROMPT,
    MATCHING_AGENT_PROMPT,
    LOGISTICS_AGENT_PROMPT,
    DONOR_AGENT_PROMPT,
    EXPLAINABILITY_AGENT_PROMPT,
)
from app.orchestration.state import (
    RheonAgentState,
    AgentExecutionRecord,
    create_initial_agent_state,
)
from app.orchestration.graph import (
    build_rheon_graph,
    run_rheon_workflow,
)
from app.tools.registry import tool_registry
from app.tools.base import BaseTool
from app.agents.registry import agent_registry
from app.agents.base import BaseAgent


client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()


# ---------------------------------------------------------
# 1. Claude Client & Prompts Tests
# ---------------------------------------------------------
def test_claude_client_offline_mock():
    """Verify ClaudeClient gracefully generates structured mocks when offline."""
    client_instance = ClaudeClient(api_key=None)
    assert client_instance.is_configured is False

    # Test text generation
    response = client_instance.generate(
        prompt="Analyze inventory status for O- blood.",
        system_prompt=INVENTORY_AGENT_PROMPT,
    )
    assert isinstance(response, LLMResponse)
    assert response.is_mock is True
    assert len(response.content) > 0
    assert response.usage.input_tokens > 0
    assert response.usage.output_tokens > 0

    # Test JSON mode generation
    json_response = client_instance.generate(
        prompt="Output allocation decision",
        json_mode=True,
    )
    assert json_response.is_mock is True
    import json
    data = json.loads(json_response.content)
    assert "mock_response" in data or "status" in data or isinstance(data, dict)


def test_prompts_cardinal_rules():
    """Verify all system prompts mandate 'AGENTS REASON. TOOLS CALCULATE.'."""
    prompts = [
        SYSTEM_PRINCIPLE,
        COORDINATOR_SYSTEM_PROMPT,
        INVENTORY_AGENT_PROMPT,
        DEMAND_AGENT_PROMPT,
        MATCHING_AGENT_PROMPT,
        LOGISTICS_AGENT_PROMPT,
        DONOR_AGENT_PROMPT,
        EXPLAINABILITY_AGENT_PROMPT,
    ]
    for p in prompts:
        assert "AGENTS REASON. TOOLS CALCULATE." in p
        assert len(p) > 50


# ---------------------------------------------------------
# 2. Shared Agent State & Factory Tests
# ---------------------------------------------------------
def test_create_initial_agent_state():
    """Verify typed state initialization and factory defaults."""
    state = create_initial_agent_state(
        recipient_hospital_id="aiims-delhi",
        blood_group="O-",
        component_type="RBC",
        units_requested=3,
        urgency="CRITICAL",
        max_eta_minutes=35,
    )
    assert state["recipient_hospital_id"] == "aiims-delhi"
    assert state["blood_group"] == "O-"
    assert state["units_requested"] == 3
    assert state["urgency"] == "CRITICAL"
    assert state["max_eta_minutes"] == 35
    assert state["status"] == "PENDING"
    assert state["errors"] == []
    assert state["warnings"] == []
    assert state["agent_execution_history"] == []
    assert state["iteration_count"] == 0


def test_agent_execution_record_model():
    """Verify execution tracking schema validation."""
    record = AgentExecutionRecord(
        agent_name="Inventory Intelligence Agent",
        state_node="inventory",
        tools_called=["tool_calculate_usable_stock"],
        latency_ms=12,
        reasoning_summary="Enforced safety reserve on batch.",
    )
    dumped = record.model_dump()
    assert dumped["agent_name"] == "Inventory Intelligence Agent"
    assert dumped["state_node"] == "inventory"
    assert "tool_calculate_usable_stock" in dumped["tools_called"]
    assert dumped["latency_ms"] == 12
    assert dumped["status"] == "COMPLETED"


# ---------------------------------------------------------
# 3. Deterministic Tool Adapters Tests
# ---------------------------------------------------------
def test_compatibility_tools():
    compat_tool = tool_registry.get("tool_check_blood_compatibility")
    assert compat_tool is not None
    assert compat_tool.execute("A+", "O-", "RBC") is True
    assert compat_tool.execute("O-", "A+", "RBC") is False

    score_tool = tool_registry.get("tool_get_compatibility_score")
    assert score_tool is not None
    assert score_tool.execute("O-", "O-", "RBC") == 1.0
    assert score_tool.execute("A+", "O-", "RBC") == 0.82
    assert score_tool.execute("O-", "A+", "RBC") == 0.0

    groups_tool = tool_registry.get("tool_get_compatible_blood_groups")
    assert groups_tool is not None
    assert set(groups_tool.execute("O-", "RBC")) == {"O-"}
    assert set(groups_tool.execute("AB+", "RBC")) == {"O-", "O+", "B-", "B+", "A-", "A+", "AB-", "AB+"}


def test_inventory_tools():
    usable_tool = tool_registry.get("tool_calculate_usable_stock")
    assert usable_tool is not None
    assert usable_tool.execute(available_units=15, safety_reserve_units=10) == 5
    assert usable_tool.execute(available_units=8, safety_reserve_units=10) == 0

    val_tool = tool_registry.get("tool_validate_allocation")
    assert val_tool is not None
    res = val_tool.execute(available_units=20, safety_reserve_units=10, requested_units=5)
    assert res["is_valid"] is True
    assert res["allowable_units"] == 5

    db = SessionLocal()
    try:
        summary_tool = tool_registry.get("tool_get_network_stock_summary")
        assert summary_tool is not None
        summary = summary_tool.execute(db=db, blood_groups=["O-", "O+"], component_type="RBC")
        assert summary["total_available_units"] > 0
        assert summary["total_usable_units"] >= 0
    finally:
        db.close()


def test_logistics_tools():
    dist_tool = tool_registry.get("tool_calculate_distance")
    assert dist_tool is not None
    # Delhi to Gurgaon approx 25-35 km
    dist = dist_tool.execute(28.6139, 77.2090, 28.4595, 77.0266)
    assert 20.0 < dist < 40.0

    mode_tool = tool_registry.get("tool_select_transport_mode")
    assert mode_tool is not None
    assert mode_tool.execute(urgency="CRITICAL", distance_km=10.0, allow_drone=True) == "DRONE"
    assert mode_tool.execute(urgency="CRITICAL", distance_km=50.0, allow_drone=True) == "AMBULANCE_SIREN"
    assert mode_tool.execute(urgency="ROUTINE", distance_km=20.0, allow_drone=True) == "STANDARD_COURIER"


def test_planning_and_validation_tools():
    db = SessionLocal()
    try:
        matching_tool = tool_registry.get("tool_evaluate_candidates")
        assert matching_tool is not None
        matched = matching_tool.execute(
            db=db,
            blood_group="O-",
            units_requested=2,
            component_type="RBC",
        )
        assert matched["request_blood_group"] == "O-"
        assert len(matched["candidates"]) > 0

        validation_tool = tool_registry.get("tool_validate_plan")
        assert validation_tool is not None
        val_result = validation_tool.execute(
            db=db,
            recipient_blood_group="O-",
            units_requested=2,
            allocations=[],
            component_type="RBC",
            total_allocated_declared=0,
            unmet_declared=2,
        )
        assert val_result["is_valid"] is True
    finally:
        db.close()


def test_donor_tools():
    db = SessionLocal()
    try:
        donor_avail_tool = tool_registry.get("tool_check_donor_availability")
        assert donor_avail_tool is not None
        res = donor_avail_tool.execute(db=db, blood_group="O-")
        assert res["blood_group"] == "O-"
        assert res["total_donors"] >= 0
    finally:
        db.close()


# ---------------------------------------------------------
# 4. Agent Registry & Specialized Agents Tests
# ---------------------------------------------------------
def test_agent_registry_all_seven_agents_present():
    agents = agent_registry.list_agents()
    assert len(agents) == 7

    roles = {a.role for a in agents}
    expected_roles = {
        "coordinator",
        "inventory",
        "demand",
        "matching",
        "logistics",
        "donor",
        "explainability",
    }
    assert roles == expected_roles


def test_agents_execute_with_state_updates():
    db = SessionLocal()
    try:
        state = create_initial_agent_state(
            recipient_hospital_id="aiims-delhi",
            blood_group="O-",
            units_requested=2,
            urgency="CRITICAL",
        )

        coordinator = agent_registry.get("coordinator")
        state = coordinator(state, db=db)
        assert state["status"] == "IN_PROGRESS"
        assert state["iteration_count"] == 1
        assert len(state["agent_execution_history"]) == 1

        inventory = agent_registry.get("inventory")
        state = inventory(state, db=db)
        assert state.get("inventory_findings") is not None
        assert len(state["agent_execution_history"]) == 2

        demand = agent_registry.get("demand")
        state = demand(state, db=db)
        assert state.get("demand_findings") is not None
        assert len(state["agent_execution_history"]) == 3
    finally:
        db.close()


# ---------------------------------------------------------
# 5. LangGraph Skeleton Workflow Tests
# ---------------------------------------------------------
def test_langgraph_workflow_execution():
    """Verify that the compiled LangGraph workflow executes end-to-end."""
    initial_state = create_initial_agent_state(
        recipient_hospital_id="safdarjung-delhi",
        blood_group="A+",
        units_requested=4,
        urgency="CRITICAL",
        max_eta_minutes=40,
    )

    final_state = run_rheon_workflow(initial_state=initial_state)
    assert final_state is not None
    assert final_state["recipient_hospital_id"] == "safdarjung-delhi"
    assert final_state["status"] == "IN_PROGRESS"
    assert final_state["iteration_count"] == 1
    assert len(final_state["agent_execution_history"]) >= 1


# ---------------------------------------------------------
# 6. REST API Endpoints Tests
# ---------------------------------------------------------
def test_api_agents_status():
    resp = client.get("/api/v1/agents/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_agentic_system_enabled"] is True
    assert data["agents_registered_count"] == 7
    assert data["tools_registered_count"] >= 15
    assert "default_model" in data


def test_api_agents_list():
    resp = client.get("/api/v1/agents/list")
    assert resp.status_code == 200
    agents = resp.json()
    assert len(agents) == 7
    agent_roles = [a["role"] for a in agents]
    assert "coordinator" in agent_roles
    assert "inventory" in agent_roles
    assert "explainability" in agent_roles


def test_api_agents_tools():
    resp = client.get("/api/v1/agents/tools")
    assert resp.status_code == 200
    tools = resp.json()
    assert len(tools) >= 15
    tool_names = [t["name"] for t in tools]
    assert "tool_calculate_usable_stock" in tool_names
    assert "tool_check_blood_compatibility" in tool_names
    assert "tool_calculate_distance" in tool_names
    assert "tool_validate_plan" in tool_names


def test_api_workflow_test_run():
    payload = {
        "recipient_hospital_id": "aiims-delhi",
        "blood_group": "B+",
        "component_type": "RBC",
        "units_requested": 2,
        "urgency": "CRITICAL",
        "max_eta_minutes": 45,
    }
    resp = client.post("/api/v1/agents/workflow/test", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "request_id" in data
    assert data["status"] == "IN_PROGRESS"
    assert len(data["agent_execution_history"]) >= 1
