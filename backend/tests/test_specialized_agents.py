import pytest
from app.database.session import SessionLocal
from app.database.seed import seed_database
from app.orchestration.state import create_initial_agent_state
from app.orchestration.graph import run_rheon_workflow, run_full_multi_agent_workflow, build_rheon_graph
from app.agents.registry import (
    agent_registry,
    CoordinatorAgent,
    InventoryAgent,
    DemandAgent,
    MatchingAgent,
    LogisticsAgent,
    DonorAgent,
    ExplainabilityAgent,
)
from app.schemas.agent_findings import (
    InventoryFinding,
    DemandFinding,
    MatchingFinding,
    LogisticsFinding,
    DonorFinding,
    ExplainabilityFinding,
)


@pytest.fixture(scope="session", autouse=True)
def setup_db():
    seed_database()


def test_coordinator_agent_execution():
    """Verify Coordinator Agent initializes workflow state and increments iteration count."""
    coordinator = CoordinatorAgent()
    state = create_initial_agent_state(
        recipient_hospital_id="aiims-delhi",
        blood_group="O-",
        units_requested=2,
        urgency="CRITICAL",
    )
    result_state = coordinator(state)
    assert result_state["status"] == "IN_PROGRESS"
    assert result_state["iteration_count"] == 1
    assert len(result_state["agent_execution_history"]) == 1
    assert result_state["agent_execution_history"][0]["agent_name"] == "Emergency Coordinator Agent"
    assert result_state["agent_execution_history"][0]["status"] == "COMPLETED"


def test_inventory_agent_execution_and_findings():
    """Verify Inventory Agent calculates usable stock and outputs structured InventoryFinding."""
    inventory_agent = InventoryAgent()
    db = SessionLocal()
    try:
        state = create_initial_agent_state(
            recipient_hospital_id="aiims-delhi",
            blood_group="O-",
            component_type="RBC",
            units_requested=2,
        )
        result_state = inventory_agent(state, db=db)

        assert "inventory_findings" in result_state
        findings_data = result_state["inventory_findings"]
        assert findings_data is not None

        # Validate Pydantic schema validation
        finding = InventoryFinding(**findings_data)
        assert finding.requested_blood_group == "O-"
        assert finding.component_type == "RBC"
        assert "O-" in finding.compatible_groups
        assert finding.usable_stock_verified is True
        assert finding.total_usable_units >= 0
        assert len(result_state["agent_execution_history"]) == 1
        assert "tool_calculate_usable_stock" in result_state["agent_execution_history"][0]["tools_called"]
    finally:
        db.close()


def test_demand_agent_execution_and_findings():
    """Verify Demand Agent assesses clinical urgency and produces DemandFinding."""
    demand_agent = DemandAgent()
    state = create_initial_agent_state(
        recipient_hospital_id="aiims-delhi",
        blood_group="O-",
        units_requested=4,
        urgency="CRITICAL",
    )
    # Simulate inventory finding in state
    state["inventory_findings"] = {
        "total_usable_units": 6,
        "regional_deficit": False,
    }

    result_state = demand_agent(state)
    assert "demand_findings" in result_state
    finding = DemandFinding(**result_state["demand_findings"])
    assert finding.urgency_level == "CRITICAL"
    assert finding.surge_risk == "HIGH"
    assert finding.consumption_velocity_index >= 1.5
    assert finding.recommended_buffer_multiplier > 1.0
    assert finding.post_transfer_stockout_risk in ["LOW", "MODERATE", "HIGH"]


def test_matching_agent_candidate_evaluation_and_strategy():
    """Verify Matching Agent ranks sources and assigns allocation strategy."""
    matching_agent = MatchingAgent()
    db = SessionLocal()
    try:
        state = create_initial_agent_state(
            recipient_hospital_id="aiims-delhi",
            blood_group="O-",
            units_requested=2,
            urgency="CRITICAL",
        )
        result_state = matching_agent(state, db=db)

        assert "matching_findings" in result_state
        finding = MatchingFinding(**result_state["matching_findings"])
        assert finding.request_blood_group == "O-"
        assert finding.allocation_strategy in ["SINGLE_SOURCE", "SPLIT_ALLOCATION", "STANDBY_ESCALATION"]
        assert len(finding.top_candidates) >= 0
        assert "allocations" in result_state
    finally:
        db.close()


def test_logistics_agent_ground_only_and_cold_chain():
    """Verify Logistics Agent strictly enforces ground transport (no drones) and validates cold chain."""
    logistics_agent = LogisticsAgent()

    # Test 1: RBC cold chain
    state_rbc = create_initial_agent_state(
        recipient_hospital_id="aiims-delhi",
        blood_group="O-",
        component_type="RBC",
        urgency="CRITICAL",
    )
    state_rbc["matching_findings"] = {
        "recommended_sources": [
            {"facility_id": "safdarjung-blood-bank", "facility_name": "Safdarjung Blood Bank", "distance_km": 4.5, "estimated_eta_minutes": 15}
        ]
    }
    result_rbc = logistics_agent(state_rbc)
    finding_rbc = LogisticsFinding(**result_rbc["logistics_findings"])
    assert finding_rbc.selected_transport_mode in ["AMBULANCE_SIREN", "STANDARD_COURIER"]
    assert finding_rbc.selected_transport_mode != "DRONE"
    assert finding_rbc.cold_chain_spec["min_temp_c"] == 2.0
    assert finding_rbc.cold_chain_spec["max_temp_c"] == 6.0

    # Test 2: Platelets cold chain
    state_plt = create_initial_agent_state(
        recipient_hospital_id="aiims-delhi",
        blood_group="O-",
        component_type="PLATELETS",
        urgency="CRITICAL",
    )
    result_plt = logistics_agent(state_plt)
    finding_plt = LogisticsFinding(**result_plt["logistics_findings"])
    assert finding_plt.cold_chain_spec["min_temp_c"] == 20.0
    assert finding_plt.cold_chain_spec["max_temp_c"] == 24.0
    assert "agitation" in finding_plt.cold_chain_spec["special_instructions"].lower()


