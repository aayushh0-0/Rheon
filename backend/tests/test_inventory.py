import pytest
from app.services.inventory.engine import InventoryReserveEngine
from app.schemas.enums import BloodGroup, ComponentType, InventoryStatus


class TestInventoryReserveEngine:
    """Rigorous verification of deterministic inventory and safety reserve logic."""

    def test_usable_stock_subtraction(self):
        """Usable stock = max(0, available - safety_reserve)."""
        assert InventoryReserveEngine.calculate_usable_stock(available_units=15, safety_reserve_units=5) == 10
        assert InventoryReserveEngine.calculate_usable_stock(available_units=5, safety_reserve_units=5) == 0
        assert InventoryReserveEngine.calculate_usable_stock(available_units=3, safety_reserve_units=5) == 0
        assert InventoryReserveEngine.calculate_usable_stock(available_units=0, safety_reserve_units=10) == 0

    def test_hospital_safety_reserve_trauma_levels(self):
        """Trauma Level 1 must maintain higher reserves than Level 2 or 3."""
        l1_o_neg = InventoryReserveEngine.calculate_hospital_safety_reserve(
            blood_group="O-",
            trauma_level=1,
            emergency_capacity="STANDARD",
        )
        l2_o_neg = InventoryReserveEngine.calculate_hospital_safety_reserve(
            blood_group="O-",
            trauma_level=2,
            emergency_capacity="STANDARD",
        )
        l3_o_neg = InventoryReserveEngine.calculate_hospital_safety_reserve(
            blood_group="O-",
            trauma_level=3,
            emergency_capacity="STANDARD",
        )

        assert l1_o_neg > l2_o_neg
        assert l2_o_neg > l3_o_neg
        assert l1_o_neg == 12  # Baseline for Level 1 O-
        assert l2_o_neg == 8   # Baseline for Level 2 O-
        assert l3_o_neg == 4   # Baseline for Level 3 O-

    def test_hospital_reserve_surge_scaling(self):
        """Surge capacity scales safety reserve floor appropriately."""
        baseline = InventoryReserveEngine.calculate_hospital_safety_reserve(
            blood_group="O-",
            trauma_level=1,
            emergency_capacity="STANDARD",
        )
        surge = InventoryReserveEngine.calculate_hospital_safety_reserve(
            blood_group="O-",
            trauma_level=1,
            emergency_capacity="SURGE",
        )
        assert surge == int(baseline * 1.5)

    def test_blood_bank_regional_vs_standard_reserve(self):
        """Regional hub blood banks maintain higher reserves than local depots."""
        regional_reserve = InventoryReserveEngine.calculate_blood_bank_safety_reserve(
            blood_group="A+",
            total_units=100,
            is_regional_hub=True,
        )
        standard_reserve = InventoryReserveEngine.calculate_blood_bank_safety_reserve(
            blood_group="A+",
            total_units=100,
            is_regional_hub=False,
        )
        assert regional_reserve > standard_reserve

    def test_inventory_status_evaluation(self):
        """Verify status categorization transitions."""
        assert InventoryReserveEngine.evaluate_inventory_status(
            available_units=0, safety_reserve_units=5
        ) == InventoryStatus.OUT_OF_STOCK

        assert InventoryReserveEngine.evaluate_inventory_status(
            available_units=3, safety_reserve_units=10
        ) == InventoryStatus.CRITICAL

        assert InventoryReserveEngine.evaluate_inventory_status(
            available_units=12, safety_reserve_units=10
        ) == InventoryStatus.LOW

        assert InventoryReserveEngine.evaluate_inventory_status(
            available_units=25, safety_reserve_units=10
        ) == InventoryStatus.HEALTHY
