import pytest
from app.services.logistics.engine import LogisticsEngine
from app.services.logistics.haversine import haversine_distance
from app.schemas.enums import TransportMode, UrgencyLevel


class TestLogisticsEngine:
    """Rigorous verification of deterministic geospatial and ETA computations."""

    def test_haversine_distance_accuracy(self):
        """Distance between AIIMS (28.5672, 77.2100) and Safdarjung (28.5700, 77.2075)."""
        dist = haversine_distance(28.5672, 77.2100, 28.5700, 77.2075)
        # Should be approximately 0.4 km (400 meters)
        assert 0.2 <= dist <= 0.8

        # Distance between AIIMS and Medanta Gurgaon (28.4395, 77.0425) ~ 21.5 km
        dist_medanta = haversine_distance(28.5672, 77.2100, 28.4395, 77.0425)
        assert 18.0 <= dist_medanta <= 26.0

    def test_transport_mode_selection(self):
        """Verify modal selection based on distance and urgency."""
        # Critical urgency and short distance (< 35km) -> Drone
        mode_drone = LogisticsEngine.select_transport_mode(
            urgency=UrgencyLevel.CRITICAL.value,
            distance_km=15.0,
            allow_drone=True,
        )
        assert mode_drone == TransportMode.DRONE.value

        # Critical urgency but long distance (> 35km) -> Ambulance Siren
        mode_amb = LogisticsEngine.select_transport_mode(
            urgency=UrgencyLevel.CRITICAL.value,
            distance_km=45.0,
            allow_drone=True,
        )
        assert mode_amb == TransportMode.AMBULANCE_SIREN.value

        # Routine urgency -> Standard Courier
        mode_courier = LogisticsEngine.select_transport_mode(
            urgency=UrgencyLevel.ROUTINE.value,
            distance_km=15.0,
            allow_drone=True,
        )
        assert mode_courier == TransportMode.STANDARD_COURIER.value

    def test_travel_time_estimation_with_traffic(self):
        """Verify ETA calculation and traffic factor sensitivity."""
        # 35 km with standard courier (base 35 km/h) -> 60 min transit + 8 min dispatch = 68 min
        eta_normal = LogisticsEngine.estimate_travel_time(
            distance_km=35.0,
            transport_mode=TransportMode.STANDARD_COURIER.value,
            traffic_factor=1.0,
        )
        assert eta_normal == 68

        # Heavy traffic (1.5x) -> 90 min transit + 8 min dispatch = 98 min
        eta_heavy = LogisticsEngine.estimate_travel_time(
            distance_km=35.0,
            transport_mode=TransportMode.STANDARD_COURIER.value,
            traffic_factor=1.5,
        )
        assert eta_heavy == 98

        # Drone ignores traffic factor
        drone_normal = LogisticsEngine.estimate_travel_time(
            distance_km=15.0,
            transport_mode=TransportMode.DRONE.value,
            traffic_factor=1.0,
        )
        drone_traffic = LogisticsEngine.estimate_travel_time(
            distance_km=15.0,
            transport_mode=TransportMode.DRONE.value,
            traffic_factor=2.0,
        )
        assert drone_normal == drone_traffic
