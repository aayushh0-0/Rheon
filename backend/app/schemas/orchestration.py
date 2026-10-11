from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class OrchestrationStatus(str, Enum):
    INITIALIZING = "INITIALIZING"
    ANALYZING = "ANALYZING"
    WAITING_FOR_AGENT = "WAITING_FOR_AGENT"
    EVALUATING = "EVALUATING"
    PLANNING = "PLANNING"
    VALIDATING = "VALIDATING"
    EXPLAINING = "EXPLAINING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class CoordinatorDecision(BaseModel):
    next_agent: str
    reason: str
    priority: str = "HIGH"
    workflow_status: str = "ANALYZING"
    confidence: float = 1.0
    completed_agents: List[str] = Field(default_factory=list)
    remaining_agents: List[str] = Field(default_factory=list)
    required_actions: List[str] = Field(default_factory=list)
    is_terminal: bool = False
