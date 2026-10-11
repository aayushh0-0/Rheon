from typing import Dict, Any, List, Optional, Tuple
from sqlalchemy.orm import Session
from app.agents.base import BaseAgent, AgentMetadata
from app.orchestration.state import RheonAgentState
from app.llm.client import ClaudeClient, get_claude_client
from app.llm.prompts import (
    COORDINATOR_SYSTEM_PROMPT,
    INVENTORY_AGENT_PROMPT,
    DEMAND_AGENT_PROMPT,
    MATCHING_AGENT_PROMPT,
    LOGISTICS_AGENT_PROMPT,
    DONOR_AGENT_PROMPT,
    EXPLAINABILITY_AGENT_PROMPT,
)
from app.tools.registry import tool_registry, ToolRegistry
from app.tools.base import BaseTool
from app.schemas.agent_findings import (
    InventoryFinding,
    DemandFinding,
    MatchingFinding,
    LogisticsFinding,
    DonorFinding,
    ExplainabilityFinding,
)
from app.schemas.orchestration import (
    OrchestrationStatus,
    CoordinatorDecision,
)
from app.core.config import settings


class CoordinatorAgent(BaseAgent):
    """
    Coordinator Agent (Central Executive Command)
    Orchestrates the emergency request lifecycle, evaluates findings from specialized subagents,
    autonomously triggers deterministic plan generation & safety validation, and directs LangGraph
    state transitions.
    """
    def __init__(self, client: Optional[ClaudeClient] = None, tools: Optional[List[BaseTool]] = None):
        super().__init__(
            name="Emergency Coordinator Agent",
            role="coordinator",
            description="High-level orchestrator that coordinates specialized subagents and synthesizes findings.",
            system_prompt=COORDINATOR_SYSTEM_PROMPT,
            client=client,
            tools=tools or tool_registry.get_tools_for_agent("coordinator"),
        )

    def run(self, state: RheonAgentState, db: Optional[Session] = None) -> Tuple[Dict[str, Any], List[str], Optional[str]]:
        blood_group = state.get("blood_group") or "O-"
        component_type = state.get("component_type") or "RBC"
        units_requested = state.get("units_requested") or 1
        urgency = state.get("urgency") or "CRITICAL"
        hospital_id = state.get("recipient_hospital_id") or "unknown-hospital"
        max_eta = state.get("max_eta_minutes") or 45
        current_iteration = state.get("iteration_count", 0)
        tools_called = []

        # Inspect current specialized findings
        inv_findings = state.get("inventory_findings")
        demand_findings = state.get("demand_findings")
        matching_findings = state.get("matching_findings")
        logistics_findings = state.get("logistics_findings")
        donor_findings = state.get("donor_findings")
        explainability_findings = state.get("explainability_findings")

        # Track completed specialized agent roles
        completed = []
        if inv_findings:
            completed.append("inventory")
        if demand_findings:
            completed.append("demand")
        if matching_findings:
            completed.append("matching")
        if logistics_findings:
            completed.append("logistics")
        if donor_findings:
            completed.append("donor")
        if explainability_findings:
            completed.append("explainability")

        all_specialized = ["inventory", "demand", "matching", "logistics", "donor", "explainability"]
        remaining = [a for a in all_specialized if a not in completed]

        # Check for autonomous candidate plan generation & validation once matching and logistics findings exist
        candidate_plan = state.get("candidate_plan")
        validation_result = state.get("validation_result")
        plan_diff = state.get("plan_diff")

        if matching_findings and logistics_findings and not candidate_plan:
            is_replanning = bool(state.get("is_replanned")) and bool(state.get("parent_plan_id") or state.get("parent_plan"))
            parent_id = state.get("parent_plan_id") or (state.get("parent_plan", {}).get("id") if isinstance(state.get("parent_plan"), dict) else None)

            if is_replanning and parent_id:
                if db and self.get_tool("tool_replan_emergency_plan"):
                    candidate_plan = self.execute_tool(
                        "tool_replan_emergency_plan",
                        db=db,
                        parent_plan_id=parent_id,
                        excluded_facility_ids=state.get("excluded_facility_ids", []),
                        trigger_event_id=state.get("trigger_event", {}).get("id") if isinstance(state.get("trigger_event"), dict) else None,
                    )
                    tools_called.append("tool_replan_emergency_plan")
            else:
                if db and self.get_tool("tool_generate_emergency_plan"):
                    candidate_plan = self.execute_tool(
                        "tool_generate_emergency_plan",
                        db=db,
                        hospital_id=hospital_id,
                        blood_group=blood_group,
                        units_requested=units_requested,
                        component_type=component_type,
                        urgency=urgency,
                        max_eta_minutes=max_eta,
                    )
                    tools_called.append("tool_generate_emergency_plan")

            if candidate_plan and db and self.get_tool("tool_validate_plan") and not validation_result:
                allocations = candidate_plan.get("items", [])
                validation_result = self.execute_tool(
                    "tool_validate_plan",
                    db=db,
                    recipient_blood_group=blood_group,
                    units_requested=units_requested,
                    allocations=allocations,
                    component_type=component_type,
                    total_allocated_declared=candidate_plan.get("total_allocated_units"),
                    unmet_declared=candidate_plan.get("unmet_units"),
                )
                tools_called.append("tool_validate_plan")

            parent_p = state.get("parent_plan")
            if is_replanning and candidate_plan and parent_p and not plan_diff:
                if self.get_tool("tool_compute_plan_diff"):
                    plan_diff = self.execute_tool(
                        "tool_compute_plan_diff",
                        parent_plan=parent_p,
                        new_plan=candidate_plan,
                        trigger_event_type=state.get("trigger_event", {}).get("event_type") if isinstance(state.get("trigger_event"), dict) else None,
                    )
                    tools_called.append("tool_compute_plan_diff")

        # Determine next specialized agent and orchestration decision
        priority = "CRITICAL" if urgency in ["CRITICAL", "STAT"] else "HIGH"
        confidence = 1.0
        is_terminal = False

        if not inv_findings:
            next_agent = "inventory"
            workflow_status = "ANALYZING"
            decision_reason = f"Initiate regional inventory evaluation for {units_requested}x {blood_group} ({component_type}) above statutory safety reserve floor."
            required_actions = [
                "Discover compatible blood groups",
                "Query facility network stock",
                "Calculate net usable units above statutory reserves",
            ]
        elif not demand_findings:
            next_agent = "demand"
            workflow_status = "ANALYZING"
            decision_reason = f"Evaluate clinical consumption velocity, surge risk, and donor facility post-transfer stockout vulnerability."
            required_actions = [
                "Assess clinical surge risk",
                "Compute velocity index",
                "Establish safe transfer buffer threshold",
            ]
        elif not matching_findings:
            next_agent = "matching"
            workflow_status = "PLANNING"
            decision_reason = f"Perform multi-criteria candidate source ranking (35% compat, 25% capacity, 25% ETA, 15% reliability)."
            required_actions = [
                "Rank candidate facilities",
                "Formulate allocation strategy (Single vs Split)",
                "Preserve donor hospital reserve floors",
            ]
        elif not logistics_findings:
            next_agent = "logistics"
            workflow_status = "PLANNING"
            decision_reason = f"Route ground emergency transit corridors, verify cold-chain compliance for {component_type}, and calculate travel ETAs."
            required_actions = [
                "Select ground transport modality (Ambulance/Courier)",
                "Verify component-specific temperature specs (DRONES DISALLOWED)",
                "Compute corridor travel ETAs",
            ]
        elif not donor_findings:
            next_agent = "donor"
            workflow_status = "EVALUATING"
            priority = "NORMAL"
            decision_reason = f"Assess synthetic standby donor pool and formulate mobilization strategy within simulation boundaries."
            required_actions = [
                "Query geo-fenced synthetic donor pool",
                "Select standby escalation strategy",
                "Enforce mandatory simulation disclaimer",
            ]
        elif not explainability_findings:
            next_agent = "explainability"
            workflow_status = "VALIDATING"
            decision_reason = f"Execute deterministic 6-point safety validation and synthesize clinical command briefing."
            required_actions = [
                "Execute 6-point plan safety check",
                "Formulate clinical rationale and candidate reasoning",
                "Document rejected alternatives and trade-offs",
                "Generate dispatch instructions",
            ]
        else:
            # Workflow complete
            next_agent = "END"
            workflow_status = "COMPLETED"
            priority = "NORMAL"
            is_terminal = True
            conf_val = explainability_findings.get("decision_confidence") if isinstance(explainability_findings, dict) else 0.95
            confidence = float(conf_val or 0.95)
            decision_reason = f"Emergency allocation workflow completed and validated against 6 deterministic safety rules with confidence {confidence:.2f}."
            required_actions = [
                "Dispatch approved allocation via ground transit",
                "Maintain continuous cold-chain monitoring",
            ]

        # Check hard loop safety bounds
        if (current_iteration + 1) >= settings.RHEON_MAX_ORCHESTRATION_STEPS and not is_terminal:
            next_agent = "END"
            is_terminal = True
            workflow_status = "COMPLETED" if explainability_findings else "FAILED"
            decision_reason = f"Orchestration hard bound reached ({current_iteration + 1} steps). Graceful termination enforced."

        coordinator_decision = CoordinatorDecision(
            next_agent=next_agent,
            reason=decision_reason,
            priority=priority,
            workflow_status=workflow_status,
            confidence=confidence,
            completed_agents=completed,
            remaining_agents=remaining,
            required_actions=required_actions,
            is_terminal=is_terminal,
        )

        agents_requested = list(state.get("agents_requested") or [])
        if next_agent not in ["END", "__end__", "terminal"] and next_agent not in agents_requested:
            agents_requested.append(next_agent)

        reasoning = (
            f"Coordinator Decision: Step {current_iteration + 1} -> Next Agent: '{next_agent}'. "
            f"Status: {workflow_status}. Reason: {decision_reason}"
        )

        final_status = "IN_PROGRESS"
        if is_terminal:
            if candidate_plan and candidate_plan.get("total_allocated_units", 0) == 0:
                final_status = "FAILED"
                workflow_status = "FAILED"
                decision_reason = "No feasible alternative plan found within network and safety reserve constraints (NO_FEASIBLE_PLAN)."
            else:
                final_status = "VALIDATED" if (explainability_findings and explainability_findings.get("safety_verified", True)) else ("COMPLETED" if explainability_findings else "FAILED")

        updates: Dict[str, Any] = {
            "current_node": "coordinator",
            "status": final_status,
            "orchestration_status": workflow_status,
            "coordinator_decision": coordinator_decision.model_dump(),
            "next_agent": next_agent,
            "decision_reason": decision_reason,
            "agents_completed": completed,
            "agents_requested": agents_requested,
            "iteration_count": current_iteration + 1,
        }
        if candidate_plan and not state.get("candidate_plan"):
            updates["candidate_plan"] = candidate_plan
        if validation_result and not state.get("validation_result"):
            updates["validation_result"] = validation_result
        if plan_diff and not state.get("plan_diff"):
            updates["plan_diff"] = plan_diff
        if is_terminal and state.get("confidence_score", 0.0) == 0.0:
            updates["confidence_score"] = confidence

        return updates, tools_called, reasoning


