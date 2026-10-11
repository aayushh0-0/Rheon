import pytest
from app.schemas.enums import BloodGroup, ComponentType
from app.services.compatibility.engine import BloodCompatibilityEngine
from app.services.compatibility.matrix import (
    RBC_COMPATIBILITY_PREFERENCE,
    FFP_COMPATIBILITY_PREFERENCE,
    PLATELETS_COMPATIBILITY_PREFERENCE,
    CRYO_COMPATIBILITY_PREFERENCE,
)


class TestRBCCompatibility:
    """Rigorous clinical verification for RBC / PRBC blood compatibility."""

    def test_o_negative_universal_donor(self):
        """O- must be compatible with all 8 blood groups for RBC."""
        all_groups = [
            BloodGroup.O_NEG.value,
            BloodGroup.O_POS.value,
            BloodGroup.A_NEG.value,
            BloodGroup.A_POS.value,
            BloodGroup.B_NEG.value,
            BloodGroup.B_POS.value,
            BloodGroup.AB_NEG.value,
            BloodGroup.AB_POS.value,
        ]
        for recipient in all_groups:
            assert BloodCompatibilityEngine.is_compatible(recipient, BloodGroup.O_NEG.value, ComponentType.RBC.value)
            assert BloodCompatibilityEngine.is_universal_donor(BloodGroup.O_NEG.value, ComponentType.RBC.value)

    def test_ab_positive_universal_recipient(self):
        """AB+ recipient can receive RBC from all 8 blood groups."""
        all_groups = [
            BloodGroup.O_NEG.value,
            BloodGroup.O_POS.value,
            BloodGroup.A_NEG.value,
            BloodGroup.A_POS.value,
            BloodGroup.B_NEG.value,
            BloodGroup.B_POS.value,
            BloodGroup.AB_NEG.value,
            BloodGroup.AB_POS.value,
        ]
        for donor in all_groups:
            assert BloodCompatibilityEngine.is_compatible(BloodGroup.AB_POS.value, donor, ComponentType.RBC.value)

    def test_o_positive_recipient_restrictions(self):
        """O+ can only receive O+ and O-."""
        assert BloodCompatibilityEngine.is_compatible("O+", "O+", "RBC")
        assert BloodCompatibilityEngine.is_compatible("O+", "O-", "RBC")
        assert not BloodCompatibilityEngine.is_compatible("O+", "A+", "RBC")
        assert not BloodCompatibilityEngine.is_compatible("O+", "A-", "RBC")
        assert not BloodCompatibilityEngine.is_compatible("O+", "B+", "RBC")
        assert not BloodCompatibilityEngine.is_compatible("O+", "AB+", "RBC")

    def test_a_negative_recipient_restrictions(self):
        """A- can only receive A- and O-."""
        assert BloodCompatibilityEngine.is_compatible("A-", "A-", "RBC")
        assert BloodCompatibilityEngine.is_compatible("A-", "O-", "RBC")
        assert not BloodCompatibilityEngine.is_compatible("A-", "A+", "RBC")
        assert not BloodCompatibilityEngine.is_compatible("A-", "O+", "RBC")
        assert not BloodCompatibilityEngine.is_compatible("A-", "B-", "RBC")

    def test_exact_match_score(self):
        """Exact matches must yield score 1.0 and rank 0."""
        for bg in ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]:
            assert BloodCompatibilityEngine.is_exact_match(bg, bg)
            assert BloodCompatibilityEngine.get_preference_rank(bg, bg, "RBC") == 0
            assert BloodCompatibilityEngine.get_compatibility_score(bg, bg, "RBC") == 1.0

    def test_incompatible_scores(self):
        """Incompatible combinations must return score 0.0 and rank -1."""
        assert BloodCompatibilityEngine.get_preference_rank("O-", "A+", "RBC") == -1
        assert BloodCompatibilityEngine.get_compatibility_score("O-", "A+", "RBC") == 0.0
        assert BloodCompatibilityEngine.get_preference_rank("B-", "AB+", "RBC") == -1
        assert BloodCompatibilityEngine.get_compatibility_score("B-", "AB+", "RBC") == 0.0


class TestFFPCompatibility:
    """Clinical verification for Fresh Frozen Plasma (FFP)."""

    def test_ffp_universal_donor_is_ab(self):
        """For plasma, AB is the universal donor, and O is universal recipient."""
        assert BloodCompatibilityEngine.is_universal_donor("AB+", ComponentType.FFP.value)
        assert BloodCompatibilityEngine.is_universal_donor("AB-", ComponentType.FFP.value)

        # O- recipient can receive from all FFP donors
        all_groups = ["O-", "O+", "A-", "A+", "B-", "B+", "AB-", "AB+"]
        for donor in all_groups:
            assert BloodCompatibilityEngine.is_compatible("O-", donor, ComponentType.FFP.value)

        # AB+ recipient can only receive AB FFP
        assert BloodCompatibilityEngine.is_compatible("AB+", "AB+", ComponentType.FFP.value)
        assert BloodCompatibilityEngine.is_compatible("AB+", "AB-", ComponentType.FFP.value)
        assert not BloodCompatibilityEngine.is_compatible("AB+", "O+", ComponentType.FFP.value)


class TestPlateletsAndCryoCompatibility:
    """Verification for Platelets and Cryoprecipitate matrices."""

    def test_platelets_exact_and_compatible(self):
        assert BloodCompatibilityEngine.is_compatible("A+", "A+", ComponentType.PLATELETS.value)
        assert BloodCompatibilityEngine.is_compatible("A+", "A-", ComponentType.PLATELETS.value)

    def test_cryo_compatibility(self):
        assert BloodCompatibilityEngine.is_compatible("O+", "O+", ComponentType.CRYO.value)
        assert BloodCompatibilityEngine.is_compatible("AB+", "AB+", ComponentType.CRYO.value)