def test_donor_agent_simulation_boundary_and_disclaimer():
    """Verify Donor Agent enforces simulation boundary and mandatory disclaimer."""
    donor_agent = DonorAgent()
    db = SessionLocal()
    try:
        state = create_initial_agent_state(
            recipient_hospital_id="aiims-delhi",
            blood_group="O-",
            urgency="CRITICAL",
        )
        state["inventory_findings"] = {"regional_deficit": True}
        result_state = donor_agent(state, db=db)

        assert "donor_findings" in result_state
        finding = DonorFinding(**result_state["donor_findings"])
        assert finding.simulation_mode is True
        assert "simulation/standby protocol only" in finding.disclaimer
        assert "No real donor contact or clinical eligibility verified" in finding.disclaimer
        assert finding.donor_strategy in ["STANDBY_MOBILIZATION", "IMMEDIATE_ALERT", "ROUTINE_MONITORING"]
    finally:
        db.close()


def test_explainability_agent_safety_validation_and_briefing():
    """Verify Explainability Agent runs deterministic 6-point validation and briefing generation."""
    explainability_agent = ExplainabilityAgent()
    db = SessionLocal()
    try:
        state = create_initial_agent_state(
            recipient_hospital_id="aiims-delhi",
            blood_group="O-",
            component_type="RBC",
            units_requested=2,
            urgency="CRITICAL",
        )
        state["matching_findings"] = {
            "recommended_sources": [
                {
                    "facility_id": "safdarjung-blood-bank",
                    "facility_name": "Safdarjung Blood Bank",
                    "donor_blood_group": "O-",
                    "units_allocated": 2,
                    "distance_km": 4.5,
                }
            ],
            "top_candidates": [
                {"facility_id": "max-saket", "facility_name": "Max Super Speciality", "is_feasible": False, "infeasibility_reason": "Reserve protection"}
            ]
        }

        result_state = explainability_agent(state, db=db)
        assert "explainability_findings" in result_state
        assert "explanation" in result_state
        finding = ExplainabilityFinding(**result_state["explainability_findings"])
        assert finding.decision_confidence > 0.0
        assert len(finding.constraints_evaluated) >= 4
        assert len(finding.trade_offs) >= 1
        assert len(finding.dispatch_instructions) >= 1
        assert len(finding.rejected_alternatives) >= 1
    finally:
        db.close()


def test_agent_error_boundary_isolation():
    """Verify that agent exceptions are caught by BaseAgent.__call__ and isolated."""
    class FaultyAgent(CoordinatorAgent):
        def run(self, state, db=None):
            raise ValueError("Simulated unexpected agent failure")

    faulty = FaultyAgent()
    state = create_initial_agent_state(recipient_hospital_id="aiims-delhi")
    result_state = faulty(state)

    assert len(result_state["errors"]) == 1
    assert "Simulated unexpected agent failure" in result_state["errors"][0]
    assert len(result_state["agent_execution_history"]) == 1
    assert result_state["agent_execution_history"][0]["status"] == "FAILED"
    assert "Simulated unexpected agent failure" in result_state["agent_execution_history"][0]["error"]


def test_full_7_agent_sequential_workflow_pipeline():
    """Verify complete end-to-end multi-agent workflow execution."""
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

        final_state = run_full_multi_agent_workflow(initial_state, db=db)

        # Verify all 7 agent execution traces exist
        history = final_state.get("agent_execution_history", [])
        agent_names = [rec["agent_name"] for rec in history]
        assert len(history) >= 7
        assert "Emergency Coordinator Agent" in agent_names
        assert "Inventory Intelligence Agent" in agent_names
        assert "Demand & Surge Forecasting Agent" in agent_names
        assert "Matching & Allocation Agent" in agent_names
        assert "Logistics & Routing Agent" in agent_names
        assert "Donor Intelligence & Standby Agent" in agent_names
        assert "Explainability & Verification Agent" in agent_names

        # Verify all findings are populated
        assert final_state.get("inventory_findings") is not None
        assert final_state.get("demand_findings") is not None
        assert final_state.get("matching_findings") is not None
        assert final_state.get("logistics_findings") is not None
        assert final_state.get("donor_findings") is not None
        assert final_state.get("explainability_findings") is not None

        # Verify final workflow state
        assert final_state.get("status") in ["VALIDATED", "COMPLETED"]
        assert final_state.get("confidence_score") is not None
        assert final_state.get("confidence_score") > 0.0
    finally:
        db.close()