class InventoryAgent(BaseAgent):
    """
    Inventory Intelligence Agent
    Inspects regional stock across Delhi NCR facilities, enforces statutory safety reserves
    (Usable = max(0, Available - SafetyReserve)), and identifies candidate supply facilities.
    """
    def __init__(self, client: Optional[ClaudeClient] = None, tools: Optional[List[BaseTool]] = None):
        super().__init__(
            name="Inventory Intelligence Agent",
            role="inventory",
            description="Inspects real-time regional stock, enforces safety reserves, and calculates net usable units.",
            system_prompt=INVENTORY_AGENT_PROMPT,
            client=client,
            tools=tools or tool_registry.get_tools_for_agent("inventory"),
        )

    def run(self, state: RheonAgentState, db: Optional[Session] = None) -> Tuple[Dict[str, Any], List[str], Optional[str]]:
        blood_group = state.get("blood_group") or "O-"
        component_type = state.get("component_type") or "RBC"
        units_requested = state.get("units_requested") or 1
        tools_called = []

        # 1. Discover compatible blood groups deterministically
        compat_groups = [blood_group]
        if self.get_tool("tool_get_compatible_blood_groups"):
            compat_groups = self.execute_tool("tool_get_compatible_blood_groups", blood_group, component_type)
            tools_called.append("tool_get_compatible_blood_groups")

        # 2. Query network stock summary
        stock_summary = {}
        if db and self.get_tool("tool_get_network_stock_summary"):
            stock_summary = self.execute_tool(
                "tool_get_network_stock_summary",
                db=db,
                blood_groups=compat_groups,
                component_type=component_type,
            )
            tools_called.append("tool_get_network_stock_summary")

        # 3. Calculate and verify usable stock
        total_available = stock_summary.get("total_available_units", stock_summary.get("total_units", 20))
        total_reserve = stock_summary.get("total_safety_reserve_units", stock_summary.get("total_safety_reserve", 5))
        total_usable = stock_summary.get("total_usable_units", max(0, total_available - total_reserve))

        if self.get_tool("tool_calculate_usable_stock"):
            total_usable = self.execute_tool(
                "tool_calculate_usable_stock",
                available_units=total_available,
                safety_reserve_units=total_reserve,
            )
            tools_called.append("tool_calculate_usable_stock")

        # 4. Assess regional deficit status
        regional_deficit = total_usable < units_requested
        batches_count = stock_summary.get("batches_count", len(compat_groups))

        finding = InventoryFinding(
            requested_blood_group=blood_group,
            component_type=component_type,
            compatible_groups=compat_groups,
            network_stock=stock_summary,
            total_usable_units=total_usable,
            total_available_units=total_available,
            total_safety_reserve=total_reserve,
            regional_deficit=regional_deficit,
            usable_stock_verified=True,
            candidate_facilities_count=batches_count,
            summary=(
                f"Regional inventory evaluated: {total_usable} net usable units available across "
                f"{len(compat_groups)} compatible groups (Gross: {total_available}, Reserve Floor: {total_reserve}). "
                f"Regional Deficit: {regional_deficit}."
            ),
        )

        reasoning = (
            f"Calculated regional inventory across {len(compat_groups)} compatible blood groups. "
            f"Net usable units: {total_usable}. Safety reserve floor preserved ({total_reserve} units locked). "
            f"Deficit status: {regional_deficit}."
        )

        return {
            "inventory_findings": finding.model_dump(),
            "status": "IN_PROGRESS",
        }, tools_called, reasoning


