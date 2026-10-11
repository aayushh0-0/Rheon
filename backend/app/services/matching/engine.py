from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from app.models.facility import Hospital, BloodBank
from app.models.inventory import InventoryBatch
from app.models.route import Route
from app.schemas.enums import BloodGroup, ComponentType, OperationalStatus
from app.schemas.matching import MatchingRequest, MatchingCandidate, MatchingResponse
from app.services.compatibility.engine import BloodCompatibilityEngine
from app.services.inventory.engine import InventoryReserveEngine
from app.services.logistics.engine import LogisticsEngine


class SourceMatchingEngine:
    """
    Pure deterministic candidate source discovery, scoring, and ranking engine.
    Finds blood banks and hospitals capable of supplying the requested units,
    ranking them across compatibility, usable stock, logistics ETA, and operational reliability.
    """

    @classmethod
    def evaluate_candidates(
        cls,
        db: Session,
        request: MatchingRequest,
    ) -> MatchingResponse:
        """
        Evaluates and ranks all potential supply nodes in the network for a blood request.
        """
        # Resolve recipient coordinates
        recipient_lat = request.recipient_latitude
        recipient_lon = request.recipient_longitude
        recipient_hospital = None

        if request.hospital_id:
            recipient_hospital = db.query(Hospital).filter(Hospital.id == request.hospital_id).first()
            if recipient_hospital:
                recipient_lat = recipient_hospital.latitude
                recipient_lon = recipient_hospital.longitude

        if recipient_lat is None or recipient_lon is None:
            # Fallback default coordinates (e.g., city center)
            recipient_lat = 28.6139
            recipient_lon = 77.2090

        compatible_donor_groups = BloodCompatibilityEngine.get_compatible_donor_groups(
            request.blood_group, request.component_type
        )

        candidates: List[MatchingCandidate] = []
        total_network_usable = 0

        # Query all blood banks
        blood_banks = db.query(BloodBank).all()
        for bank in blood_banks:
            # Query inventory batches for compatible groups in this bank
            batches = (
                db.query(InventoryBatch)
                .filter(
                    InventoryBatch.blood_bank_id == bank.id,
                    InventoryBatch.component_type == request.component_type,
                    InventoryBatch.blood_group.in_(compatible_donor_groups),
                )
                .all()
            )

            for batch in batches:
                cand = cls._build_candidate(
                    facility=bank,
                    facility_type="BLOOD_BANK",
                    batch=batch,
                    request=request,
                    recipient_lat=recipient_lat,
                    recipient_lon=recipient_lon,
                    db=db,
                )
                candidates.append(cand)
                if cand.is_feasible:
                    total_network_usable += cand.usable_units

        # Also query other hospitals (peer transfers) excluding requesting hospital itself
        hospital_query = db.query(Hospital)
        if request.hospital_id:
            hospital_query = hospital_query.filter(Hospital.id != request.hospital_id)
        other_hospitals = hospital_query.all()

        for hosp in other_hospitals:
            batches = (
                db.query(InventoryBatch)
                .filter(
                    InventoryBatch.hospital_id == hosp.id,
                    InventoryBatch.component_type == request.component_type,
                    InventoryBatch.blood_group.in_(compatible_donor_groups),
                )
                .all()
            )
            for batch in batches:
                cand = cls._build_candidate(
                    facility=hosp,
                    facility_type="HOSPITAL",
                    batch=batch,
                    request=request,
                    recipient_lat=recipient_lat,
                    recipient_lon=recipient_lon,
                    db=db,
                )
                candidates.append(cand)
                if cand.is_feasible:
                    total_network_usable += cand.usable_units

        # Sort candidates deterministically by composite score descending
        candidates.sort(key=lambda c: (c.is_feasible, c.composite_score), reverse=True)

        feasible_count = sum(1 for c in candidates if c.is_feasible)
        sufficient = total_network_usable >= request.units_requested

        return MatchingResponse(
            request_blood_group=request.blood_group,
            component_type=request.component_type,
            units_requested=request.units_requested,
            urgency=request.urgency,
            max_eta_minutes=request.max_eta_minutes,
            compatible_donor_groups=compatible_donor_groups,
            candidates=candidates,
            total_network_usable_units=total_network_usable,
            feasible_candidates_count=feasible_count,
            sufficient_inventory_available=sufficient,
        )

    @classmethod
    def _build_candidate(
        cls,
        facility: Any,
        facility_type: str,
        batch: InventoryBatch,
        request: MatchingRequest,
        recipient_lat: float,
        recipient_lon: float,
        db: Session,
    ) -> MatchingCandidate:
        rejection_reasons = []

        is_operational = getattr(facility, "is_online", getattr(facility, "is_active", True))
        if not is_operational:
            rejection_reasons.append("FACILITY_OFFLINE")

        is_hub = getattr(facility, "is_regional_hub", False)
        donor_blood_group = batch.blood_group

        is_compatible = BloodCompatibilityEngine.is_compatible(
            request.blood_group, donor_blood_group, request.component_type
        )
        if not is_compatible:
            rejection_reasons.append("INCOMPATIBLE_BLOOD_GROUP")

        is_exact = BloodCompatibilityEngine.is_exact_match(request.blood_group, donor_blood_group)
        is_universal = BloodCompatibilityEngine.is_universal_donor(donor_blood_group, request.component_type)

        # Calculate usable stock
        usable_units = InventoryReserveEngine.calculate_usable_stock(
            batch.available_units, batch.safety_reserve_units
        )
        if usable_units <= 0:
            rejection_reasons.append("ZERO_USABLE_STOCK")

        units_avail_for_req = min(usable_units, request.units_requested)

        # Check existing pre-calculated route or calculate dynamically
        traffic_factor = 1.0
        if request.hospital_id:
            route = (
                db.query(Route)
                .filter(
                    Route.source_id == facility.id,
                    Route.destination_hospital_id == request.hospital_id,
                )
                .first()
            )
            if route:
                traffic_factor = route.traffic_factor
                if route.status == "BLOCKED":
                    rejection_reasons.append("ROUTE_BLOCKED")

        logistics = LogisticsEngine.compute_logistics(
            origin_lat=facility.latitude,
            origin_lon=facility.longitude,
            dest_lat=recipient_lat,
            dest_lon=recipient_lon,
            urgency=request.urgency,
            traffic_factor=traffic_factor,
        )

        distance_km = logistics["distance_km"]
        estimated_minutes = logistics["estimated_minutes"]

        if request.max_eta_minutes and estimated_minutes > (request.max_eta_minutes * 1.2):
            rejection_reasons.append(f"ETA_EXCEEDS_MAX_THRESHOLD ({estimated_minutes}m > {request.max_eta_minutes}m)")

        is_feasible = len(rejection_reasons) == 0

        # Compute deterministic composite score
        score = cls._compute_composite_score(
            recipient_group=request.blood_group,
            donor_group=donor_blood_group,
            component_type=request.component_type,
            usable_units=usable_units,
            units_requested=request.units_requested,
            distance_km=distance_km,
            estimated_minutes=estimated_minutes,
            max_eta_minutes=request.max_eta_minutes,
            is_hub=is_hub,
            facility_type=facility_type,
            is_feasible=is_feasible,
        )

        return MatchingCandidate(
            source_facility_id=facility.id,
            source_facility_type=facility_type,
            source_name=facility.name,
            donor_blood_group=donor_blood_group,
            is_compatible=is_compatible,
            is_exact_match=is_exact,
            is_universal_donor=is_universal,
            total_units=batch.total_units,
            available_units=batch.available_units,
            safety_reserve_units=batch.safety_reserve_units,
            usable_units=usable_units,
            units_available_for_request=units_avail_for_req,
            distance_km=distance_km,
            estimated_minutes=estimated_minutes,
            traffic_factor=traffic_factor,
            is_operational=is_operational,
            is_hub=is_hub,
            composite_score=round(score, 4),
            is_feasible=is_feasible,
            rejection_reasons=rejection_reasons,
        )

    @classmethod
    def _compute_composite_score(
        cls,
        recipient_group: str,
        donor_group: str,
        component_type: str,
        usable_units: int,
        units_requested: int,
        distance_km: float,
        estimated_minutes: int,
        max_eta_minutes: int,
        is_hub: bool,
        facility_type: str,
        is_feasible: bool,
    ) -> float:
        """
        Mathematical multi-factor scoring function:
        Score = w1 * CompatScore + w2 * CapacityScore + w3 * ProximityScore + w4 * ReliabilityScore
        """
        if not is_feasible:
            return 0.0

        # 1. Compatibility Weight: 0.35
        compat_score = BloodCompatibilityEngine.get_compatibility_score(
            recipient_group, donor_group, component_type
        )

        # 2. Capacity Fulfillment Weight: 0.25
        # Higher score if source can fulfill a larger proportion of the request in a single trip
        fulfillment_ratio = min(1.0, usable_units / max(1, units_requested))
        capacity_score = 0.5 + (0.5 * fulfillment_ratio)

        # 3. Proximity / ETA Score Weight: 0.25
        # Fast arrival is critical
        target_eta = max_eta_minutes or 45
        if estimated_minutes <= target_eta:
            eta_score = max(0.2, 1.0 - (0.5 * (estimated_minutes / target_eta)))
        else:
            eta_score = max(0.05, 0.5 * (target_eta / estimated_minutes))

        # 4. Reliability & Facility Type Weight: 0.15
        reliability_score = 0.8
        if is_hub:
            reliability_score += 0.2
        elif facility_type == "BLOOD_BANK":
            reliability_score += 0.1

        total_score = (
            (0.35 * compat_score)
            + (0.25 * capacity_score)
            + (0.25 * eta_score)
            + (0.15 * reliability_score)
        )

        return total_score
