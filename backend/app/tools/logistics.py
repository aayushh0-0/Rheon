from typing import Dict, Any, Optional
from app.tools.base import BaseTool
from app.services.logistics.engine import LogisticsEngine
from app.schemas.enums import TransportMode, UrgencyLevel


class CalculateDistanceTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_calculate_distance",
            description="Calculates Great-Circle Haversine distance in kilometers between two GPS coordinates.",
            category="logistics",
            parameters_schema={
                "type": "object",
                "properties": {
                    "lat1": {"type": "number", "description": "Origin latitude in degrees."},
                    "lon1": {"type": "number", "description": "Origin longitude in degrees."},
                    "lat2": {"type": "number", "description": "Destination latitude in degrees."},
                    "lon2": {"type": "number", "description": "Destination longitude in degrees."},
                },
                "required": ["lat1", "lon1", "lat2", "lon2"],
            },
        )

    def execute(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        return LogisticsEngine.calculate_distance(lat1, lon1, lat2, lon2)


class SelectTransportModeTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_select_transport_mode",
            description="Selects the optimal transport mode (AMBULANCE_SIREN, DRONE, STANDARD_COURIER) based on clinical urgency and distance range.",
            category="logistics",
            parameters_schema={
                "type": "object",
                "properties": {
                    "urgency": {
                        "type": "string",
                        "enum": ["CRITICAL", "URGENT", "ROUTINE"],
                        "description": "Clinical urgency level.",
                    },
                    "distance_km": {
                        "type": "number",
                        "description": "Distance between origin and destination in km.",
                    },
                    "max_eta_minutes": {
                        "type": "integer",
                        "description": "Optional deadline in minutes.",
                    },
                    "allow_drone": {
                        "type": "boolean",
                        "description": "Whether drone transport is permitted (default True).",
                    },
                },
                "required": ["urgency", "distance_km"],
            },
        )

    def execute(
        self,
        urgency: str,
        distance_km: float,
        max_eta_minutes: Optional[int] = None,
        allow_drone: bool = True,
    ) -> str:
        return LogisticsEngine.select_transport_mode(
            urgency=urgency,
            distance_km=distance_km,
            max_eta_minutes=max_eta_minutes,
            allow_drone=allow_drone,
        )


class EstimateTravelTimeTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_estimate_travel_time",
            description="Estimates transit time in minutes given distance, transport mode, and road traffic multiplier.",
            category="logistics",
            parameters_schema={
                "type": "object",
                "properties": {
                    "distance_km": {
                        "type": "number",
                        "description": "Travel distance in kilometers.",
                    },
                    "transport_mode": {
                        "type": "string",
                        "enum": ["AMBULANCE_SIREN", "DRONE", "STANDARD_COURIER"],
                        "description": "Selected transport mode (default 'STANDARD_COURIER').",
                    },
                    "traffic_factor": {
                        "type": "number",
                        "description": "Traffic delay multiplier (1.0 = clear, >1.0 = congested, default 1.0).",
                    },
                },
                "required": ["distance_km"],
            },
        )

    def execute(
        self,
        distance_km: float,
        transport_mode: str = "STANDARD_COURIER",
        traffic_factor: float = 1.0,
    ) -> int:
        return LogisticsEngine.estimate_travel_time(
            distance_km=distance_km,
            transport_mode=transport_mode,
            traffic_factor=traffic_factor,
        )


class ComputeLogisticsTool(BaseTool):
    def __init__(self):
        super().__init__(
            name="tool_compute_logistics",
            description="Computes full logistics package including Haversine distance, optimal transport mode, and realistic ETA.",
            category="logistics",
            parameters_schema={
                "type": "object",
                "properties": {
                    "origin_lat": {"type": "number", "description": "Origin latitude."},
                    "origin_lon": {"type": "number", "description": "Origin longitude."},
                    "dest_lat": {"type": "number", "description": "Destination latitude."},
                    "dest_lon": {"type": "number", "description": "Destination longitude."},
                    "urgency": {
                        "type": "string",
                        "enum": ["CRITICAL", "URGENT", "ROUTINE"],
                        "description": "Clinical urgency (default 'URGENT').",
                    },
                    "traffic_factor": {
                        "type": "number",
                        "description": "Traffic multiplier (default 1.0).",
                    },
                    "allow_drone": {
                        "type": "boolean",
                        "description": "Whether drone transit is allowed (default True).",
                    },
                },
                "required": ["origin_lat", "origin_lon", "dest_lat", "dest_lon"],
            },
        )

    def execute(
        self,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        urgency: str = "URGENT",
        traffic_factor: float = 1.0,
        allow_drone: bool = True,
    ) -> Dict[str, Any]:
        return LogisticsEngine.compute_logistics(
            origin_lat=origin_lat,
            origin_lon=origin_lon,
            dest_lat=dest_lat,
            dest_lon=dest_lon,
            urgency=urgency,
            traffic_factor=traffic_factor,
            allow_drone=allow_drone,
        )
