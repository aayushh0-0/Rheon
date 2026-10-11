import time
import json
import logging
import uuid
from typing import Optional, Dict, Any, List, Union
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.tools.dispatcher import tool_dispatcher, ToolExecutionResult, ToolDispatcher

logger = logging.getLogger("rheon.llm")


class LLMUsage(BaseModel):
    input_tokens: int = 0
    output_tokens: int = 0
    total_tokens: int = 0


class ToolCallRecord(BaseModel):
    id: str
    tool: str
    arguments: Dict[str, Any] = Field(default_factory=dict)
    result: Optional[ToolExecutionResult] = None


class LLMResponse(BaseModel):
    content: str = ""
    structured_data: Optional[Dict[str, Any]] = None
    model: str = ""
    latency_ms: int = 0
    usage: LLMUsage = Field(default_factory=LLMUsage)
    success: bool = True
    error: Optional[str] = None
    is_mock: bool = False
    tool_calls: List[ToolCallRecord] = Field(default_factory=list)
    iteration_count: int = 0
    stop_reason: Optional[str] = None


class ClaudeClient:
    """
    Anthropic Claude LLM Client abstraction.
    Supports real Anthropic API communication with multi-turn tool-calling loops,
    token usage tracking, and deterministic offline mock execution when ANTHROPIC_API_KEY is not configured.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        default_model: Optional[str] = None,
        timeout: int = 30,
        dispatcher: Optional[ToolDispatcher] = None,
    ):
        self.api_key = api_key or settings.ANTHROPIC_API_KEY
        self.default_model = default_model or settings.ANTHROPIC_MODEL
        self.timeout = timeout or settings.AGENT_TIMEOUT_SECONDS
        self.dispatcher = dispatcher or tool_dispatcher
        self._client = None
        self._initialized = False

    @property
    def is_configured(self) -> bool:
        """Returns whether a non-empty API key is present."""
        return bool(self.api_key and self.api_key.strip())

    def _get_client(self):
        """Lazy-initializes the official Anthropic client."""
        if not self._initialized:
            if self.is_configured:
                try:
                    import anthropic
                    self._client = anthropic.Anthropic(
                        api_key=self.api_key,
                        timeout=self.timeout,
                    )
                except Exception as e:
                    logger.warning(f"Failed to initialize Anthropic client: {e}. Falling back to offline mode.")
                    self._client = None
            self._initialized = True
        return self._client

    def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        model: Optional[str] = None,
        max_tokens: int = 1024,
        temperature: float = 0.2,
        json_mode: bool = False,
    ) -> LLMResponse:
        """
        Executes a prompt completion with Claude.
        If the API key is not configured, returns a deterministic structured mock response.
        """
        start_time = time.time()
        active_model = model or self.default_model

        if not self.is_configured or self._get_client() is None:
            latency_ms = int((time.time() - start_time) * 1000)
            mock_content = self._generate_mock_response(prompt, system_prompt, json_mode)
            structured_data = None
            if json_mode:
                try:
                    structured_data = json.loads(mock_content)
                except json.JSONDecodeError:
                    structured_data = {"raw": mock_content}

            return LLMResponse(
                content=mock_content,
                structured_data=structured_data,
                model=f"{active_model}-mock",
                latency_ms=latency_ms,
                usage=LLMUsage(
                    input_tokens=len(prompt.split()),
                    output_tokens=len(mock_content.split()),
                    total_tokens=len(prompt.split()) + len(mock_content.split()),
                ),
                success=True,
                is_mock=True,
            )

        try:
            client = self._get_client()
            messages = [{"role": "user", "content": prompt}]
            kwargs: Dict[str, Any] = {
                "model": active_model,
                "max_tokens": max_tokens,
                "temperature": temperature,
                "messages": messages,
            }
            if system_prompt:
                kwargs["system"] = system_prompt

            response = client.messages.create(**kwargs)
            latency_ms = int((time.time() - start_time) * 1000)

            content_text = ""
            if response.content:
                for block in response.content:
                    if hasattr(block, "text"):
                        content_text += block.text

            structured_data = None
            if json_mode:
                try:
                    cleaned = content_text.strip()
                    if cleaned.startswith("```json"):
                        cleaned = cleaned[7:]
                    if cleaned.startswith("```"):
                        cleaned = cleaned[3:]
                    if cleaned.endswith("```"):
                        cleaned = cleaned[:-3]
                    structured_data = json.loads(cleaned.strip())
                except Exception as parse_err:
                    logger.warning(f"Failed to parse JSON from Claude response: {parse_err}")
                    structured_data = {"raw": content_text, "error": str(parse_err)}

            input_tokens = getattr(response.usage, "input_tokens", 0)
            output_tokens = getattr(response.usage, "output_tokens", 0)

            return LLMResponse(
                content=content_text,
                structured_data=structured_data,
                model=response.model,
                latency_ms=latency_ms,
                usage=LLMUsage(
                    input_tokens=input_tokens,
                    output_tokens=output_tokens,
                    total_tokens=input_tokens + output_tokens,
                ),
                success=True,
                is_mock=False,
                stop_reason=response.stop_reason,
            )

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Anthropic API call error: {e}")
            return LLMResponse(
                content="",
                model=active_model,
                latency_ms=latency_ms,
                success=False,
                error=str(e),
                is_mock=False,
            )

    def generate_with_tools(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        tools: Optional[List[Dict[str, Any]]] = None,
        db: Optional[Session] = None,
        max_tool_calls: int = 8,
        model: Optional[str] = None,
        max_tokens: int = 2048,
        temperature: float = 0.2,
    ) -> LLMResponse:
        """
        Executes an agentic tool-calling multi-turn loop with Claude.
        Handles tool invocation requests (stop_reason == 'tool_use'), executes deterministic tools
        via the dispatcher, injects DB session, and returns final reasoned response.
        If offline/unconfigured, runs deterministic offline mock simulation.
        """
        start_time = time.time()
        active_model = model or self.default_model
        tool_schemas = tools or []
        limit_calls = max_tool_calls or settings.RHEON_MAX_TOOL_CALLS

        if not self.is_configured or self._get_client() is None:
            # Deterministic Offline Mock Execution
            return self._run_mock_tool_loop(
                prompt=prompt,
                system_prompt=system_prompt,
                tools=tool_schemas,
                db=db,
                active_model=active_model,
                start_time=start_time,
                max_tool_calls=limit_calls,
            )

        # Live Anthropic API multi-turn tool interaction loop
        try:
            client = self._get_client()
            messages: List[Dict[str, Any]] = [{"role": "user", "content": prompt}]
            accumulated_tool_calls: List[ToolCallRecord] = []
            total_input_tokens = 0
            total_output_tokens = 0
            iterations = 0
            final_text = ""
            final_stop_reason = None

            while iterations < limit_calls:
                iterations += 1
                kwargs: Dict[str, Any] = {
                    "model": active_model,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                    "messages": messages,
                }
                if system_prompt:
                    kwargs["system"] = system_prompt
                if tool_schemas:
                    kwargs["tools"] = tool_schemas

                response = client.messages.create(**kwargs)
                total_input_tokens += getattr(response.usage, "input_tokens", 0)
                total_output_tokens += getattr(response.usage, "output_tokens", 0)
                final_stop_reason = response.stop_reason

                # Extract text content if present
                for block in response.content:
                    if hasattr(block, "text"):
                        final_text += block.text

                if response.stop_reason != "tool_use":
                    break

                # Add assistant message to history
                messages.append({"role": "assistant", "content": response.content})

                # Process all requested tool uses
                tool_results_content: List[Dict[str, Any]] = []
                for block in response.content:
                    if getattr(block, "type", None) == "tool_use":
                        tool_id = block.id
                        tool_name = block.name
                        tool_input = block.input or {}

                        # Execute tool safely via dispatcher
                        exec_res = self.dispatcher.dispatch(
                            tool_name=tool_name,
                            arguments=tool_input,
                            db=db,
                        )

                        accumulated_tool_calls.append(
                            ToolCallRecord(
                                id=tool_id,
                                tool=tool_name,
                                arguments=tool_input,
                                result=exec_res,
                            )
                        )

                        # Format Anthropic tool_result block
                        tool_results_content.append(
                            self.dispatcher.format_anthropic_tool_result(
                                tool_use_id=tool_id,
                                result=exec_res,
                            )
                        )

                # Send tool results back to Claude
                if tool_results_content:
                    messages.append({"role": "user", "content": tool_results_content})
                else:
                    break

            latency_ms = int((time.time() - start_time) * 1000)
            return LLMResponse(
                content=final_text,
                model=active_model,
                latency_ms=latency_ms,
                usage=LLMUsage(
                    input_tokens=total_input_tokens,
                    output_tokens=total_output_tokens,
                    total_tokens=total_input_tokens + total_output_tokens,
                ),
                success=True,
                is_mock=False,
                tool_calls=accumulated_tool_calls,
                iteration_count=iterations,
                stop_reason=final_stop_reason,
            )

        except Exception as e:
            latency_ms = int((time.time() - start_time) * 1000)
            logger.error(f"Error in Claude tool-calling loop: {e}", exc_info=True)
            return LLMResponse(
                content="",
                model=active_model,
                latency_ms=latency_ms,
                success=False,
                error=str(e),
                is_mock=False,
                iteration_count=0,
            )

    def _run_mock_tool_loop(
        self,
        prompt: str,
        system_prompt: Optional[str],
        tools: List[Dict[str, Any]],
        db: Optional[Session],
        active_model: str,
        start_time: float,
        max_tool_calls: int = 8,
    ) -> LLMResponse:
        """
        Executes a deterministic mock tool loop for offline testing and development.
        Executes real registered tools through the dispatcher with realistic inputs.
        """
        tool_names = [t.get("name") for t in tools if isinstance(t, dict)]
        executed_records: List[ToolCallRecord] = []
        prompt_lower = prompt.lower()

        # 1. Select appropriate deterministic tools based on context
        candidates_to_call = []
        if "tool_check_blood_compatibility" in tool_names or "compatibility" in prompt_lower:
            candidates_to_call.append((
                "tool_check_blood_compatibility",
                {"recipient_group": "A+", "donor_group": "O-", "component_type": "RBC"},
            ))
            if "tool_get_compatible_blood_groups" in tool_names:
                candidates_to_call.append((
                    "tool_get_compatible_blood_groups",
                    {"recipient_group": "O-", "component_type": "RBC"},
                ))

        if "tool_calculate_usable_stock" in tool_names or "inventory" in prompt_lower or "usable" in prompt_lower:
            candidates_to_call.append((
                "tool_calculate_usable_stock",
                {"available_units": 15, "safety_reserve_units": 10},
            ))

        if "tool_calculate_distance" in tool_names or "logistics" in prompt_lower or "distance" in prompt_lower:
            candidates_to_call.append((
                "tool_calculate_distance",
                {"lat1": 28.6139, "lon1": 77.2090, "lat2": 28.4595, "lon2": 77.0266},
            ))

        if "tool_select_transport_mode" in tool_names:
            candidates_to_call.append((
                "tool_select_transport_mode",
                {"urgency": "CRITICAL", "distance_km": 12.5, "allow_drone": True},
            ))

        if "tool_evaluate_candidates" in tool_names or "matching" in prompt_lower:
            candidates_to_call.append((
                "tool_evaluate_candidates",
                {"blood_group": "O-", "units_requested": 2, "component_type": "RBC", "urgency": "CRITICAL"},
            ))

        if "tool_validate_plan" in tool_names or "validation" in prompt_lower:
            candidates_to_call.append((
                "tool_validate_plan",
                {
                    "recipient_blood_group": "O-",
                    "units_requested": 2,
                    "allocations": [],
                    "component_type": "RBC",
                    "total_allocated_declared": 0,
                    "unmet_declared": 2,
                },
            ))

        if "tool_check_donor_availability" in tool_names or "donor" in prompt_lower:
            candidates_to_call.append((
                "tool_check_donor_availability",
                {"blood_group": "O-"},
            ))

        # Fallback if none matched
        if not candidates_to_call and tool_names:
            first_name = tool_names[0]
            candidates_to_call.append((first_name, {}))

        # 2. Execute selected tools via dispatcher (up to max_tool_calls limit)
        for name, args in candidates_to_call[:max_tool_calls]:
            call_id = f"toolu_{uuid.uuid4().hex[:8]}"
            res = self.dispatcher.dispatch(tool_name=name, arguments=args, db=db)
            executed_records.append(
                ToolCallRecord(
                    id=call_id,
                    tool=name,
                    arguments=args,
                    result=res,
                )
            )

        latency_ms = max(1, int((time.time() - start_time) * 1000))
        tool_summary_lines = [
            f"- Tool '{r.tool}' returned success={r.result.success} (execution time: {r.result.execution_time_ms}ms)"
            for r in executed_records
        ]
        summary_str = "\n".join(tool_summary_lines)

        synthesis_text = (
            f"RHEON Agent Deterministic Synthesis (Offline Simulation):\n"
            f"Invoked {len(executed_records)} deterministic tool(s) safely:\n"
            f"{summary_str}\n"
            f"Reasoning: Verified medical compatibility and reserve conservation constraints deterministically."
        )

        return LLMResponse(
            content=synthesis_text,
            model=f"{active_model}-mock",
            latency_ms=latency_ms,
            usage=LLMUsage(
                input_tokens=120,
                output_tokens=80,
                total_tokens=200,
            ),
            success=True,
            is_mock=True,
            tool_calls=executed_records,
            iteration_count=len(executed_records),
            stop_reason="end_turn",
        )

    def _generate_mock_response(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        json_mode: bool = False,
    ) -> str:
        """Generates realistic structured mock responses for offline development and CI."""
        if json_mode:
            return json.dumps({
                "status": "PROPOSED",
                "reasoning_summary": "Offline mock reasoning: Deterministic tools evaluated feasibility, reserve floors, and optimal routing.",
                "confidence_score": 0.95,
                "strategy": "OPTIMAL_MULTI_SOURCE",
                "notes": "Generated in offline/development mode (ANTHROPIC_API_KEY not configured)."
            }, indent=2)
        return "RHEON AI Multi-Agent Coordinator: Evaluated candidate blood sources, enforced statutory safety reserves, and optimized multimodal transit corridors."


# Default singleton instance
claude_client = ClaudeClient()


def get_claude_client() -> ClaudeClient:
    return claude_client
