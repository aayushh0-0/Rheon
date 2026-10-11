from typing import Tuple, Optional, Dict, Any, List
from langgraph.graph import END
from app.orchestration.state import RheonAgentState
from app.core.config import settings


# Valid specialized agent roles in the orchestration state machine
VALID_AGENT_NODES = {
    "inventory",
    "demand",
    "matching",
    "logistics",
    "donor",
    "explainability",
    "coordinator",
    "END",
    "__end__",
}


def validate_agent_transition(
    state: RheonAgentState,
    target_agent: str,
    max_steps: Optional[int] = None,
) -> Tuple[bool, Optional[str]]:
    """
    Authoritative deterministic routing guard that validates requested agent transitions
    against strict dependency prerequisites, loop ceilings, and cycle prevention rules.

    Cardinal Principle: AGENTS REASON. TOOLS CALCULATE.
    Deterministic guards prevent illegal jumps (e.g. attempting matching before inventory inspection,
    or explainability without matching & logistics findings).

    Returns:
        (is_valid: bool, error_reason: Optional[str])
    """
    normalized_target = target_agent.lower().strip() if target_agent else ""
    if normalized_target in ["end", "__end__", "terminal"]:
        return True, None

    if normalized_target not in VALID_AGENT_NODES:
        return False, f"Unknown or invalid target agent node: '{target_agent}'."

    # 1. Hard loop safety bound check
    iteration_ceiling = max_steps or settings.RHEON_MAX_ORCHESTRATION_STEPS
    current_iterations = state.get("iteration_count", 0)
    if current_iterations >= iteration_ceiling:
        return False, f"Hard orchestration bound reached ({current_iterations}/{iteration_ceiling} steps). Transition to '{target_agent}' blocked."

    # 2. Transition-specific prerequisite validation
    inv_findings = state.get("inventory_findings")
    demand_findings = state.get("demand_findings")
    matching_findings = state.get("matching_findings")
    logistics_findings = state.get("logistics_findings")
    donor_findings = state.get("donor_findings")
    explainability_findings = state.get("explainability_findings")

    # Inventory Node: Can execute from initial state or refresh
    if normalized_target == "inventory":
        return True, None

    # Demand Node: Can execute initially or after inventory
    if normalized_target == "demand":
        return True, None

    # Matching Node: Requires verified inventory findings
    if normalized_target == "matching":
        if not inv_findings:
            return False, "Cannot transition to 'matching': missing required 'inventory_findings'."
        return True, None

    # Logistics Node: Requires candidate matching findings & allocations
    if normalized_target == "logistics":
        if not matching_findings:
            return False, "Cannot transition to 'logistics': missing required 'matching_findings'."
        return True, None

    # Donor Node: Requires inventory findings (to assess deficit/standby requirement)
    if normalized_target == "donor":
        if not inv_findings:
            return False, "Cannot transition to 'donor': missing required 'inventory_findings'."
        return True, None

    # Explainability Node: Requires matching findings & logistics findings (or complete candidate plan)
    if normalized_target == "explainability":
        if not matching_findings:
            return False, "Cannot transition to 'explainability': missing required 'matching_findings'."
        if not logistics_findings and not state.get("candidate_plan"):
            return False, "Cannot transition to 'explainability': missing required 'logistics_findings' or candidate plan."
        return True, None

    return True, None


def determine_next_orchestration_step(
    state: RheonAgentState,
    max_steps: Optional[int] = None,
) -> str:
    """
    Deterministic fallback resolution to compute the next valid specialized agent node
    based on the current completion status and findings in RheonAgentState.
    """
    current_iterations = state.get("iteration_count", 0)
    iteration_ceiling = max_steps or settings.RHEON_MAX_ORCHESTRATION_STEPS
    if current_iterations >= iteration_ceiling:
        return "END"

    inv_findings = state.get("inventory_findings")
    demand_findings = state.get("demand_findings")
    matching_findings = state.get("matching_findings")
    logistics_findings = state.get("logistics_findings")
    donor_findings = state.get("donor_findings")
    explainability_findings = state.get("explainability_findings")

    # 1. Inspect Inventory first
    if not inv_findings:
        return "inventory"

    # 2. Assess Demand surge & velocity
    if not demand_findings:
        return "demand"

    # 3. Perform Multi-criteria Matching & Allocation
    if not matching_findings:
        return "matching"

    # 4. Route Logistics (Ground Corridors & Cold-Chain)
    if not logistics_findings:
        return "logistics"

    # 5. Evaluate Synthetic Donor Standby Pool (if deficit or surge)
    if not donor_findings:
        return "donor"

    # 6. Synthesize Explainability, Safety Verification & Briefing
    if not explainability_findings:
        return "explainability"

    # All specialized agents have reported findings -> Workflow Complete
    return "END"


def route_coordinator(state: RheonAgentState) -> str:
    """
    LangGraph conditional edge router function invoked after each Coordinator node execution.
    Inspects the state machine, evaluates next_agent against validate_agent_transition guards,
    and returns the valid destination node name.
    """
    # Check if workflow is already terminal or failed
    if state.get("status") in ["COMPLETED", "FAILED", "VALIDATED"] and state.get("explainability_findings"):
        coordinator_dec = state.get("coordinator_decision") or {}
        if coordinator_dec.get("is_terminal", False) or coordinator_dec.get("next_agent") in ["END", "__end__", "terminal"]:
            return "END"

    # Check loop safety bound
    current_iterations = state.get("iteration_count", 0)
    if current_iterations >= settings.RHEON_MAX_ORCHESTRATION_STEPS:
        return "END"

    # Check coordinator decision and next_agent field
    requested_next = state.get("next_agent")
    coordinator_dec = state.get("coordinator_decision") or {}
    if not requested_next and coordinator_dec:
        requested_next = coordinator_dec.get("next_agent")

    if requested_next:
        normalized = requested_next.lower().strip()
        if normalized in ["end", "__end__", "terminal"]:
            return "END"

        is_valid, reason = validate_agent_transition(state, normalized)
        if is_valid:
            return normalized

    # Fallback to deterministic requirement resolution
    return determine_next_orchestration_step(state)
