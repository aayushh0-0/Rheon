import pytest
from app.services.planning.validator import PlanValidator
from app.schemas.validation import PlanValidationRequest
from app.schemas.enums import TransportMode


class TestPlanValidator:
    """Rigorous verification of the 6-point deterministic safety gate."""

    def test_validation_biological_incompatibility_fails(self):
        """Allocating A+ blood to an O- recipient must fail safety gate."""
        payload = PlanValidationRequest(
            recipient_hospital_id="hosp-test-1",
            recipient_blood_group="O-",
            component_type="RBC",
            units_requested=2,
            allocations=[
                {
                    "source_facility_id": "mock-bb-1",
                    "source_facility_type": "BLOOD_BANK",
                    "source_name": "Test Blood Bank",
                    "donor_blood_group": "A+",
                    "units_allocated": 2,
                    "transport_mode": TransportMode.STANDARD_COURIER.value,
                    "distance_km": 5.0,
                    "estimated_eta_minutes": 15,
                }
            ],
        )

        class DummyDB:
            def query(self, *args, **kwargs):
                class DummyQuery:
                    def filter(self, *fargs, **fkwargs):
                        return self
                    def first(self):
                        return None
                return DummyQuery()

        res = PlanValidator.validate_plan(db=DummyDB(), request=payload)
        assert res.is_valid is False
        assert res.checks.compatibility is False
        assert any("Incompatible donor group A+" in err for err in res.errors)

    def test_validation_quantity_overallocation_fails(self):
        """Allocating 5 units for a 3-unit request fails quantity conservation."""
        payload = PlanValidationRequest(
            recipient_hospital_id="hosp-test-1",
            recipient_blood_group="A+",
            component_type="RBC",
            units_requested=3,
            allocations=[
                {
                    "source_facility_id": "mock-bb-1",
                    "source_facility_type": "BLOOD_BANK",
                    "source_name": "Test Blood Bank",
                    "donor_blood_group": "A+",
                    "units_allocated": 5,
                    "transport_mode": TransportMode.STANDARD_COURIER.value,
                    "distance_km": 5.0,
                    "estimated_eta_minutes": 15,
                }
            ],
        )

        class DummyDB:
            def query(self, *args, **kwargs):
                class DummyQuery:
                    def filter(self, *fargs, **fkwargs):
                        return self
                    def first(self):
                        return None
                return DummyQuery()

        res = PlanValidator.validate_plan(db=DummyDB(), request=payload)
        assert res.is_valid is False
        assert res.checks.quantity_conservation is False

    def test_validation_invalid_logistics_fails(self):
        """Negative ETA or invalid transport mode fails logistics check."""
        payload = PlanValidationRequest(
            recipient_hospital_id="hosp-test-1",
            recipient_blood_group="B+",
            component_type="RBC",
            units_requested=2,
            allocations=[
                {
                    "source_facility_id": "mock-bb-1",
                    "source_facility_type": "BLOOD_BANK",
                    "source_name": "Test Blood Bank",
                    "donor_blood_group": "B+",
                    "units_allocated": 2,
                    "transport_mode": "ROCKET_SHIP",
                    "distance_km": -10.0,
                    "estimated_eta_minutes": -5,
                }
            ],
        )

        class DummyDB:
            def query(self, *args, **kwargs):
                class DummyQuery:
                    def filter(self, *fargs, **fkwargs):
                        return self
                    def first(self):
                        return None
                return DummyQuery()

        res = PlanValidator.validate_plan(db=DummyDB(), request=payload)
        assert res.is_valid is False
        assert res.checks.logistics_validity is False

    def test_validation_mathematical_non_positive_fails(self):
        """Allocating 0 or negative units fails mathematical consistency."""
        payload = PlanValidationRequest(
            recipient_hospital_id="hosp-test-1",
            recipient_blood_group="O+",
            component_type="RBC",
            units_requested=2,
            allocations=[
                {
                    "source_facility_id": "mock-bb-1",
                    "source_facility_type": "BLOOD_BANK",
                    "source_name": "Test Blood Bank",
                    "donor_blood_group": "O+",
                    "units_allocated": 0,
                    "transport_mode": TransportMode.STANDARD_COURIER.value,
                    "distance_km": 5.0,
                    "estimated_eta_minutes": 15,
                }
            ],
        )

        class DummyDB:
            def query(self, *args, **kwargs):
                class DummyQuery:
                    def filter(self, *fargs, **fkwargs):
                        return self
                    def first(self):
                        return None
                return DummyQuery()

        res = PlanValidator.validate_plan(db=DummyDB(), request=payload)
        assert res.is_valid is False
        assert res.checks.mathematical_consistency is False
