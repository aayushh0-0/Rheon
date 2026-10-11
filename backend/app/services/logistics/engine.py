import math
from typing import Dict, Any, Optional
from app.schemas.enums import TransportMode, UrgencyLevel
from app.services.logistics.haversine import haversine_distance


class LogisticsEngine:
    """
    Deterministic logistics and ETA engine.
    Calculates great-circle geospatial distance, selects optimal transport modality,
    and estimates realistic transit times based on urgency and road traffic factors.
    """

    # Baseline speeds in km/h and dispatch preparation overheads in minutes
    MODALITY_CONFIG = {
        TransportMode.STANDARD_COURIER.value: {
            "base_speed_kmh": 35.0,
            "dispatch_overhead_mins": 8,
            "max_range_km": 150.0,
            "traffic_sensitive": True,
        },
        TransportMode.MOTORCYCLE_COURIER.value: {
            "base_speed_kmh": 45.0,
            "dispatch_overhead_mins": 5,
            "max_range_km": 60.0,
            "traffic_sensitive": True,
        },
        TransportMode.REFRIGERATED_VAN.value: {
            "base_speed_kmh": 40.0,
            "dispatch_overhead_mins": 10,
            "max_range_km": 200.0,
            "traffic_sensitive": True,
        },
        TransportMode.AMBULANCE_ROUTINE.value: {
            "base_speed_kmh": 45.0,
            "dispatch_overhead_mins": 6,
            "max_range_km": 120.0,
            "traffic_sensitive": True,
        },
        TransportMode.AMBULANCE_SIREN.value: {
            "base_speed_kmh": 55.0,
            "dispatch_overhead_mins": 4,
            "max_range_km": 120.0,
            "traffic_sensitive": True,
        },
        TransportMode.DRONE.value: {
            "base_speed_kmh": 75.0,
            "dispatch_overhead_mins": 3,
            "max_range_km": 35.0,
            "traffic_sensitive": False,
        },
    }

    @classmethod
    def calculate_distance(cls, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Computes haversine distance in kilometers."""
        return haversine_distance(lat1, lon1, lat2, lon2)

    @classmethod
    def select_transport_mode(
        cls,
        urgency: str,
        distance_km: float,
        max_eta_minutes: Optional[int] = None,
        allow_drone: bool = False,
    ) -> str:
        """
        Determines the optimal transport mode based on clinical urgency and range constraints.
        Default to ground transport only per system negative constraints.
        """
        is_critical = urgency in [
            UrgencyLevel.CRITICAL.value,
            UrgencyLevel.CRITICAL_IMMEDIATE.value,
            UrgencyLevel.URGENT_SURGICAL.value,
        ]

        if is_critical and allow_drone and distance_km <= 35.0:
            return TransportMode.DRONE.value
        elif is_critical or (max_eta_minutes and max_eta_minutes <= 30):
            return TransportMode.AMBULANCE_SIREN.value
        elif urgency == UrgencyLevel.URGENT.value:
            return TransportMode.MOTORCYCLE_COURIER.value if distance_km <= 20.0 else TransportMode.AMBULANCE_ROUTINE.value
        else:
            return TransportMode.STANDARD_COURIER.value

    @classmethod
    def estimate_travel_time(
        cls,
        distance_km: float,
        transport_mode: str = TransportMode.STANDARD_COURIER.value,
        traffic_factor: float = 1.0,
    ) -> int:
        """
        Calculates total transit minutes including dispatch overhead and traffic congestion.
        """
        config = cls.MODALITY_CONFIG.get(
            transport_mode, cls.MODALITY_CONFIG[TransportMode.STANDARD_COURIER.value]
        )
        base_speed = config["base_speed_kmh"]
        dispatch_overhead = config["dispatch_overhead_mins"]
        is_traffic_sensitive = config["traffic_sensitive"]

        effective_traffic = traffic_factor if is_traffic_sensitive else 1.0
        effective_traffic = max(0.5, min(3.0, effective_traffic))  # clamp safety

        transit_hours = distance_km / base_speed
        transit_minutes = transit_hours * 60.0 * effective_traffic

        total_minutes = int(math.ceil(dispatch_overhead + transit_minutes))
        return max(5, total_minutes)

    @classmethod
    def compute_logistics(
        cls,
        origin_lat: float,
        origin_lon: float,
        dest_lat: float,
        dest_lon: float,
        urgency: str = UrgencyLevel.URGENT.value,
        traffic_factor: float = 1.0,
        allow_drone: bool = True,
    ) -> Dict[str, Any]:
        """
        Complete logistics evaluation returning distance, mode, and estimated ETA.
        """
        distance_km = cls.calculate_distance(origin_lat, origin_lon, dest_lat, dest_lon)
        transport_mode = cls.select_transport_mode(urgency, distance_km, allow_drone=allow_drone)
        estimated_minutes = cls.estimate_travel_time(distance_km, transport_mode, traffic_factor)

        return {
            "distance_km": distance_km,
            "transport_mode": transport_mode,
            "estimated_minutes": estimated_minutes,
            "traffic_factor": traffic_factor,
            "is_drone_eligible": distance_km <= 35.0,
        }