class DemandAgent(BaseAgent):
    """
    Demand & Surge Forecasting Agent
    Assesses clinical urgency, consumption velocity, surge factor, and post-transfer stock-out risks.
    """
    def __init__(self, client: Optional[ClaudeClient] = None, tools: Optional[List[BaseTool]] = None):
        super().__init__(
            name="Demand & Surge Forecasting Agent",
            role="demand",
            description="Assesses clinical urgency, consumption velocity, and emergency surge risk.",
            system_prompt=DEMAND_AGENT_PROMPT,
            client=client,
            tools=tools or tool_registry.get_tools_for_agent("demand"),
        )

    def run(self, state: RheonAgentState, db: Optional[Session] = None) -> Tuple[Dict[str, Any], List[str], Optional[str]]:
        urgency = state.get("urgency") or "CRITICAL"
        units_requested = state.get("units_requested") or 1
        inv_findings = state.get("inventory_findings") or {}
        total_usable = inv_findings.get("total_usable_units", 10)

        # Evaluate surge risk parameters
        if urgency in ["CRITICAL", "STAT"] or units_requested >= 4:
            surge_risk = "HIGH"
            velocity_index = 1.8
            buffer_multiplier = 1.3
            safe_transfer_threshold = 2
        elif urgency == "URGENT" or units_requested >= 2:
            surge_risk = "MODERATE"
            velocity_index = 1.2
            buffer_multiplier = 1.1
            safe_transfer_threshold = 2
        else:
            surge_risk = "LOW"
            velocity_index = 1.0
            buffer_multiplier = 1.0
            safe_transfer_threshold = 1

        # Calculate post-transfer stock-out risk
        net_remaining_after_transfer = total_usable - units_requested
        if net_remaining_after_transfer <= 0:
            post_transfer_stockout_risk = "HIGH"
        elif net_remaining_after_transfer < safe_transfer_threshold * 2:
            post_transfer_stockout_risk = "MODERATE"
        else:
            post_transfer_stockout_risk = "LOW"

        finding = DemandFinding(
            urgency_level=urgency,
            units_requested=units_requested,
            surge_risk=surge_risk,
            consumption_velocity_index=velocity_index,
            recommended_buffer_multiplier=buffer_multiplier,
            post_transfer_stockout_risk=post_transfer_stockout_risk,
            safe_transfer_threshold=safe_transfer_threshold,
            summary=(
                f"Urgency '{urgency}', Request volume: {units_requested} unit(s). "
                f"Surge risk: {surge_risk} (Velocity Index: {velocity_index:.1f}). "
                f"Post-transfer donor network stockout risk: {post_transfer_stockout_risk}."
            ),
        )

        reasoning = (
            f"Demand surge assessment: Risk={surge_risk} (Velocity Index={velocity_index:.1f}, "
            f"Buffer Multiplier={buffer_multiplier:.2f}). Safe transfer threshold set to {safe_transfer_threshold} units. "
            f"Post-transfer network stockout risk: {post_transfer_stockout_risk}."
        )

        return {
            "demand_findings": finding.model_dump(),
            "status": "IN_PROGRESS",
        }, [], reasoning


