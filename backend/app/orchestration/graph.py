from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, START, END

from app.orchestration.state import RheonAgentState, create_initial_agent_state
from app.core.config import settings


from typing import Optional, Dict, Any, List
from sqlalchemy.orm import Session
from langgraph.graph import StateGraph, START, END

from app.orchestration.state import RheonAgentState, create_initial_agent_state
from app.orchestration.guards import route_coordinator
from app.core.config import settings


def make_agent_node(role: str, db: Optional[Session] = None):
    """
    Factory creating a LangGraph node function for a specific agent role
    with optional database session binding.
    """
    def node_func(state: RheonAgentState) -> RheonAgentState:
        from app.agents.registry import agent_registry
        agent = agent_registry.get(role)
        if agent:
            return agent(state, db=db)
        return state

    node_func.__name__ = f"{role}_node"
    return node_func


def coordinator_node(state: RheonAgentState, db: Optional[Session] = None) -> RheonAgentState:
    """Coordinator node wrapper."""
    return make_agent_node("coordinator", db=db)(state)


def inventory_node(state: RheonAgentState, db: Optional[Session] = None) -> RheonAgentState:
    """Inventory intelligence node wrapper."""
    return make_agent_node("inventory", db=db)(state)


def demand_node(state: RheonAgentState, db: Optional[Session] = None) -> RheonAgentState:
    """Demand forecasting node wrapper."""
    return make_agent_node("demand", db=db)(state)


def matching_node(state: RheonAgentState, db: Optional[Session] = None) -> RheonAgentState:
    """Matching & allocation node wrapper."""
    return make_agent_node("matching", db=db)(state)


def logistics_node(state: RheonAgentState, db: Optional[Session] = None) -> RheonAgentState:
    """Logistics & routing node wrapper."""
    return make_agent_node("logistics", db=db)(state)


def donor_node(state: RheonAgentState, db: Optional[Session] = None) -> RheonAgentState:
    """Donor intelligence node wrapper."""
    return make_agent_node("donor", db=db)(state)


def explainability_node(state: RheonAgentState, db: Optional[Session] = None) -> RheonAgentState:
    """Explainability and verification node wrapper."""
    return make_agent_node("explainability", db=db)(state)


def build_rheon_graph():
    """
    Constructs and compiles the baseline single-node RHEON LangGraph state graph.
    Baseline workflow: START -> coordinator -> END
    """
    workflow = StateGraph(RheonAgentState)
    workflow.add_node("coordinator", coordinator_node)
    workflow.add_edge(START, "coordinator")
    workflow.add_edge("coordinator", END)
    return workflow.compile()


def build_rheon_full_graph():
    """
    Constructs and compiles the legacy sequential multi-agent pipeline graph.
    Sequential evaluation:
    START -> coordinator -> inventory -> demand -> matching -> logistics -> donor -> explainability -> END
    """
    workflow = StateGraph(RheonAgentState)

    workflow.add_node("coordinator", coordinator_node)
    workflow.add_node("inventory", inventory_node)
    workflow.add_node("demand", demand_node)
    workflow.add_node("matching", matching_node)
    workflow.add_node("logistics", logistics_node)
    workflow.add_node("donor", donor_node)
    workflow.add_node("explainability", explainability_node)

    workflow.add_edge(START, "coordinator")
    workflow.add_edge("coordinator", "inventory")
    workflow.add_edge("inventory", "demand")
    workflow.add_edge("demand", "matching")
    workflow.add_edge("matching", "logistics")
    workflow.add_edge("logistics", "donor")
    workflow.add_edge("donor", "explainability")
    workflow.add_edge("explainability", END)

    return workflow.compile()


def build_rheon_orchestrated_graph(db: Optional[Session] = None):
    """
    Constructs and compiles the dynamic, cyclic, state-driven LangGraph orchestration state machine.

    Topology:
        START -> coordinator
        coordinator -> [conditional routing via route_coordinator] -> (inventory | demand | matching | logistics | donor | explainability | END)
        inventory -> coordinator
        demand -> coordinator
        matching -> coordinator
        logistics -> coordinator
        donor -> coordinator
        explainability -> coordinator
    """
    workflow = StateGraph(RheonAgentState)

    # Register all agent nodes with database session injection
    roles = ["coordinator", "inventory", "demand", "matching", "logistics", "donor", "explainability"]
    for role in roles:
        workflow.add_node(role, make_agent_node(role, db=db))

    # Entry edge into Coordinator
    workflow.add_edge(START, "coordinator")

    # Conditional dynamic routing from Coordinator based on state inspection and guards
    workflow.add_conditional_edges(
        "coordinator",
        route_coordinator,
        {
            "inventory": "inventory",
            "demand": "demand",
            "matching": "matching",
            "logistics": "logistics",
            "donor": "donor",
            "explainability": "explainability",
            "END": END,
            "__end__": END,
        },
    )

    # Return edges: every specialized agent relinquishes control back to Coordinator
    for role in ["inventory", "demand", "matching", "logistics", "donor", "explainability"]:
        workflow.add_edge(role, "coordinator")

    return workflow.compile()


# Precompiled default graphs
rheon_graph = build_rheon_graph()
rheon_full_graph = build_rheon_full_graph()
rheon_orchestrated_graph = build_rheon_orchestrated_graph()


def run_rheon_workflow(
    initial_state: Optional[RheonAgentState] = None,
    **kwargs,
) -> RheonAgentState:
    """Executes the compiled RHEON baseline LangGraph workflow."""
    if initial_state is None:
        initial_state = create_initial_agent_state(**kwargs)

    return rheon_graph.invoke(initial_state)


def run_rheon_orchestrated_workflow(
    initial_state: Optional[RheonAgentState] = None,
    db: Optional[Session] = None,
    **kwargs,
) -> RheonAgentState:
    """
    Executes the dynamic Coordinator orchestration workflow using compiled LangGraph
    with cyclic return-to-coordinator routing and deterministic guards.
    """
    state = initial_state if initial_state is not None else create_initial_agent_state(**kwargs)
    graph = build_rheon_orchestrated_graph(db=db)
    result = graph.invoke(state, {"recursion_limit": 50})
    return result


def run_full_multi_agent_workflow(
    initial_state: Optional[RheonAgentState] = None,
    db: Optional[Session] = None,
    max_tool_calls: int = 8,
    **kwargs,
) -> RheonAgentState:
    """
    Executes the complete multi-agent orchestration workflow.
    Invokes the dynamic cyclic LangGraph orchestration graph with database session injection.
    """
    state = initial_state if initial_state is not None else create_initial_agent_state(**kwargs)
    return run_rheon_orchestrated_workflow(initial_state=state, db=db, **kwargs)
