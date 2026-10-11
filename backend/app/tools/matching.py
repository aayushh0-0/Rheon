from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.tools.base import BaseTool
from app.services.matching.engine import SourceMatchingEngine
from app.schemas.matching import MatchingRequest, MatchingResponse, MatchingCandidate


class EvaluateCandidatesTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_evaluate_candidates",
            description="Evaluates, scores, and ranks all potential blood banks and hospital peer sources for a blood request.",
            category="matching",
            parameters_schema={
                "type": "object",
                "properties": {
                    "blood_group": {
                        "type": "string",
                        "description": "Recipient ABO/Rh blood group.",
                    },
                    "units_requested": {
                        "type": "integer",
                        "description": "Number of units requested.",
                    },
                    "component_type": {
                        "type": "string",
                        "enum": ["RBC", "WHOLE_BLOOD", "PLATELETS", "PLASMA", "CRYO"],
                        "description": "Blood component type (default 'RBC').",
                    },
                    "hospital_id": {
                        "type": "string",
                        "description": "Optional recipient hospital ID to look up coordinates.",
                    },
                    "recipient_latitude": {
                        "type": "number",
                        "description": "Optional explicit recipient latitude.",
                    },
                    "recipient_longitude": {
                        "type": "number",
                        "description": "Optional explicit recipient longitude.",
                    },
                    "urgency": {
                        "type": "string",
                        "enum": ["CRITICAL", "URGENT", "ROUTINE"],
                        "description": "Clinical urgency level (default 'CRITICAL').",
                    },
                    "max_eta_minutes": {
                        "type": "integer",
                        "description": "Maximum acceptable delivery time in minutes (default 45).",
                    },
                },
                "required": ["blood_group", "units_requested"],
            },
        )

    def execute(
        self,
        db: Session,
        blood_group: str,
        units_requested: int,
        component_type: str = "RBC",
        hospital_id: Optional[str] = None,
        recipient_latitude: Optional[float] = None,
        recipient_longitude: Optional[float] = None,
        urgency: str = "CRITICAL",
        max_eta_minutes: Optional[int] = 45,
    ) -> Dict[str, Any]:
        req = MatchingRequest(
            hospital_id=hospital_id,
            recipient_latitude=recipient_latitude,
            recipient_longitude=recipient_longitude,
            blood_group=blood_group,
            component_type=component_type,
            units_requested=units_requested,
            urgency=urgency,
            max_eta_minutes=max_eta_minutes,
        )
        response: MatchingResponse = SourceMatchingEngine.evaluate_candidates(db, req)
        return response.model_dump()


class ComputeCandidateScoreTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_compute_candidate_score",
            description="Calculates deterministic composite candidate score based on compatibility, capacity, ETA, and reliability.",
            category="matching",
            parameters_schema={
                "type": "object",
                "properties": {
                    "recipient_group": {"type": "string", "description": "Recipient blood group."},
                    "donor_group": {"type": "string", "description": "Candidate source blood group."},
                    "component_type": {"type": "string", "description": "Blood component type."},
                    "usable_units": {"type": "integer", "description": "Net usable units available."},
                    "units_requested": {"type": "integer", "description": "Total units requested."},
                    "distance_km": {"type": "number", "description": "Distance in kilometers."},
                    "estimated_minutes": {"type": "integer", "description": "Estimated transit time in minutes."},
                    "max_eta_minutes": {"type": "integer", "description": "Maximum allowed ETA minutes (default 45)."},
                    "is_hub": {"type": "boolean", "description": "Whether the facility is a regional hub."},
                    "facility_type": {"type": "string", "enum": ["BLOOD_BANK", "HOSPITAL"], "description": "Facility type."},
                    "is_feasible": {"type": "boolean", "description": "Whether candidate meets minimum feasibility."},
                },
                "required": [
                    "recipient_group",
                    "donor_group",
                    "component_type",
                    "usable_units",
                    "units_requested",
                    "distance_km",
                    "estimated_minutes",
                ],
            },
        )

    def execute(
        self,
        recipient_group: str,
        donor_group: str,
        component_type: str,
        usable_units: int,
        units_requested: int,
        distance_km: float,
        estimated_minutes: int,
        max_eta_minutes: int = 45,
        is_hub: bool = False,
        facility_type: str = "BLOOD_BANK",
        is_feasible: bool = True,
    ) -> float:
        score = SourceMatchingEngine._compute_composite_score(
            recipient_group=recipient_group,
            donor_group=donor_group,
            component_type=component_type,
            usable_units=usable_units,
            units_requested=units_requested,
            distance_km=distance_km,
            estimated_minutes=estimated_minutes,
            max_eta_minutes=max_eta_minutes,
            is_hub=is_hub,
            facility_type=facility_type,
            is_feasible=is_feasible,
        )
        return round(score, 4)