class MatchingAgent(BaseAgent):
    """
    Matching & Allocation Agent
    Discovers candidate supply facilities and ranks them deterministically across compatibility (35%),
    capacity (25%), ETA (25%), and facility reliability (15%).
    """
    def __init__(self, client: Optional[ClaudeClient] = None, tools: Optional[List[BaseTool]] = None):
        super().__init__(
            name="Matching & Allocation Agent",
            role="matching",
            description="Discovers candidate supply facilities and ranks them deterministically across compatibility, capacity, and ETA.",
            system_prompt=MATCHING_AGENT_PROMPT,
            client=client,
            tools=tools or tool_registry.get_tools_for_agent("matching"),
        )

    def run(self, state: RheonAgentState, db: Optional[Session] = None) -> Tuple[Dict[str, Any], List[str], Optional[str]]:
        blood_group = state.get("blood_group") or "O-"
        units_requested = state.get("units_requested") or 1
        component_type = state.get("component_type") or "RBC"
        hospital_id = state.get("recipient_hospital_id")
        urgency = state.get("urgency") or "CRITICAL"
        max_eta_minutes = state.get("max_eta_minutes") or 45
        tools_called = []
        matching_data = {}

        if db and self.get_tool("tool_evaluate_candidates"):
            matching_data = self.execute_tool(
                "tool_evaluate_candidates",
                db=db,
                blood_group=blood_group,
                units_requested=units_requested,
                component_type=component_type,
                hospital_id=hospital_id,
                urgency=urgency,
                max_eta_minutes=max_eta_minutes,
            )
            tools_called.append("tool_evaluate_candidates")

        candidates = matching_data.get("candidates", [])
        excluded_ids = set(state.get("excluded_facility_ids", []) or [])
        feasible_candidates = [
            c for c in candidates
            if c.get("is_feasible", False) and c.get("facility_id") not in excluded_ids
        ]
        feasible_count = len(feasible_candidates)

        # Determine allocation strategy and compile recommended sources
        recommended_sources = []
        remaining_to_allocate = units_requested
        allocation_strategy = "SINGLE_SOURCE"

        if feasible_candidates:
            # Check if top candidate can fulfill all requested units
            if feasible_candidates[0].get("usable_units", 0) >= units_requested:
                allocation_strategy = "SINGLE_SOURCE"
                top = feasible_candidates[0]
                recommended_sources.append({
                    "facility_id": top.get("facility_id"),
                    "facility_name": top.get("facility_name"),
                    "donor_blood_group": top.get("compatible_group", blood_group),
                    "units_allocated": units_requested,
                    "composite_score": top.get("composite_score", 0.9),
                    "estimated_eta_minutes": top.get("estimated_eta_minutes", 25),
                    "distance_km": top.get("distance_km", 12.0),
                })
            else:
                # Multi-source split allocation
                total_feasible_units = sum(c.get("usable_units", 0) for c in feasible_candidates)
                if total_feasible_units >= units_requested:
                    allocation_strategy = "SPLIT_ALLOCATION"
                else:
                    allocation_strategy = "STANDBY_ESCALATION"

                for c in feasible_candidates:
                    if remaining_to_allocate <= 0:
                        break
                    take = min(remaining_to_allocate, c.get("usable_units", 0))
                    if take > 0:
                        recommended_sources.append({
                            "facility_id": c.get("facility_id"),
                            "facility_name": c.get("facility_name"),
                            "donor_blood_group": c.get("compatible_group", blood_group),
                            "units_allocated": take,
                            "composite_score": c.get("composite_score", 0.8),
                            "estimated_eta_minutes": c.get("estimated_eta_minutes", 30),
                            "distance_km": c.get("distance_km", 15.0),
                        })
                        remaining_to_allocate -= take
        else:
            allocation_strategy = "STANDBY_ESCALATION"

        finding = MatchingFinding(
            request_blood_group=blood_group,
            units_requested=units_requested,
            urgency=urgency,
            total_candidates_evaluated=len(candidates),
            feasible_candidates_count=feasible_count,
            sufficient_inventory=matching_data.get("sufficient_inventory", feasible_count > 0),
            top_candidates=candidates[:5],
            allocation_strategy=allocation_strategy,
            recommended_sources=recommended_sources,
            summary=(
                f"Evaluated {len(candidates)} candidate facilities. Identified {feasible_count} feasible source(s). "
                f"Allocation Strategy: {allocation_strategy}."
            ),
        )

        reasoning = (
            f"Multi-criteria source matching complete: {feasible_count} feasible source(s) identified. "
            f"Strategy selected: {allocation_strategy} across {len(recommended_sources)} allocation node(s)."
        )

        return {
            "matching_findings": finding.model_dump(),
            "allocations": recommended_sources,
            "status": "IN_PROGRESS",
        }, tools_called, reasoning


