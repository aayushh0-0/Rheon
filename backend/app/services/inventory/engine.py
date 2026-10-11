from typing import Dict, Any, Optional, Tuple
from app.schemas.enums import BloodGroup, ComponentType, InventoryStatus


class InventoryReserveEngine:
    """
    Pure, deterministic inventory accounting and trauma-weighted safety reserve engine.
    Guarantees safety reserve protection and accurate usable stock arithmetic.
    """

    # Baseline safety reserves by blood group for trauma centers
    TRAUMA_RESERVE_BASELINES: Dict[int, Dict[str, int]] = {
        1: {  # Level 1 Trauma Center (Highest preparedness)
            BloodGroup.O_NEG.value: 12,
            BloodGroup.O_POS.value: 16,
            BloodGroup.A_POS.value: 10,
            BloodGroup.A_NEG.value: 6,
            BloodGroup.B_POS.value: 8,
            BloodGroup.B_NEG.value: 4,
            BloodGroup.AB_POS.value: 4,
            BloodGroup.AB_NEG.value: 2,
        },
        2: {  # Level 2 Trauma Center (Regional emergency)
            BloodGroup.O_NEG.value: 8,
            BloodGroup.O_POS.value: 12,
            BloodGroup.A_POS.value: 6,
            BloodGroup.A_NEG.value: 4,
            BloodGroup.B_POS.value: 6,
            BloodGroup.B_NEG.value: 3,
            BloodGroup.AB_POS.value: 2,
            BloodGroup.AB_NEG.value: 1,
        },
        3: {  # Level 3 Trauma Center (Community support)
            BloodGroup.O_NEG.value: 4,
            BloodGroup.O_POS.value: 6,
            BloodGroup.A_POS.value: 3,
            BloodGroup.A_NEG.value: 2,
            BloodGroup.B_POS.value: 3,
            BloodGroup.B_NEG.value: 2,
            BloodGroup.AB_POS.value: 1,
            BloodGroup.AB_NEG.value: 1,
        },
    }

    # Blood bank default baseline reserves
    REGIONAL_HUB_MIN_RESERVE = 15
    STANDARD_BANK_MIN_RESERVE = 8

    @classmethod
    def calculate_usable_stock(cls, available_units: int, safety_reserve_units: int) -> int:
        """
        Calculates usable units strictly preserving safety reserve.
        Usable = max(0, available_units - safety_reserve_units)
        """
        return max(0, available_units - safety_reserve_units)

    @classmethod
    def calculate_hospital_safety_reserve(
        cls,
        blood_group: str,
        trauma_level: int = 2,
        emergency_capacity: str = "STANDARD",
    ) -> int:
        """
        Computes dynamic safety reserve for a hospital based on trauma accreditation.
        """
        level_map = cls.TRAUMA_RESERVE_BASELINES.get(trauma_level, cls.TRAUMA_RESERVE_BASELINES[2])
        base_reserve = level_map.get(blood_group, 5)

        if emergency_capacity == "HIGH" or emergency_capacity == "SURGE":
            return int(base_reserve * 1.5)
        elif emergency_capacity == "LOW":
            return max(1, int(base_reserve * 0.75))
        return base_reserve

    @classmethod
    def calculate_blood_bank_safety_reserve(
        cls,
        blood_group: str,
        total_units: int,
        is_regional_hub: bool = False,
    ) -> int:
        """
        Computes safety reserve for a blood bank hub.
        """
        if is_regional_hub:
            pct_reserve = int(total_units * 0.15)
            min_base = 10 if blood_group == BloodGroup.O_NEG.value else cls.REGIONAL_HUB_MIN_RESERVE
            return max(min_base, pct_reserve)
        else:
            pct_reserve = int(total_units * 0.10)
            min_base = 5 if blood_group == BloodGroup.O_NEG.value else cls.STANDARD_BANK_MIN_RESERVE
            return max(min_base, pct_reserve)

    @classmethod
    def evaluate_inventory_status(
        cls, available_units: int, safety_reserve_units: int
    ) -> InventoryStatus:
        """
        Deterministically evaluates health category of an inventory batch.
        """
        usable = cls.calculate_usable_stock(available_units, safety_reserve_units)

        if available_units <= 0:
            return InventoryStatus.OUT_OF_STOCK
        if usable == 0 or available_units <= safety_reserve_units:
            return InventoryStatus.CRITICAL
        if usable < 6:
            return InventoryStatus.LOW
        return InventoryStatus.HEALTHY

    @classmethod
    def validate_allocation(
        cls, available_units: int, safety_reserve_units: int, requested_units: int
    ) -> Tuple[bool, int, str]:
        """
        Validates if requested allocation can be fulfilled without violating safety reserve.
        Returns: (is_valid, allowable_units, reason)
        """
        usable = cls.calculate_usable_stock(available_units, safety_reserve_units)
        if usable <= 0:
            return False, 0, f"Zero usable stock: Available ({available_units}) <= Safety Reserve ({safety_reserve_units})"

        allowable = min(usable, requested_units)
        if allowable < requested_units:
            return True, allowable, f"Partial fulfillment: Requested {requested_units}, usable stock is {allowable}"

        return True, allowable, "Full fulfillment allowable within safety reserve bounds"
