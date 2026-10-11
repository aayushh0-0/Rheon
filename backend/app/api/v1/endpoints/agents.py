from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, status, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from app.database.session import get_db
from app.core.config import settings
from app.agents.registry import agent_registry
from app.agents.base import AgentMetadata
from app.tools.registry import tool_registry
from app.tools.base import ToolMetadata
from app.llm.client import get_claude_client
from app.orchestration.state import create_initial_agent_state, RheonAgentState
from app.orchestration.graph import (
    run_rheon_workflow,
    run_full_multi_agent_workflow,
    run_rheon_orchestrated_workflow,
)


router = APIRouter(prefix="/agents", tags=["Agentic AI & Orchestration"])


class AgentSystemStatusResponse(BaseModel):
    is_agentic_system_enabled: bool
    is_llm_configured: bool
    default_model: str
    agents_registered_count: int
    tools_registered_count: int
    environment: str


class WorkflowTestRequest(BaseModel):
    recipient_hospital_id: str = "aiims-delhi"
    blood_group: str = "O-"
    component_type: str = "RBC"
    units_requested: int = 2
    urgency: str = "CRITICAL"
    max_eta_minutes: int = 45


class ToolWorkflowTestRequest(BaseModel):
    recipient_hospital_id: str = "aiims-delhi"
    blood_group: str = "O-"
    component_type: str = "RBC"
    units_requested: int = 2
    urgency: str = "CRITICAL"
    max_eta_minutes: int = 45
    max_tool_calls: int = 8
    agent_role: Optional[str] = None


class OrchestrationRunRequest(BaseModel):
    recipient_hospital_id: str = "aiims-delhi"
    blood_group: str = "O-"
    component_type: str = "RBC"
    units_requested: int = 2
    urgency: str = "CRITICAL"
    max_eta_minutes: int = 45
    special_requirements: Optional[List[str]] = None


@router.get(
    "/status",
    response_model=AgentSystemStatusResponse,
    status_code=status.HTTP_200_OK,
    summary="Agent System Readiness & Configuration Status",
    description="Returns the operational readiness, LLM configuration, and registry counts for RHEON Agentic AI.",
)
def get_agent_system_status() -> AgentSystemStatusResponse:
    claude = get_claude_client()
    agents = agent_registry.list_agents()
    tools = tool_registry.list_tools()

    return AgentSystemStatusResponse(
        is_agentic_system_enabled=settings.ENABLE_AGENTIC_SYSTEM,
        is_llm_configured=claude.is_configured,
        default_model=settings.ANTHROPIC_MODEL,
        agents_registered_count=len(agents),
        tools_registered_count=len(tools),
        environment=settings.ENVIRONMENT,
    )


@router.get(
    "/list",
    response_model=List[AgentMetadata],
    status_code=status.HTTP_200_OK,
    summary="List Registered Specialized Agents",
    description="Returns metadata and capabilities for all 7 specialized agents in the RHEON multi-agent system.",
)
def list_registered_agents() -> List[AgentMetadata]:
    return agent_registry.list_agents()


@router.get(
    "/tools",
    response_model=List[ToolMetadata],
    status_code=status.HTTP_200_OK,
    summary="List Registered Deterministic Tools",
    description="Returns the catalog of all deterministic calculation and query tools available to agents.",
)
def list_registered_tools() -> List[ToolMetadata]:
    return tool_registry.list_tools()


@router.get(
    "/tools/schemas",
    response_model=List[Dict[str, Any]],
    status_code=status.HTTP_200_OK,
    summary="List Anthropic Tool Parameter Schemas",
    description="Returns the standard Anthropic JSON tool parameter schemas (name, description, input_schema) for all registered deterministic tools.",
)
def list_tool_schemas(
    role: Optional[str] = None,
) -> List[Dict[str, Any]]:
    return tool_registry.get_anthropic_schemas(agent_role=role)


