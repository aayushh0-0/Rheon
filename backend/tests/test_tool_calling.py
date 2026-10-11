import pytest
import json
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.main import app
from app.database.session import SessionLocal
from app.database.seed import seed_database
from app.core.config import settings

from app.llm.client import ClaudeClient, get_claude_client, LLMResponse, ToolCallRecord
from app.tools.base import BaseTool
from app.tools.registry import tool_registry
from app.tools.dispatcher import tool_dispatcher, ToolDispatcher, ToolExecutionResult
from app.agents.registry import agent_registry
from app.orchestration.state import create_initial_agent_state
from app.orchestration.graph import run_full_multi_agent_workflow


client = TestClient(app)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()


# ---------------------------------------------------------
# 1. Anthropic JSON Tool Schemas Tests
# ---------------------------------------------------------
def test_all_eighteen_tools_have_anthropic_schemas():
    """Verify all registered deterministic tools expose valid Anthropic JSON tool schemas."""
    tools = tool_registry.list_tools()
    assert len(tools) == 21

    schemas = tool_registry.get_anthropic_schemas()
    assert len(schemas) == 21

    for schema in schemas:
        assert "name" in schema
        assert schema["name"].startswith("tool_")
        assert "description" in schema
        assert len(schema["description"]) > 10
        assert "input_schema" in schema
        input_schema = schema["input_schema"]
        assert input_schema.get("type") == "object"
        assert "properties" in input_schema
        assert "required" in input_schema
        # Ensure database session parameter 'db' is NEVER exposed in the public LLM schema
        assert "db" not in input_schema["properties"]
        assert "db" not in input_schema["required"]


def test_agent_role_scoped_schemas():
    """Verify tool schema filtering by agent role."""
    inventory_schemas = tool_registry.get_anthropic_schemas(agent_role="inventory")
    inventory_names = [s["name"] for s in inventory_schemas]
    assert "tool_calculate_usable_stock" in inventory_names
    assert "tool_validate_allocation" in inventory_names
    assert "tool_get_facility_inventory" in inventory_names
    assert "tool_get_network_stock_summary" in inventory_names
    # Logistics tools shouldn't be in inventory role
    assert "tool_calculate_distance" not in inventory_names

    logistics_schemas = tool_registry.get_anthropic_schemas(agent_role="logistics")
    logistics_names = [s["name"] for s in logistics_schemas]
    assert "tool_calculate_distance" in logistics_names
    assert "tool_select_transport_mode" in logistics_names
    assert "tool_estimate_travel_time" in logistics_names
    assert "tool_compute_logistics" in logistics_names


# ---------------------------------------------------------
# 2. Tool Dispatcher & Execution Envelope Tests
# ---------------------------------------------------------
def test_tool_dispatcher_successful_execution():
    """Verify safe dispatch of tools with valid arguments returning standard ToolExecutionResult."""
    dispatcher = ToolDispatcher()
    result = dispatcher.dispatch(
        tool_name="tool_calculate_usable_stock",
        arguments={"available_units": 20, "safety_reserve_units": 8},
    )
    assert isinstance(result, ToolExecutionResult)
    assert result.success is True
    assert result.tool == "tool_calculate_usable_stock"
    assert result.data == 12
    assert result.error is None
    assert result.execution_time_ms >= 0


def test_tool_dispatcher_db_injection():
    """Verify ToolDispatcher automatically injects DB session when requested by tool signature."""
    db = SessionLocal()
    try:
        dispatcher = ToolDispatcher()
        result = dispatcher.dispatch(
            tool_name="tool_check_donor_availability",
            arguments={"blood_group": "O-"},
            db=db,
        )
        assert result.success is True
        assert result.tool == "tool_check_donor_availability"
        assert isinstance(result.data, dict)
        assert result.data["blood_group"] == "O-"
        assert "total_donors" in result.data
    finally:
        db.close()


def test_tool_dispatcher_error_containment_unknown_tool():
    """Verify dispatcher safely handles unknown tools without throwing unhandled exceptions."""
    dispatcher = ToolDispatcher()
    result = dispatcher.dispatch(
        tool_name="tool_non_existent_random_xyz",
        arguments={},
    )
    assert result.success is False
    assert result.data is None
    assert "not registered" in result.error


def test_tool_dispatcher_missing_required_arguments():
    """Verify dispatcher validates required parameters and returns structured error."""
    dispatcher = ToolDispatcher()
    result = dispatcher.dispatch(
        tool_name="tool_calculate_usable_stock",
        arguments={"available_units": 10},  # Missing safety_reserve_units
    )
    assert result.success is False
    assert result.data is None
    assert "Missing required argument 'safety_reserve_units'" in result.error


def test_tool_dispatcher_anthropic_format_conversion():
    """Verify ToolExecutionResult serializes into Anthropic tool_result block format."""
    dispatcher = ToolDispatcher()
    result = dispatcher.dispatch(
        tool_name="tool_check_blood_compatibility",
        arguments={"recipient_group": "A+", "donor_group": "O-", "component_type": "RBC"},
    )
    block = dispatcher.format_anthropic_tool_result(tool_use_id="toolu_12345", result=result)
    assert block["type"] == "tool_result"
    assert block["tool_use_id"] == "toolu_12345"
    assert block["is_error"] is False
    content_obj = json.loads(block["content"])
    assert content_obj["success"] is True
    assert content_obj["data"] is True


