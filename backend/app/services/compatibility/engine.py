from typing import List, Optional
from app.schemas.enums import BloodGroup, ComponentType
from app.services.compatibility.matrix import (
    RBC_COMPATIBILITY_PREFERENCE,
    FFP_COMPATIBILITY_PREFERENCE,
    PLATELETS_COMPATIBILITY_PREFERENCE,
    CRYO_COMPATIBILITY_PREFERENCE,
)


class BloodCompatibilityEngine:
    """
    Pure, deterministic blood product compatibility and clinical preference engine.
    Ensures safe ABO/Rh matching for RBC, PRBC, FFP, Platelets, and Cryo components.
    """

    @staticmethod
    def _get_preference_matrix(component_type: str) -> dict:
        comp = component_type.upper() if component_type else ComponentType.RBC.value
        if comp in [ComponentType.RBC.value, ComponentType.PRBC.value]:
            return RBC_COMPATIBILITY_PREFERENCE
        elif comp == ComponentType.FFP.value:
            return FFP_COMPATIBILITY_PREFERENCE
        elif comp == ComponentType.PLATELETS.value:
            return PLATELETS_COMPATIBILITY_PREFERENCE
        elif comp == ComponentType.CRYO.value:
            return CRYO_COMPATIBILITY_PREFERENCE
        return RBC_COMPATIBILITY_PREFERENCE

    @classmethod
    def get_compatible_donor_groups(
        cls, recipient_group: str, component_type: str = ComponentType.RBC.value
    ) -> List[str]:
        """
        Returns an ordered list of compatible donor blood groups ranked by clinical preference.
        """
        matrix = cls._get_preference_matrix(component_type)
        return matrix.get(recipient_group, [])

    @classmethod
    def is_compatible(
        cls, recipient_group: str, donor_group: str, component_type: str = ComponentType.RBC.value
    ) -> bool:
        """
        Determines whether a donor blood group is safe/compatible for a recipient.
        """
        compatible_groups = cls.get_compatible_donor_groups(recipient_group, component_type)
        return donor_group in compatible_groups

    @classmethod
    def get_preference_rank(
        cls, recipient_group: str, donor_group: str, component_type: str = ComponentType.RBC.value
    ) -> int:
        """
        Returns 0-based rank of donor preference (0 = exact match). Returns -1 if incompatible.
        """
        compatible_groups = cls.get_compatible_donor_groups(recipient_group, component_type)
        try:
            return compatible_groups.index(donor_group)
        except ValueError:
            return -1

    @classmethod
    def is_exact_match(cls, recipient_group: str, donor_group: str) -> bool:
        return recipient_group == donor_group

    @classmethod
    def is_universal_donor(cls, donor_group: str, component_type: str = ComponentType.RBC.value) -> bool:
        comp = component_type.upper() if component_type else ComponentType.RBC.value
        if comp in [ComponentType.RBC.value, ComponentType.PRBC.value]:
            return donor_group == BloodGroup.O_NEG.value
        elif comp == ComponentType.FFP.value:
            return donor_group in [BloodGroup.AB_POS.value, BloodGroup.AB_NEG.value]
        return donor_group == BloodGroup.O_NEG.value

    @classmethod
    def get_compatibility_score(
        cls, recipient_group: str, donor_group: str, component_type: str = ComponentType.RBC.value
    ) -> float:
        """
        Computes a normalized compatibility score between 0.0 (incompatible) and 1.0 (exact match).
        Exact match = 1.0
        Universal donor for non-O- recipient = 0.85 (preserves rare O- stock when exact match is available)
        Other compatible = 0.90 to 0.70 depending on rank
        """
        rank = cls.get_preference_rank(recipient_group, donor_group, component_type)
        if rank == -1:
            return 0.0
        if rank == 0:
            return 1.0

        # Slightly penalize using universal O- for non-O- recipients if not strictly necessary
        if donor_group == BloodGroup.O_NEG.value and recipient_group != BloodGroup.O_NEG.value:
            return 0.82

        # Decaying score for other compatible ranks
        return max(0.60, 1.0 - (rank * 0.08))