@router.post(
    "/workflow/test",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Execute Baseline Workflow Run",
    description="Executes a test pass through the LangGraph skeleton state machine.",
)
def execute_test_workflow(
    request: Optional[WorkflowTestRequest] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    req = request or WorkflowTestRequest()
    initial_state = create_initial_agent_state(
        recipient_hospital_id=req.recipient_hospital_id,
        blood_group=req.blood_group,
        component_type=req.component_type,
        units_requested=req.units_requested,
        urgency=req.urgency,
        max_eta_minutes=req.max_eta_minutes,
    )

    final_state = run_rheon_workflow(initial_state=initial_state)
    return {
        "request_id": final_state.get("request_id"),
        "status": final_state.get("status"),
        "iteration_count": final_state.get("iteration_count"),
        "errors": final_state.get("errors", []),
        "warnings": final_state.get("warnings", []),
        "agent_execution_history": final_state.get("agent_execution_history", []),
    }


@router.post(
    "/tool-workflow/test",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Execute Tool-Calling Multi-Agent Workflow Test",
    description="Executes a complete multi-agent reasoning and deterministic tool-calling workflow with database session injection and loop guardrails.",
)
def execute_test_tool_workflow(
    request: Optional[ToolWorkflowTestRequest] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    req = request or ToolWorkflowTestRequest()
    initial_state = create_initial_agent_state(
        recipient_hospital_id=req.recipient_hospital_id,
        blood_group=req.blood_group,
        component_type=req.component_type,
        units_requested=req.units_requested,
        urgency=req.urgency,
        max_eta_minutes=req.max_eta_minutes,
    )

    if req.agent_role:
        agent = agent_registry.get(req.agent_role)
        if not agent:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Agent with role '{req.agent_role}' not found in registry.",
            )
        final_state = agent(initial_state, db=db)
    else:
        final_state = run_full_multi_agent_workflow(
            initial_state=initial_state,
            db=db,
            max_tool_calls=req.max_tool_calls,
        )

    # Collect all tools invoked across execution history
    history = final_state.get("agent_execution_history", [])
    all_tools_called = []
    for h in history:
        all_tools_called.extend(h.get("tools_called", []))

    return {
        "request_id": final_state.get("request_id"),
        "status": final_state.get("status"),
        "blood_group": final_state.get("blood_group"),
        "units_requested": final_state.get("units_requested"),
        "urgency": final_state.get("urgency"),
        "allocations": final_state.get("allocations", []),
        "transport_mode": final_state.get("transport_mode"),
        "donor_strategy": final_state.get("donor_strategy"),
        "confidence_score": final_state.get("confidence_score", 0.0),
        "explanation": final_state.get("explanation"),
        "validation_result": final_state.get("validation_result"),
        "total_tools_called": len(all_tools_called),
        "tools_called_summary": list(set(all_tools_called)),
        "agent_execution_history": history,
        "errors": final_state.get("errors", []),
        "warnings": final_state.get("warnings", []),
    }


@router.post(
    "/orchestration/run",
    response_model=Dict[str, Any],
    status_code=status.HTTP_200_OK,
    summary="Execute Dynamic Coordinator-Orchestrated LangGraph Workflow",
    description="Executes the full dynamic Coordinator-directed LangGraph state machine with cyclic routing and deterministic validation.",
)
def execute_orchestrated_workflow(
    request: Optional[OrchestrationRunRequest] = None,
    db: Session = Depends(get_db),
) -> Dict[str, Any]:
    req = request or OrchestrationRunRequest()
    initial_state = create_initial_agent_state(
        recipient_hospital_id=req.recipient_hospital_id,
        blood_group=req.blood_group,
        component_type=req.component_type,
        units_requested=req.units_requested,
        urgency=req.urgency,
        max_eta_minutes=req.max_eta_minutes,
        special_requirements=req.special_requirements,
    )

    final_state = run_rheon_orchestrated_workflow(
        initial_state=initial_state,
        db=db,
    )

    history = final_state.get("agent_execution_history", [])
    all_tools_called = []
    for h in history:
        all_tools_called.extend(h.get("tools_called", []))

    return {
        "request_id": final_state.get("request_id"),
        "status": final_state.get("status"),
        "orchestration_status": final_state.get("orchestration_status"),
        "coordinator_decision": final_state.get("coordinator_decision"),
        "iteration_count": final_state.get("iteration_count"),
        "blood_group": final_state.get("blood_group"),
        "units_requested": final_state.get("units_requested"),
        "urgency": final_state.get("urgency"),
        "allocations": final_state.get("allocations", []),
        "transport_mode": final_state.get("transport_mode"),
        "donor_strategy": final_state.get("donor_strategy"),
        "confidence_score": final_state.get("confidence_score", 0.0),
        "explanation": final_state.get("explanation"),
        "validation_result": final_state.get("validation_result"),
        "agents_requested": final_state.get("agents_requested", []),
        "agents_completed": final_state.get("agents_completed", []),
        "total_tools_called": len(all_tools_called),
        "tools_called_summary": list(set(all_tools_called)),
        "agent_execution_history": history,
        "errors": final_state.get("errors", []),
        "warnings": final_state.get("warnings", []),
    }
