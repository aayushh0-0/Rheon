from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, Callable
from pydantic import BaseModel, Field


class ToolMetadata(BaseModel):
    name: str
    description: str
    category: str  # compatibility, inventory, matching, logistics, planning, validation, donor
    parameters_schema: Optional[Dict[str, Any]] = None
    is_deterministic: bool = True


class BaseTool(ABC):
    """
    Abstract Base Class for all Deterministic Tools in RHEON AI.
    Tools perform pure calculations, DB queries, or deterministic algorithms without LLM inference.
    """

    def __init__(
        self,
        name: str,
        description: str,
        category: str,
        parameters_schema: Optional[Dict[str, Any]] = None,
    ):
        self.name = name
        self.description = description
        self.category = category
        self.parameters_schema = parameters_schema or {
            "type": "object",
            "properties": {},
            "required": [],
        }

    @abstractmethod
    def execute(self, *args, **kwargs) -> Any:
        """Executes the deterministic tool logic."""
        pass

    def __call__(self, *args, **kwargs) -> Any:
        return self.execute(*args, **kwargs)

    def get_metadata(self) -> ToolMetadata:
        return ToolMetadata(
            name=self.name,
            description=self.description,
            category=self.category,
            parameters_schema=self.parameters_schema,
            is_deterministic=True,
        )

    def to_anthropic_tool(self) -> Dict[str, Any]:
        """
        Formats the tool as a standard Anthropic tool definition for Claude API.
        """
        return {
            "name": self.name,
            "description": self.description,
            "input_schema": self.parameters_schema,
        }