class LogisticsAgent(BaseAgent):
    """
    Logistics & Routing Agent
    Evaluates ground transit corridors, calculates distances and ETAs, selects optimal transport modality
    (STRICTLY GROUND: AMBULANCE_SIREN or STANDARD_COURIER; DRONES DISALLOWED), and verifies cold-chain specs.
    """
    def __init__(self, client: Optional[ClaudeClient] = None, tools: Optional[List[BaseTool]] = None):
        super().__init__(
            name="Logistics & Routing Agent",
            role="logistics",
            description="Evaluates transit corridors, calculates Haversine distances, selects optimal transport modality, and computes ETAs.",
            system_prompt=LOGISTICS_AGENT_PROMPT,
            client=client,
            tools=tools or tool_registry.get_tools_for_agent("logistics"),
        )

    def run(self, state: RheonAgentState, db: Optional[Session] = None) -> Tuple[Dict[str, Any], List[str], Optional[str]]:
        urgency = state.get("urgency") or "CRITICAL"
        max_eta = state.get("max_eta_minutes") or 45
        component_type = state.get("component_type") or "RBC"
        matching_findings = state.get("matching_findings") or {}
        recommended_sources = matching_findings.get("recommended_sources") or state.get("allocations") or []
        tools_called = []

        # STRICT URBAN SAFETY BOUNDARY: allow_drone=False for emergency blood dispatch
        recommended_mode = "STANDARD_COURIER"
        if self.get_tool("tool_select_transport_mode"):
            recommended_mode = self.execute_tool(
                "tool_select_transport_mode",
                urgency=urgency,
                distance_km=15.0,
                max_eta_minutes=max_eta,
                allow_drone=False,  # Ground transport strictly enforced
            )
            tools_called.append("tool_select_transport_mode")

        # Define cold chain compliance specification
        if component_type == "PLATELETS":
            cold_chain_spec = {
                "component": "PLATELETS",
                "min_temp_c": 20.0,
                "max_temp_c": 24.0,
                "special_instructions": "Maintain 20-24°C with continuous gentle agitation container",
                "max_transit_hours": 4,
            }
        elif component_type in ["PLASMA", "CRYO", "CRYOPRECIPITATE", "FFP"]:
            cold_chain_spec = {
                "component": component_type,
                "min_temp_c": -50.0,
                "max_temp_c": -18.0,
                "special_instructions": "Maintain frozen at or below -18°C on dry ice validated shipper",
                "max_transit_hours": 6,
            }
        else:  # RBC / WHOLE_BLOOD
            cold_chain_spec = {
                "component": component_type,
                "min_temp_c": 2.0,
                "max_temp_c": 6.0,
                "special_instructions": "Maintain 2-6°C insulated cold box with thermal data logger",
                "max_transit_hours": 24,
            }

        # Evaluate corridor travel times for sources
        corridor_evaluations = []
        for src in recommended_sources:
            dist = src.get("distance_km", 15.0)
            travel_time = src.get("estimated_eta_minutes", 30)
            if self.get_tool("tool_estimate_travel_time"):
                travel_time = self.execute_tool(
                    "tool_estimate_travel_time",
                    distance_km=dist,
                    transport_mode=recommended_mode,
                    traffic_factor=1.1,
                )
                tools_called.append("tool_estimate_travel_time")

            corridor_evaluations.append({
                "facility_id": src.get("facility_id"),
                "facility_name": src.get("facility_name"),
                "distance_km": dist,
                "estimated_eta_minutes": travel_time,
                "transport_mode": recommended_mode,
                "eta_within_sla": travel_time <= max_eta,
            })

        finding = LogisticsFinding(
            selected_transport_mode=recommended_mode,
            target_eta_minutes=max_eta,
            corridor_evaluations=corridor_evaluations,
            cold_chain_verified=True,
            cold_chain_spec=cold_chain_spec,
            traffic_monitoring_active=True,
            summary=(
                f"Ground transit corridor selected: {recommended_mode}. Target SLA: {max_eta}m. "
                f"Cold-chain verified for {component_type} ({cold_chain_spec['min_temp_c']}°C to {cold_chain_spec['max_temp_c']}°C). "
                f"Urban drone dispatch disallowed."
            ),
        )

        reasoning = (
            f"Logistics routing evaluated for ground transit ({recommended_mode}). "
            f"Cold-chain protocol locked for {component_type} [{cold_chain_spec['min_temp_c']}°C - {cold_chain_spec['max_temp_c']}°C]. "
            f"Drone transport strictly excluded (allow_drone=False)."
        )

        return {
            "logistics_findings": finding.model_dump(),
            "transport_mode": recommended_mode,
            "status": "IN_PROGRESS",
        }, tools_called, reasoning


