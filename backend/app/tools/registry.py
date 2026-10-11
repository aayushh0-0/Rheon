from typing import Dict, List, Optional, Any
from app.tools.base import BaseTool, ToolMetadata
from app.tools.compatibility import (
    GetCompatibleBloodGroupsTool,
    CheckBloodCompatibilityTool,
    GetCompatibilityScoreTool,
)
from app.tools.inventory import (
    CalculateUsableStockTool,
    ValidateAllocationTool,
    GetFacilityInventoryTool,
    GetNetworkStockSummaryTool,
)
from app.tools.matching import (
    EvaluateCandidatesTool,
    ComputeCandidateScoreTool,
)
from app.tools.logistics import (
    CalculateDistanceTool,
    SelectTransportModeTool,
    EstimateTravelTimeTool,
    ComputeLogisticsTool,
)
from app.tools.planning import (
    GenerateEmergencyPlanTool,
    ReplanEmergencyPlanTool,
    AnalyzePlanImpactTool,
    ComputePlanDiffTool,
    CalculatePlanConfidenceTool,
)
from app.tools.validation import (
    ValidatePlanTool,
)
from app.tools.donor import (
    FindStandbyDonorsTool,
    CheckDonorAvailabilityTool,
)


class ToolRegistry:
    """
    Central registry for all deterministic tools in the RHEON Agentic system.
    Provides lookup, category filtering, agent role association, and schema introspection.
    """

    def __init__(self):
        self._tools: Dict[str, BaseTool] = {}
        self._register_default_tools()

    def register(self, tool: BaseTool) -> None:
        """Registers a tool instance."""
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[BaseTool]:
        """Returns a tool by name, or None if not found."""
        return self._tools.get(name)

    def list_tools(self) -> List[ToolMetadata]:
        """Returns metadata list of all registered tools."""
        return [tool.get_metadata() for tool in self._tools.values()]

    def get_by_category(self, category: str) -> List[BaseTool]:
        """Filters tools by category."""
        return [tool for tool in self._tools.values() if tool.category == category]

    def get_tools_for_agent(self, agent_role: str) -> List[BaseTool]:
        """
        Returns the subset of deterministic tools pertinent to a given agent role.
        """
        role_map = {
            "coordinator": list(self._tools.values()),
            "inventory": self.get_by_category("inventory") + self.get_by_category("compatibility"),
            "demand": self.get_by_category("inventory") + self.get_by_category("matching"),
            "matching": self.get_by_category("matching") + self.get_by_category("compatibility") + self.get_by_category("logistics") + self.get_by_category("inventory"),
            "logistics": self.get_by_category("logistics"),
            "donor": self.get_by_category("donor") + self.get_by_category("compatibility"),
            "explainability": self.get_by_category("validation") + self.get_by_category("planning"),
        }
        return role_map.get(agent_role.lower(), list(self._tools.values()))

    def get_anthropic_schemas(self, agent_role: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Returns a list of Anthropic-formatted tool definition dictionaries.
        If agent_role is provided, filters to that role's tool set.
        """
        if agent_role:
            tools = self.get_tools_for_agent(agent_role)
        else:
            tools = list(self._tools.values())
        return [tool.to_anthropic_tool() for tool in tools]

    def _register_default_tools(self) -> None:
        """Instantiates and registers all standard deterministic tools."""
        default_tools = [
            GetCompatibleBloodGroupsTool(),
            CheckBloodCompatibilityTool(),
            GetCompatibilityScoreTool(),
            CalculateUsableStockTool(),
            ValidateAllocationTool(),
            GetFacilityInventoryTool(),
            GetNetworkStockSummaryTool(),
            EvaluateCandidatesTool(),
            ComputeCandidateScoreTool(),
            CalculateDistanceTool(),
            SelectTransportModeTool(),
            EstimateTravelTimeTool(),
            ComputeLogisticsTool(),
            GenerateEmergencyPlanTool(),
            ReplanEmergencyPlanTool(),
            AnalyzePlanImpactTool(),
            ComputePlanDiffTool(),
            CalculatePlanConfidenceTool(),
            ValidatePlanTool(),
            FindStandbyDonorsTool(),
            CheckDonorAvailabilityTool(),
        ]
        for tool in default_tools:
            self.register(tool)


# Singleton tool registry instance
tool_registry = ToolRegistry()
