from abc import ABC, abstractmethod
from typing import Dict, Any, List, Optional, Tuple
import time
import datetime
import uuid
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.orchestration.state import RheonAgentState, AgentExecutionRecord
from app.llm.client import ClaudeClient, get_claude_client, LLMResponse
from app.tools.base import BaseTool
from app.tools.dispatcher import ToolDispatcher, tool_dispatcher, ToolExecutionResult


class AgentMetadata(BaseModel):
    name: str
    role: str
    description: str
    system_prompt: str
    model: str = "claude-3-7-sonnet-20250219"
    tools_count: int = 0
    is_active: bool = True


class BaseAgent(ABC):
    """
    Abstract Base Class for all specialized agents in RHEON AI.
    Enforces 'AGENTS REASON. TOOLS CALCULATE.' by orchestrating deterministic tool calls
    and providing structured reasoning traces.
    """

    def __init__(
        self,
        name: str,
        role: str,
        description: str,
        system_prompt: str,
        client: Optional[ClaudeClient] = None,
        tools: Optional[List[BaseTool]] = None,
        dispatcher: Optional[ToolDispatcher] = None,
    ):
        self.name = name
        self.role = role
        self.description = description
        self.system_prompt = system_prompt
        self.client = client or get_claude_client()
        self.tools = tools or []
        self._tool_map = {t.name: t for t in self.tools}
        self.dispatcher = dispatcher or tool_dispatcher

    def get_tool(self, name: str) -> Optional[BaseTool]:
        """Looks up an associated tool by name."""
        return self._tool_map.get(name)

    def get_anthropic_schemas(self) -> List[Dict[str, Any]]:
        """Returns Anthropic JSON tool definition schemas for all tools accessible by this agent."""
        return [tool.to_anthropic_tool() for tool in self.tools]

    def execute_tool(self, tool_name: str, *args, db: Optional[Session] = None, **kwargs) -> Any:
        """
        Executes a deterministic tool safely.
        Supports both positional arguments and keyword argument dispatching.
        """
        tool = self._tool_map.get(tool_name)
        if not tool:
            # Fallback to global dispatcher
            res = self.dispatcher.dispatch(tool_name=tool_name, arguments=kwargs, db=db)
            if res.success:
                return res.data
            raise ValueError(res.error or f"Tool '{tool_name}' not available to agent '{self.name}'")

        if args:
            # Direct positional execution
            if "db" in kwargs:
                return tool.execute(*args, **kwargs)
            elif db is not None:
                return tool.execute(*args, db=db, **kwargs)
            return tool.execute(*args, **kwargs)

        # Keyword execution via safe dispatcher
        res = self.dispatcher.dispatch(tool_name=tool_name, arguments=kwargs, db=db)
        if res.success:
            return res.data
        elif res.error:
            raise ValueError(res.error)
        return res.data

    def call_llm_with_tools(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        db: Optional[Session] = None,
        max_tool_calls: int = 8,
        temperature: float = 0.2,
    ) -> LLMResponse:
        """
        Invokes Claude with the agent's specific tool schemas in a multi-turn tool-calling loop.
        """
        return self.client.generate_with_tools(
            prompt=prompt,
            system_prompt=system_prompt or self.system_prompt,
            tools=self.get_anthropic_schemas(),
            db=db,
            max_tool_calls=max_tool_calls,
            temperature=temperature,
        )

    def get_metadata(self) -> AgentMetadata:
        """Returns metadata regarding this agent's identity and capabilities."""
        return AgentMetadata(
            name=self.name,
            role=self.role,
            description=self.description,
            system_prompt=self.system_prompt,
            tools_count=len(self.tools),
            is_active=True,
        )

    @abstractmethod
    def run(
        self,
        state: RheonAgentState,
        db: Optional[Session] = None,
    ) -> Tuple[Dict[str, Any], List[str], Optional[str]]:
        """
        Executes the agent's reasoning cycle.
        Returns:
            Tuple of:
            - state_updates (dict of fields to update in RheonAgentState)
            - tools_called (list of tool names invoked during run)
            - reasoning_summary (optional high-level reasoning summary)
        """
        pass

    def __call__(
        self,
        state: RheonAgentState,
        db: Optional[Session] = None,
    ) -> RheonAgentState:
        """
        Wrapper executed within LangGraph nodes. Handles execution recording,
        telemetry, error boundary catching, and state mutation.
        """
        start_time = time.time()
        started_at = datetime.datetime.utcnow().isoformat()
        exec_id = str(uuid.uuid4())
        tools_called = []
        error_msg = None
        status = "COMPLETED"
        reasoning_summary = None
        state_updates = {}

        try:
            state_updates, tools_called, reasoning_summary = self.run(state, db=db)
            # Apply state updates
            for k, v in state_updates.items():
                state[k] = v
        except Exception as e:
            error_msg = str(e)
            status = "FAILED"
            state.setdefault("errors", []).append(f"Agent {self.name} error: {error_msg}")

        end_time = time.time()
        latency_ms = int((end_time - start_time) * 1000)
        completed_at = datetime.datetime.utcnow().isoformat()

        exec_record = AgentExecutionRecord(
            execution_id=exec_id,
            agent_name=self.name,
            state_node=self.role,
            started_at=started_at,
            completed_at=completed_at,
            status=status,
            latency_ms=latency_ms,
            tools_called=tools_called,
            reasoning_summary=reasoning_summary,
            error=error_msg,
            input_summary={
                "request_id": state.get("request_id"),
                "blood_group": state.get("blood_group"),
                "units_requested": state.get("units_requested"),
                "urgency": state.get("urgency"),
            },
            output_summary={
                "updated_keys": list(state_updates.keys()),
                "status": status,
            },
        )

        state.setdefault("agent_execution_history", []).append(exec_record.model_dump())
        return state