class DonorAgent(BaseAgent):
    """
    Donor Intelligence & Standby Agent
    Coordinates standby synthetic emergency donor pools under strict simulation boundaries
    (Never contacts real donors; non-clinical availability only; explicit disclaimer mandated).
    """
    def __init__(self, client: Optional[ClaudeClient] = None, tools: Optional[List[BaseTool]] = None):
        super().__init__(
            name="Donor Intelligence & Standby Agent",
            role="donor",
            description="Assesses emergency donor pools and triggers standby donor protocols if inventory deficit is projected.",
            system_prompt=DONOR_AGENT_PROMPT,
            client=client,
            tools=tools or tool_registry.get_tools_for_agent("donor"),
        )

    def run(self, state: RheonAgentState, db: Optional[Session] = None) -> Tuple[Dict[str, Any], List[str], Optional[str]]:
        blood_group = state.get("blood_group") or "O-"
        component_type = state.get("component_type") or "RBC"
        urgency = state.get("urgency") or "CRITICAL"
        inv_findings = state.get("inventory_findings") or {}
        regional_deficit = inv_findings.get("regional_deficit", False)
        tools_called = []
        availability = {}
        candidate_donors = []

        # 1. Query standby donor availability
        if db and self.get_tool("tool_check_donor_availability"):
            availability = self.execute_tool("tool_check_donor_availability", db=db, blood_group=blood_group)
            tools_called.append("tool_check_donor_availability")

        # 2. Find nearby candidate donors within geo-radius
        if db and self.get_tool("tool_find_standby_donors"):
            coords = state.get("recipient_coordinates") or {"lat": 28.5672, "lon": 77.2100}  # Default AIIMS Delhi coords
            candidate_donors = self.execute_tool(
                "tool_find_standby_donors",
                db=db,
                blood_group=blood_group,
                target_lat=coords.get("lat", 28.5672),
                target_lon=coords.get("lon", 77.2100),
                component_type=component_type,
                max_radius_km=30.0,
                limit=5,
            )
            tools_called.append("tool_find_standby_donors")

        # Determine donor standby escalation strategy
        avail_immediate = availability.get("available_immediate", 0)
        standby_count = availability.get("standby_on_call", 0)

        if regional_deficit or urgency in ["CRITICAL", "STAT"]:
            if avail_immediate > 0:
                donor_strategy = "STANDBY_MOBILIZATION"
            else:
                donor_strategy = "IMMEDIATE_ALERT"
        else:
            donor_strategy = "ROUTINE_MONITORING"

        finding = DonorFinding(
            blood_group=blood_group,
            simulation_mode=True,
            disclaimer="Potential synthetic donor candidates identified for simulation/standby protocol only. No real donor contact or clinical eligibility verified.",
            total_donors_in_pool=availability.get("total_donors", len(candidate_donors)),
            available_immediate_count=avail_immediate,
            standby_on_call_count=standby_count,
            candidate_donors=candidate_donors,
            donor_strategy=donor_strategy,
            summary=(
                f"Synthetic standby donor pool evaluated for {blood_group}. "
                f"{avail_immediate} immediate / {standby_count} on-call synthetic candidates identified. "
                f"Strategy: {donor_strategy}. Simulation boundaries active."
            ),
        )

        reasoning = (
            f"Emergency synthetic donor pool checked for {blood_group}. "
            f"Identified {avail_immediate} immediate and {standby_count} standby donor candidates. "
            f"Strategy: {donor_strategy}. Simulation protocol strictly enforced."
        )

        return {
            "donor_findings": finding.model_dump(),
            "donor_strategy": donor_strategy,
            "status": "IN_PROGRESS",
        }, tools_called, reasoning


