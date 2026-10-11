from typing import List, Dict, Any
from app.tools.base import BaseTool
from app.services.compatibility.engine import BloodCompatibilityEngine


class GetCompatibleBloodGroupsTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_get_compatible_blood_groups",
            description="Returns list of medically compatible donor blood groups for a given recipient group and component type.",
            category="compatibility",
            parameters_schema={
                "type": "object",
                "properties": {
                    "recipient_group": {
                        "type": "string",
                        "description": "Recipient ABO/Rh blood group (e.g., 'O-', 'A+', 'B+').",
                    },
                    "component_type": {
                        "type": "string",
                        "enum": ["RBC", "WHOLE_BLOOD", "PLATELETS", "PLASMA", "CRYO"],
                        "description": "Blood component type (default 'RBC').",
                    },
                },
                "required": ["recipient_group"],
            },
        )

    def execute(self, recipient_group: str, component_type: str = "RBC") -> List[str]:
        return BloodCompatibilityEngine.get_compatible_donor_groups(recipient_group, component_type)


class CheckBloodCompatibilityTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_check_blood_compatibility",
            description="Deterministically validates whether a donor blood group is safe for a recipient.",
            category="compatibility",
            parameters_schema={
                "type": "object",
                "properties": {
                    "recipient_group": {
                        "type": "string",
                        "description": "Recipient ABO/Rh blood group (e.g., 'A+').",
                    },
                    "donor_group": {
                        "type": "string",
                        "description": "Donor ABO/Rh blood group (e.g., 'O-').",
                    },
                    "component_type": {
                        "type": "string",
                        "enum": ["RBC", "WHOLE_BLOOD", "PLATELETS", "PLASMA", "CRYO"],
                        "description": "Blood component type (default 'RBC').",
                    },
                },
                "required": ["recipient_group", "donor_group"],
            },
        )

    def execute(self, recipient_group: str, donor_group: str, component_type: str = "RBC") -> bool:
        return BloodCompatibilityEngine.is_compatible(recipient_group, donor_group, component_type)


class GetCompatibilityScoreTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_get_compatibility_score",
            description="Returns medical compatibility score (1.0 = exact match, 0.7-0.8 = compatible substitute, 0.0 = incompatible).",
            category="compatibility",
            parameters_schema={
                "type": "object",
                "properties": {
                    "recipient_group": {
                        "type": "string",
                        "description": "Recipient ABO/Rh blood group.",
                    },
                    "donor_group": {
                        "type": "string",
                        "description": "Donor ABO/Rh blood group.",
                    },
                    "component_type": {
                        "type": "string",
                        "enum": ["RBC", "WHOLE_BLOOD", "PLATELETS", "PLASMA", "CRYO"],
                        "description": "Blood component type (default 'RBC').",
                    },
                },
                "required": ["recipient_group", "donor_group"],
            },
        )

    def execute(self, recipient_group: str, donor_group: str, component_type: str = "RBC") -> float:
        return BloodCompatibilityEngine.get_compatibility_score(recipient_group, donor_group, component_type)
