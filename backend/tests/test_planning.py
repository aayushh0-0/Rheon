import pytest
from app.services.planning.builder import EmergencyPlanBuilder


class TestEmergencyPlanBuilder:
    """Rigorous verification of deterministic allocation plan calculations."""

    def test_confidence_calculation_full_fulfillment(self):
        """100% allocation with single candidate and on-time ETA yields high confidence."""
        conf = EmergencyPlanBuilder._calculate_confidence(
            units_requested=4,
            total_allocated=4,
            max_eta=25,
            target_eta=30,
            candidate_count=1,
        )
        # Expected: 0.60 * 1.0 + 0.25 * 1.0 + 0.15 * 1.0 = 1.0
        assert conf == 1.0

    def test_confidence_calculation_partial_fulfillment(self):
        """Partial allocation drops confidence score proportionately."""
        conf_half = EmergencyPlanBuilder._calculate_confidence(
            units_requested=4,
            total_allocated=2,
            max_eta=25,
            target_eta=30,
            candidate_count=1,
        )
        # Expected: 0.60 * 0.5 + 0.25 * 1.0 + 0.15 * 1.0 = 0.30 + 0.25 + 0.15 = 0.70
        assert conf_half == pytest.approx(0.70)

    def test_confidence_fragmentation_penalty(self):
        """Allocating across 3 sources incurs a slight coordination complexity penalty."""
        conf_single = EmergencyPlanBuilder._calculate_confidence(
            units_requested=6,
            total_allocated=6,
            max_eta=25,
            target_eta=30,
            candidate_count=1,
        )
        conf_multi = EmergencyPlanBuilder._calculate_confidence(
            units_requested=6,
            total_allocated=6,
            max_eta=25,
            target_eta=30,
            candidate_count=3,
        )
        assert conf_single > conf_multi

    def test_rationale_generation_full(self):
        """Verify clinical rationale contains all vital logistics details."""
        rationale = EmergencyPlanBuilder._generate_rationale(
            units_requested=4,
            total_allocated=4,
            unmet_units=0,
            blood_group="O-",
            allocated_items=[],
            max_eta=25,
            donor_standby=False,
        )
        assert "100% fulfillment achieved" in rationale
        assert "O-" in rationale
        assert "max ETA of 25 min" in rationale

    def test_rationale_generation_deficit_donor_standby(self):
        """Verify donor standby notice appears on deficits."""
        rationale = EmergencyPlanBuilder._generate_rationale(
            units_requested=6,
            total_allocated=3,
            unmet_units=3,
            blood_group="AB-",
            allocated_items=[],
            max_eta=30,
            donor_standby=True,
        )
        assert "Partial fulfillment: 3/6 units allocated" in rationale
        assert "Deficit of 3 units" in rationale
        assert "Donor standby activation triggered" in rationale