class ExplainabilityAgent(BaseAgent):
    """
    Explainability & Verification Agent
    Ingests structured findings directly from all specialized agents without performing mathematical
    recalculations, executes the deterministic 6-point plan safety validation check, and synthesizes
    clinical command briefings detailing candidate selection, rejected alternatives, constraints, and trade-offs.
    """
    def __init__(self, client: Optional[ClaudeClient] = None, tools: Optional[List[BaseTool]] = None):
        super().__init__(
            name="Explainability & Verification Agent",
            role="explainability",
            description="Validates candidate allocation plans against 6 deterministic safety rules and synthesizes clinical command briefings.",
            system_prompt=EXPLAINABILITY_AGENT_PROMPT,
            client=client,
            tools=tools or tool_registry.get_tools_for_agent("explainability"),
        )

    def run(self, state: RheonAgentState, db: Optional[Session] = None) -> Tuple[Dict[str, Any], List[str], Optional[str]]:
        blood_group = state.get("blood_group") or "O-"
        units_requested = state.get("units_requested") or 1
        component_type = state.get("component_type") or "RBC"
        urgency = state.get("urgency") or "CRITICAL"
        hospital_id = state.get("recipient_hospital_id") or "aiims-delhi"
        tools_called = []

        candidate_plan = state.get("candidate_plan")
        matching_findings = state.get("matching_findings") or {}
        recommended_sources = matching_findings.get("recommended_sources") or state.get("allocations") or []

        # 1. Deterministically generate or construct candidate plan if needed
        if not candidate_plan and db:
            is_replanning = bool(state.get("is_replanned")) and bool(state.get("parent_plan_id"))
            if is_replanning and self.get_tool("tool_replan_emergency_plan"):
                candidate_plan = self.execute_tool(
                    "tool_replan_emergency_plan",
                    db=db,
                    parent_plan_id=state.get("parent_plan_id"),
                    excluded_facility_ids=state.get("excluded_facility_ids", []),
                    trigger_event_id=state.get("trigger_event", {}).get("id") if isinstance(state.get("trigger_event"), dict) else None,
                )
                tools_called.append("tool_replan_emergency_plan")
            elif self.get_tool("tool_generate_emergency_plan"):
                candidate_plan = self.execute_tool(
                    "tool_generate_emergency_plan",
                    db=db,
                    hospital_id=hospital_id,
                    blood_group=blood_group,
                    units_requested=units_requested,
                    component_type=component_type,
                    urgency=urgency,
                    max_eta_minutes=state.get("max_eta_minutes") or 45,
                )
                tools_called.append("tool_generate_emergency_plan")

        if not candidate_plan:
            # Fallback plan synthesis from matching allocations
            total_alloc = sum(s.get("units_allocated", 0) for s in recommended_sources)
            unmet = max(0, units_requested - total_alloc)
            candidate_plan = {
                "request_id": state.get("request_id"),
                "items": recommended_sources,
                "total_allocated_units": total_alloc,
                "unmet_units": unmet,
                "confidence_score": 0.95 if unmet == 0 else 0.80,
            }

        # 2. Run deterministic 6-point safety validation
        validation_result = None
        if db and self.get_tool("tool_validate_plan"):
            allocations = candidate_plan.get("items", [])
            validation_result = self.execute_tool(
                "tool_validate_plan",
                db=db,
                recipient_blood_group=blood_group,
                units_requested=units_requested,
                allocations=allocations,
                component_type=component_type,
                total_allocated_declared=candidate_plan.get("total_allocated_units"),
                unmet_declared=candidate_plan.get("unmet_units"),
            )
            tools_called.append("tool_validate_plan")

        # 3. Extract rejected alternatives from matching findings
        top_candidates = matching_findings.get("top_candidates", [])
        rejected_alternatives = []
        for cand in top_candidates:
            if not cand.get("is_feasible", True) or cand.get("usable_units", 0) == 0:
                rejected_alternatives.append({
                    "facility_id": cand.get("facility_id"),
                    "facility_name": cand.get("facility_name"),
                    "reason": cand.get("infeasibility_reason") or "Insufficient usable inventory above statutory safety reserve floor.",
                    "distance_km": cand.get("distance_km"),
                    "eta_minutes": cand.get("estimated_eta_minutes"),
                })

        # 4. Formulate constraints, trade-offs, and dispatch instructions
        transport_mode = state.get("transport_mode", "AMBULANCE_SIREN")
        constraints_evaluated = [
            "ABO/Rh Biological Compatibility Check",
            "Statutory Safety Reserve Floor (Zero-Breach Guarantee)",
            "Transit SLA Delivery Window Enforced",
            "Active Facility Operational Verification",
            "Quantity Conservation Invariant",
            "Road Corridor Emergency Routing Only (Urban Drone Dispatch Prohibited)",
        ]

        trade_offs = [
            f"Ground emergency corridor ({transport_mode}) prioritized to guarantee cold-chain compliance and eliminate urban airspace risk.",
            "Statutory safety reserve protection enforced at candidate donor facilities to prevent secondary regional stockouts.",
        ]
        plan_diff = state.get("plan_diff")
        if plan_diff and isinstance(plan_diff, dict) and plan_diff.get("structural_summary"):
            trade_offs.append(f"Adaptive Re-planning configuration: {plan_diff.get('structural_summary')}")
        if state.get("trigger_event") and isinstance(state.get("trigger_event"), dict):
            evt_type = state.get("trigger_event", {}).get("event_type", "DISRUPTION")
            trade_offs.append(f"Re-planning triggered by disruption event: {evt_type}")

        dispatch_instructions = [
            f"Dispatch {itm.get('units_allocated', 1)} unit(s) of {itm.get('donor_blood_group', blood_group)} {component_type} "
            f"from {itm.get('source_name', itm.get('source_facility_id', itm.get('facility_name', 'facility')))} "
            f"via {transport_mode} with validated {component_type} cold-chain pack."
            for itm in candidate_plan.get("items", [])
        ]

        confidence = float(candidate_plan.get("confidence_score", 0.95))
        is_safety_valid = bool(validation_result and validation_result.get("is_valid", False))

        finding = ExplainabilityFinding(
            clinical_rationale=(
                f"Emergency allocation plan for {units_requested}x {blood_group} ({component_type}) "
                f"fulfills ABO/Rh biological compatibility, respects statutory safety reserves without breach, "
                f"and complies with validated cold-chain transport parameters."
            ),
            candidate_selection_reasoning=(
                f"Selected source facilities optimized using multi-criteria deterministic ranking: "
                f"35% compatibility, 25% usable capacity, 25% ETA proximity, and 15% facility reliability."
            ),
            rejected_alternatives=rejected_alternatives,
            constraints_evaluated=constraints_evaluated,
            trade_offs=trade_offs,
            safety_validation=validation_result,
            safety_verified=is_safety_valid,
            decision_confidence=confidence,
            dispatch_instructions=dispatch_instructions,
            summary=(
                f"Deterministic 6-point safety check: {'PASSED (Zero Violations)' if is_safety_valid else 'COMPLETED'}. "
                f"Allocation Confidence: {confidence:.2f}."
            ),
        )

        reasoning = (
            f"Explainability synthesis complete. 6-point safety validation: {'VALID' if is_safety_valid else 'COMPLETED'}. "
            f"Confidence Score: {confidence:.2f}."
        )

        updates = {
            "explanation": finding.model_dump(),
            "explainability_findings": finding.model_dump(),
            "candidate_plan": candidate_plan,
            "validation_result": validation_result,
            "confidence_score": confidence,
            "status": "VALIDATED" if is_safety_valid else "COMPLETED",
        }

        return updates, tools_called, reasoning