# ---------------------------------------------------------
# 3. BaseAgent & ClaudeClient Tool Loop Tests
# ---------------------------------------------------------
def test_base_agent_anthropic_schemas_and_execution():
    """Verify BaseAgent exposes Anthropic schemas and dispatches tool execution seamlessly."""
    inventory_agent = agent_registry.get("inventory")
    assert inventory_agent is not None

    schemas = inventory_agent.get_anthropic_schemas()
    assert len(schemas) == 7
    for s in schemas:
        assert s["name"].startswith("tool_")

    # Positional execution
    pos_res = inventory_agent.execute_tool("tool_calculate_usable_stock", 15, 5)
    assert pos_res == 10

    # Keyword execution
    kw_res = inventory_agent.execute_tool(
        "tool_calculate_usable_stock",
        available_units=25,
        safety_reserve_units=10,
    )
    assert kw_res == 15


def test_claude_client_offline_mock_tool_loop():
    """Verify ClaudeClient executes real tools in offline simulation mode."""
    client_instance = ClaudeClient(api_key=None)
    assert client_instance.is_configured is False

    schemas = tool_registry.get_anthropic_schemas(agent_role="inventory")
    response = client_instance.generate_with_tools(
        prompt="Evaluate inventory for blood group O- with reserve 10 and available 15.",
        system_prompt="You are the Inventory Agent.",
        tools=schemas,
    )
    assert isinstance(response, LLMResponse)
    assert response.is_mock is True
    assert response.success is True
    assert len(response.tool_calls) > 0
    # Verify tool call records
    first_call = response.tool_calls[0]
    assert isinstance(first_call, ToolCallRecord)
    assert first_call.result.success is True
    assert "RHEON Agent Deterministic Synthesis" in response.content


def test_loop_safety_bounds_enforced():
    """Verify max_tool_calls bounds are respected to avoid infinite loops."""
    client_instance = ClaudeClient(api_key=None)
    schemas = tool_registry.get_anthropic_schemas()

    # Run with max_tool_calls = 2
    response = client_instance.generate_with_tools(
        prompt="Run compatibility, inventory, logistics, matching, and validation.",
        tools=schemas,
        max_tool_calls=2,
    )
    assert len(response.tool_calls) <= 2
    assert response.iteration_count <= 2


# ---------------------------------------------------------
# 4. Full Multi-Agent Workflow Execution Tests
# ---------------------------------------------------------
def test_full_multi_agent_workflow_pipeline():
    """Verify end-to-end execution of all 7 agents in sequence with tool calling and state tracking."""
    db = SessionLocal()
    try:
        initial_state = create_initial_agent_state(
            recipient_hospital_id="aiims-delhi",
            blood_group="O-",
            component_type="RBC",
            units_requested=2,
            urgency="CRITICAL",
            max_eta_minutes=30,
        )

        final_state = run_full_multi_agent_workflow(initial_state=initial_state, db=db)

        assert final_state["status"] in ["COMPLETED", "VALIDATED"]
        assert len(final_state["agent_execution_history"]) >= 7

        # Check execution records for all 7 agent nodes
        nodes_executed = [h["state_node"] for h in final_state["agent_execution_history"]]
        expected_nodes = [
            "coordinator",
            "inventory",
            "demand",
            "matching",
            "logistics",
            "donor",
            "explainability",
        ]
        assert all(node in nodes_executed for node in expected_nodes)

        # Verify tool calls were recorded in history
        inventory_rec = next(h for h in final_state["agent_execution_history"] if h["state_node"] == "inventory")
        assert "tool_calculate_usable_stock" in inventory_rec["tools_called"]

        matching_rec = next(h for h in final_state["agent_execution_history"] if h["state_node"] == "matching")
        assert "tool_evaluate_candidates" in matching_rec["tools_called"]

        # Verify explanation and confidence score generated
        assert final_state.get("explanation") is not None
        assert final_state.get("confidence_score") > 0.0
    finally:
        db.close()


# ---------------------------------------------------------
# 5. REST API Endpoints for Tool Workflow Tests
# ---------------------------------------------------------
def test_api_tool_schemas_endpoint():
    resp = client.get("/api/v1/agents/tools/schemas")
    assert resp.status_code == 200
    schemas = resp.json()
    assert len(schemas) == 21
    assert all("name" in s and "input_schema" in s for s in schemas)

    # Filtered by role
    resp_role = client.get("/api/v1/agents/tools/schemas?role=inventory")
    assert resp_role.status_code == 200
    role_schemas = resp_role.json()
    assert len(role_schemas) == 7


def test_api_tool_workflow_test_endpoint_full():
    payload = {
        "recipient_hospital_id": "aiims-delhi",
        "blood_group": "O-",
        "component_type": "RBC",
        "units_requested": 2,
        "urgency": "CRITICAL",
        "max_eta_minutes": 45,
        "max_tool_calls": 6,
    }
    resp = client.post("/api/v1/agents/tool-workflow/test", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["request_id"] is not None
    assert data["status"] in ["COMPLETED", "VALIDATED"]
    assert data["blood_group"] == "O-"
    assert data["units_requested"] == 2
    assert len(data["agent_execution_history"]) >= 7
    assert data["total_tools_called"] > 0
    assert len(data["tools_called_summary"]) > 0
    assert data["confidence_score"] > 0.0
    assert data["explanation"] is not None


def test_api_tool_workflow_test_endpoint_single_agent():
    payload = {
        "recipient_hospital_id": "aiims-delhi",
        "blood_group": "A+",
        "component_type": "RBC",
        "units_requested": 3,
        "urgency": "URGENT",
        "max_eta_minutes": 60,
        "agent_role": "inventory",
    }
    resp = client.post("/api/v1/agents/tool-workflow/test", json=payload)
    assert resp.status_code == 200
    data = resp.json()

    assert data["status"] == "IN_PROGRESS"
    assert len(data["agent_execution_history"]) == 1
    assert data["agent_execution_history"][0]["state_node"] == "inventory"
    assert "tool_calculate_usable_stock" in data["tools_called_summary"]
