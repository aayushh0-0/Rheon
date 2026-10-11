from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from app.tools.base import BaseTool
from app.models.donor import Donor
from app.services.compatibility.engine import BloodCompatibilityEngine
from app.services.logistics.haversine import haversine_distance


class FindStandbyDonorsTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_find_standby_donors",
            description="Finds eligible standby emergency donors matching compatible blood groups within distance radius.",
            category="donor",
            parameters_schema={
                "type": "object",
                "properties": {
                    "blood_group": {
                        "type": "string",
                        "description": "Recipient blood group to match compatible donors against.",
                    },
                    "target_lat": {
                        "type": "number",
                        "description": "Target hospital latitude.",
                    },
                    "target_lon": {
                        "type": "number",
                        "description": "Target hospital longitude.",
                    },
                    "component_type": {
                        "type": "string",
                        "enum": ["RBC", "WHOLE_BLOOD", "PLATELETS", "PLASMA", "CRYO"],
                        "description": "Blood component type (default 'RBC').",
                    },
                    "max_radius_km": {
                        "type": "number",
                        "description": "Maximum search radius in km (default 30.0).",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum donors to return (default 10).",
                    },
                },
                "required": ["blood_group", "target_lat", "target_lon"],
            },
        )

    def execute(
        self,
        db: Session,
        blood_group: str,
        target_lat: float,
        target_lon: float,
        component_type: str = "RBC",
        max_radius_km: float = 30.0,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        compatible_groups = BloodCompatibilityEngine.get_compatible_donor_groups(blood_group, component_type)
        donors = (
            db.query(Donor)
            .filter(
                Donor.blood_group.in_(compatible_groups),
                Donor.availability_status.in_(["AVAILABLE_IMMEDIATE", "STANDBY_ON_CALL"]),
            )
            .all()
        )

        results = []
        for donor in donors:
            dist = haversine_distance(target_lat, target_lon, donor.latitude, donor.longitude)
            if dist <= max_radius_km:
                results.append({
                    "anonymous_id": donor.anonymous_id,
                    "blood_group": donor.blood_group,
                    "location": donor.location,
                    "distance_km": dist,
                    "availability_status": donor.availability_status,
                    "is_exact_match": (donor.blood_group == blood_group),
                })

        # Sort by exact match first, then by distance ascending
        results.sort(key=lambda d: (not d["is_exact_match"], d["distance_km"]))
        return results[:limit]


class CheckDonorAvailabilityTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_check_donor_availability",
            description="Queries donor count and availability breakdown for specific blood group.",
            category="donor",
            parameters_schema={
                "type": "object",
                "properties": {
                    "blood_group": {
                        "type": "string",
                        "description": "Blood group to check donor pool for.",
                    },
                },
                "required": ["blood_group"],
            },
        )

    def execute(self, db: Session, blood_group: str) -> Dict[str, Any]:
        donors = db.query(Donor).filter(Donor.blood_group == blood_group).all()
        available_immediate = sum(1 for d in donors if d.availability_status == "AVAILABLE_IMMEDIATE")
        standby_on_call = sum(1 for d in donors if d.availability_status == "STANDBY_ON_CALL")
        busy = sum(1 for d in donors if d.availability_status == "BUSY")

        return {
            "blood_group": blood_group,
            "total_donors": len(donors),
            "available_immediate": available_immediate,
            "standby_on_call": standby_on_call,
            "busy": busy,
        }