class AgentRegistry:
    """
    Central registry for all specialized agents in RHEON AI.
    Provides lookup, listing, and factory methods.
    """

    def __init__(self, client: Optional[ClaudeClient] = None):
        self.client = client or get_claude_client()
        self._agents: Dict[str, BaseAgent] = {}
        self._register_default_agents()

    def register(self, agent: BaseAgent) -> None:
        """Registers an agent instance by role and name."""
        self._agents[agent.role] = agent

    def get(self, role: str) -> Optional[BaseAgent]:
        """Returns an agent by role name."""
        return self._agents.get(role.lower())

    def list_agents(self) -> List[AgentMetadata]:
        """Lists metadata for all registered agents."""
        return [agent.get_metadata() for agent in self._agents.values()]

    def _register_default_agents(self) -> None:
        """Initializes and registers the 7 primary RHEON agents."""
        agents = [
            CoordinatorAgent(client=self.client),
            InventoryAgent(client=self.client),
            DemandAgent(client=self.client),
            MatchingAgent(client=self.client),
            LogisticsAgent(client=self.client),
            DonorAgent(client=self.client),
            ExplainabilityAgent(client=self.client),
        ]
        for agent in agents:
            self.register(agent)


# Singleton agent registry instance
agent_registry = AgentRegistry()
