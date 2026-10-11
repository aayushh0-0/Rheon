import time
import json
import inspect
import logging
from typing import Any, Dict, List, Optional, Union
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.tools.base import BaseTool
from app.tools.registry import tool_registry, ToolRegistry

logger = logging.getLogger(__name__)


class ToolExecutionResult(BaseModel):
    """
    Standardized execution envelope for deterministic tool calls.
    Guarantees consistent reporting of execution status, payload, error containment, and timing.
    """
    success: bool
    tool: str
    data: Any = None
    error: Optional[str] = None
    execution_time_ms: int = 0


class ToolDispatcher:
    """
    Safe execution dispatcher for deterministic tools in RHEON AI.
    Handles tool discovery, parameter inspection, DB session injection,
    argument mapping, error containment, and execution timing.
    """

    def __init__(self, registry: Optional[ToolRegistry] = None):
        self.registry = registry or tool_registry

    def dispatch(
        self,
        tool_name: str,
        arguments: Optional[Dict[str, Any]] = None,
        db: Optional[Session] = None,
    ) -> ToolExecutionResult:
        """
        Safely executes a single tool by name with provided arguments and optional DB session.
        Returns a standardized ToolExecutionResult.
        """
        start_time = time.perf_counter()
        args = arguments or {}

        # 1. Lookup tool in registry
        tool: Optional[BaseTool] = self.registry.get(tool_name)
        if not tool:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            return ToolExecutionResult(
                success=False,
                tool=tool_name,
                data=None,
                error=f"Tool '{tool_name}' is not registered in the system.",
                execution_time_ms=elapsed_ms,
            )

        # 2. Inspect signature and prepare keyword arguments
        try:
            sig = inspect.signature(tool.execute)
            call_kwargs: Dict[str, Any] = {}

            for param_name, param in sig.parameters.items():
                if param_name == "db":
                    if db is not None:
                        call_kwargs["db"] = db
                    elif "db" in args:
                        call_kwargs["db"] = args["db"]
                    elif param.default == inspect.Parameter.empty:
                        # db required but not provided
                        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                        return ToolExecutionResult(
                            success=False,
                            tool=tool_name,
                            data=None,
                            error=f"Database session required for tool '{tool_name}' but not available.",
                            execution_time_ms=elapsed_ms,
                        )
                elif param_name in args:
                    call_kwargs[param_name] = args[param_name]
                elif param.default != inspect.Parameter.empty:
                    # Optional parameter with default
                    continue
                else:
                    # Missing required parameter
                    elapsed_ms = int((time.perf_counter() - start_time) * 1000)
                    return ToolExecutionResult(
                        success=False,
                        tool=tool_name,
                        data=None,
                        error=f"Missing required argument '{param_name}' for tool '{tool_name}'.",
                        execution_time_ms=elapsed_ms,
                    )

            # Pass any extra kwargs if the method accepts **kwargs
            has_var_keyword = any(
                p.kind == inspect.Parameter.VAR_KEYWORD for p in sig.parameters.values()
            )
            if has_var_keyword:
                for k, v in args.items():
                    if k not in call_kwargs:
                        call_kwargs[k] = v

            # 3. Execute tool deterministically
            result_data = tool.execute(**call_kwargs)
            elapsed_ms = max(1, int((time.perf_counter() - start_time) * 1000))

            return ToolExecutionResult(
                success=True,
                tool=tool_name,
                data=result_data,
                error=None,
                execution_time_ms=elapsed_ms,
            )

        except TypeError as te:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.warning(f"Parameter validation failed for tool {tool_name}: {te}")
            return ToolExecutionResult(
                success=False,
                tool=tool_name,
                data=None,
                error=f"Invalid arguments for tool '{tool_name}': {str(te)}",
                execution_time_ms=elapsed_ms,
            )
        except Exception as e:
            elapsed_ms = int((time.perf_counter() - start_time) * 1000)
            logger.error(f"Execution error in tool {tool_name}: {e}", exc_info=True)
            return ToolExecutionResult(
                success=False,
                tool=tool_name,
                data=None,
                error=f"Tool execution error: {str(e)}",
                execution_time_ms=elapsed_ms,
            )

    def dispatch_batch(
        self,
        tool_calls: List[Dict[str, Any]],
        db: Optional[Session] = None,
    ) -> List[ToolExecutionResult]:
        """
        Executes a sequence of tool calls safely.
        tool_calls format: [{"name": "tool_name", "arguments": {...}}, ...]
        """
        results = []
        for call in tool_calls:
            name = call.get("name") or call.get("tool") or ""
            args = call.get("arguments") or call.get("input") or {}
            res = self.dispatch(tool_name=name, arguments=args, db=db)
            results.append(res)
        return results

    def format_anthropic_tool_result(
        self,
        tool_use_id: str,
        result: ToolExecutionResult,
    ) -> Dict[str, Any]:
        """
        Converts a ToolExecutionResult into an Anthropic API tool_result content block.
        """
        content_dict = {
            "success": result.success,
            "tool": result.tool,
            "data": result.data,
            "error": result.error,
            "execution_time_ms": result.execution_time_ms,
        }
        return {
            "type": "tool_result",
            "tool_use_id": tool_use_id,
            "content": json.dumps(content_dict, default=str),
            "is_error": not result.success,
        }


# Global tool dispatcher instance
tool_dispatcher = ToolDispatcher()
