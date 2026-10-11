from typing import Dict, Any, List, Tuple
from app.orchestration.state import RheonAgentState


# Explicit, deterministic Agent Dependency Invalidation Map
AGENT_DEPENDENCY_MAP = {
    "SOURCE_UNAVAILABLE": {
        "invalidates": [
            "matching_findings",
            "logistics_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "preserves": ["inventory_findings", "demand_findings"],
        "disqualifies_source": True,
    },
    "FACILITY_OFFLINE": {
        "invalidates": [
            "matching_findings",
            "logistics_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "preserves": ["inventory_findings", "demand_findings"],
        "disqualifies_source": True,
    },
    "INVENTORY_DEPLETION": {
        "invalidates": [
            "inventory_findings",
            "matching_findings",
            "logistics_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "preserves": ["demand_findings"],
        "disqualifies_source": True,
    },
    "INVENTORY_DROP": {
        "invalidates": [
            "inventory_findings",
            "matching_findings",
            "logistics_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "preserves": ["demand_findings"],
        "disqualifies_source": True,
    },
    "ROUTE_BLOCKED": {
        "invalidates": [
            "matching_findings",
            "logistics_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "preserves": ["inventory_findings", "demand_findings"],
        "disqualifies_source": True,
    },
    "ROUTE_DELAY_BREACH": {
        "invalidates": [
            "matching_findings",
            "logistics_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "preserves": ["inventory_findings", "demand_findings"],
        "disqualifies_source": True,
    },
    "ROUTE_DELAY_MINOR": {
        "invalidates": [],
        "preserves": [
            "inventory_findings",
            "demand_findings",
            "matching_findings",
            "logistics_findings",
            "donor_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "disqualifies_source": False,
    },
    "DEMAND_SURGE": {
        "invalidates": [
            "demand_findings",
            "matching_findings",
            "logistics_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "preserves": ["inventory_findings"],
        "disqualifies_source": False,
    },
    "UNRELATED_EVENT": {
        "invalidates": [],
        "preserves": [
            "inventory_findings",
            "demand_findings",
            "matching_findings",
            "logistics_findings",
            "donor_findings",
            "explainability_findings",
            "candidate_plan",
            "validation_result",
        ],
        "disqualifies_source": False,
    },
}


def get_invalidation_rules(event_type: str, breached_sla: bool = True) -> Dict[str, Any]:
    """
    Returns the deterministic invalidation and preservation rules for a disruption event type.
    """
    evt = event_type.upper().strip()
    if evt == "ROUTE_DELAY":
        key = "ROUTE_DELAY_BREACH" if breached_sla else "ROUTE_DELAY_MINOR"
    else:
        key = evt if evt in AGENT_DEPENDENCY_MAP else "UNRELATED_EVENT"
    return AGENT_DEPENDENCY_MAP.get(key, AGENT_DEPENDENCY_MAP["UNRELATED_EVENT"])


def invalidate_stale_findings(
    state: RheonAgentState,
    impact_analysis: Dict[str, Any],
) -> Tuple[RheonAgentState, List[str]]:
    """
    Selectively invalidates downstream agent state findings according to the
    deterministic Agent Dependency Map while preserving unaffected upstream findings.

    Dependency Map Invalidation Rules:
    1. Source Failure / Facility Offline / Inventory Depletion on allocated facility:
       - Invalidate: matching_findings, logistics_findings, explainability_findings,
                     candidate_plan, validation_result, explanation, allocations, transport_mode
       - Preserve: demand_findings, unaffected inventory_findings
       - Disqualify: Add affected source facility ID(s) to excluded_facility_ids

    2. Route Disruption / Delay:
       - If SLA threshold is breached or corridor blocked:
         Invalidate: matching_findings, logistics_findings, explainability_findings,
                     candidate_plan, validation_result
         Preserve: inventory_findings, demand_findings
       - If within SLA:
         Invalidate: None (plan remains valid)
         Preserve: All findings

    3. Demand Surge at recipient hospital:
       - Invalidate: demand_findings, matching_findings, logistics_findings, explainability_findings,
                     candidate_plan, validation_result
       - Preserve: inventory_findings

    4. Unrelated / Non-impactful Disruption:
       - Invalidate: None (0 findings invalidated)
       - Preserve: All findings, active plan untouched

    Returns:
        Tuple of (updated_state, list_of_invalidated_field_names)
    """
    requires_replan = impact_analysis.get("requires_replan", False)
    is_impacted = impact_analysis.get("is_impacted", False)
    affected_findings = impact_analysis.get("affected_findings", []) or []
    invalidated_source_ids = impact_analysis.get("invalidated_source_ids", []) or []

    # Store impact analysis in state
    state["impact_analysis"] = impact_analysis

    if not requires_replan:
        state["is_replanned"] = False
        state["replan_required"] = False
        state["invalidated_findings"] = []
        return state, []

    # Re-planning is required
    state["is_replanned"] = True
    state["replan_required"] = True

    # Track excluded facilities
    current_excluded = list(state.get("excluded_facility_ids", []) or [])
    for fid in invalidated_source_ids:
        if fid and fid not in current_excluded:
            current_excluded.append(fid)
    state["excluded_facility_ids"] = current_excluded

    # Invalidate designated findings based on affected_findings
    invalidated_keys: List[str] = []
    completed_agents = list(state.get("agents_completed", []) or [])

    if "inventory_findings" in affected_findings:
        state["inventory_findings"] = None
        invalidated_keys.append("inventory_findings")
        if "inventory" in completed_agents:
            completed_agents.remove("inventory")

    if "demand_findings" in affected_findings:
        state["demand_findings"] = None
        invalidated_keys.append("demand_findings")
        if "demand" in completed_agents:
            completed_agents.remove("demand")

    if "matching_findings" in affected_findings:
        state["matching_findings"] = None
        invalidated_keys.append("matching_findings")
        if "matching" in completed_agents:
            completed_agents.remove("matching")

    if "logistics_findings" in affected_findings:
        state["logistics_findings"] = None
        invalidated_keys.append("logistics_findings")
        if "logistics" in completed_agents:
            completed_agents.remove("logistics")

    if "donor_findings" in affected_findings:
        state["donor_findings"] = None
        invalidated_keys.append("donor_findings")
        if "donor" in completed_agents:
            completed_agents.remove("donor")

    if "explainability_findings" in affected_findings:
        state["explainability_findings"] = None
        invalidated_keys.append("explainability_findings")
        if "explainability" in completed_agents:
            completed_agents.remove("explainability")

    if "candidate_plan" in affected_findings:
        # Preserve parent plan before clearing candidate plan if not already saved
        if state.get("candidate_plan") and not state.get("parent_plan"):
            state["parent_plan"] = state["candidate_plan"]
            state["parent_plan_id"] = state["candidate_plan"].get("id")
        state["candidate_plan"] = None
        state["allocations"] = []
        state["transport_mode"] = None
        invalidated_keys.append("candidate_plan")

    if "validation_result" in affected_findings:
        state["validation_result"] = None
        state["explanation"] = None
        state["confidence_score"] = 0.0
        invalidated_keys.append("validation_result")

    state["agents_completed"] = completed_agents

    # Update state tracking list
    existing_invalidated = list(state.get("invalidated_findings", []) or [])
    for k in invalidated_keys:
        if k not in existing_invalidated:
            existing_invalidated.append(k)
    state["invalidated_findings"] = existing_invalidated

    return state, invalidated_keys
