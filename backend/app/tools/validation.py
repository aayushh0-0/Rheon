from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.tools.base import BaseTool
from app.services.planning.validator import PlanValidator
from app.schemas.validation import PlanValidationRequest, PlanValidationResponse


class ValidatePlanTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_validate_plan",
            description="Executes 6-point deterministic safety validation on an allocation plan (compatibility, conservation, reserve protection, source status, logistics validity, mathematical consistency).",
            category="validation",
            parameters_schema={
                "type": "object",
                "properties": {
                    "recipient_blood_group": {
                        "type": "string",
                        "description": "Recipient ABO/Rh blood group.",
                    },
                    "units_requested": {
                        "type": "integer",
                        "description": "Total units requested.",
                    },
                    "allocations": {
                        "type": "array",
                        "items": {"type": "object"},
                        "description": "List of allocation items to validate.",
                    },
                    "component_type": {
                        "type": "string",
                        "enum": ["RBC", "WHOLE_BLOOD", "PLATELETS", "PLASMA", "CRYO"],
                        "description": "Blood component type (default 'RBC').",
                    },
                    "plan_id": {
                        "type": "string",
                        "description": "Optional plan ID.",
                    },
                    "recipient_hospital_id": {
                        "type": "string",
                        "description": "Optional recipient hospital identifier.",
                    },
                    "total_allocated_declared": {
                        "type": "integer",
                        "description": "Declared allocated units for conservation check.",
                    },
                    "unmet_declared": {
                        "type": "integer",
                        "description": "Declared unmet units.",
                    },
                },
                "required": ["recipient_blood_group", "units_requested", "allocations"],
            },
        )

    def execute(
        self,
        db: Session,
        recipient_blood_group: str,
        units_requested: int,
        allocations: List[Dict[str, Any]],
        component_type: str = "RBC",
        plan_id: Optional[str] = None,
        recipient_hospital_id: str = "",
        total_allocated_declared: Optional[int] = None,
        unmet_declared: Optional[int] = None,
    ) -> Dict[str, Any]:
        req = PlanValidationRequest(
            plan_id=plan_id,
            recipient_hospital_id=recipient_hospital_id,
            recipient_blood_group=recipient_blood_group,
            component_type=component_type,
            units_requested=units_requested,
            allocations=allocations,
        )
        resp: PlanValidationResponse = PlanValidator.validate_plan(
            db=db,
            request=req,
            total_allocated_declared=total_allocated_declared,
            unmet_declared=unmet_declared,
        )
        return resp.model_dump()
