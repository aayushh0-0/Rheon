import pytest
from app.services.matching.engine import SourceMatchingEngine


class TestSourceMatchingEngineCalculations:
    """Rigorous verification of deterministic multi-factor scoring function."""

    def test_composite_score_exact_match_full_capacity(self):
        """Exact match (score 1.0), 100% capacity (score 1.0), fast ETA (1.0), regional hub (1.0)."""
        score = SourceMatchingEngine._compute_composite_score(
            recipient_group="A+",
            donor_group="A+",
            component_type="RBC",
            usable_units=10,
            units_requested=5,
            distance_km=10.0,
            estimated_minutes=20,
            max_eta_minutes=45,
            is_hub=True,
            facility_type="BLOOD_BANK",
            is_feasible=True,
        )
        # Expected:
        # Compat: 0.35 * 1.0 = 0.35
        # Capacity: 0.25 * (0.5 + 0.5 * 1.0) = 0.25
        # ETA: 20 <= 45 -> eta_score = 1.0 - (0.5 * (20/45)) = 1.0 - 0.2222 = 0.7778 -> 0.25 * 0.7778 = 0.1944
        # Reliability: Hub = 0.8 + 0.2 = 1.0 -> 0.15 * 1.0 = 0.15
        # Total ~ 0.35 + 0.25 + 0.1944 + 0.15 = 0.9444
        assert 0.90 <= score <= 0.96

    def test_infeasible_score_is_zero(self):
        """Infeasible candidates must receive composite score 0.0."""
        score = SourceMatchingEngine._compute_composite_score(
            recipient_group="O-",
            donor_group="A+",
            component_type="RBC",
            usable_units=0,
            units_requested=5,
            distance_km=10.0,
            estimated_minutes=20,
            max_eta_minutes=45,
            is_hub=True,
            facility_type="BLOOD_BANK",
            is_feasible=False,
        )
        assert score == 0.0

    def test_partial_capacity_scoring(self):
        """Source with 1 out of 5 requested units gets lower capacity score than source with 5 out of 5."""
        score_partial = SourceMatchingEngine._compute_composite_score(
            recipient_group="B+",
            donor_group="B+",
            component_type="RBC",
            usable_units=1,
            units_requested=5,
            distance_km=10.0,
            estimated_minutes=20,
            max_eta_minutes=45,
            is_hub=False,
            facility_type="BLOOD_BANK",
            is_feasible=True,
        )
        score_full = SourceMatchingEngine._compute_composite_score(
            recipient_group="B+",
            donor_group="B+",
            component_type="RBC",
            usable_units=5,
            units_requested=5,
            distance_km=10.0,
            estimated_minutes=20,
            max_eta_minutes=45,
            is_hub=False,
            facility_type="BLOOD_BANK",
            is_feasible=True,
        )
        assert score_full > score_partial
