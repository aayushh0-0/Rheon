from typing import Dict, List
from app.schemas.enums import BloodGroup, ComponentType

# RBC/PRBC Compatibility Matrix (Ordered by clinical preference from exact match to universal donor)
RBC_COMPATIBILITY_PREFERENCE: Dict[str, List[str]] = {
    BloodGroup.O_NEG.value: [BloodGroup.O_NEG.value],
    BloodGroup.O_POS.value: [BloodGroup.O_POS.value, BloodGroup.O_NEG.value],
    BloodGroup.A_NEG.value: [BloodGroup.A_NEG.value, BloodGroup.O_NEG.value],
    BloodGroup.A_POS.value: [
        BloodGroup.A_POS.value,
        BloodGroup.A_NEG.value,
        BloodGroup.O_POS.value,
        BloodGroup.O_NEG.value,
    ],
    BloodGroup.B_NEG.value: [BloodGroup.B_NEG.value, BloodGroup.O_NEG.value],
    BloodGroup.B_POS.value: [
        BloodGroup.B_POS.value,
        BloodGroup.B_NEG.value,
        BloodGroup.O_POS.value,
        BloodGroup.O_NEG.value,
    ],
    BloodGroup.AB_NEG.value: [
        BloodGroup.AB_NEG.value,
        BloodGroup.A_NEG.value,
        BloodGroup.B_NEG.value,
        BloodGroup.O_NEG.value,
    ],
    BloodGroup.AB_POS.value: [
        BloodGroup.AB_POS.value,
        BloodGroup.AB_NEG.value,
        BloodGroup.A_POS.value,
        BloodGroup.A_NEG.value,
        BloodGroup.B_POS.value,
        BloodGroup.B_NEG.value,
        BloodGroup.O_POS.value,
        BloodGroup.O_NEG.value,
    ],
}

# FFP (Plasma) Compatibility Matrix (Plasma antibodies reverse RBC rules; AB is universal donor)
FFP_COMPATIBILITY_PREFERENCE: Dict[str, List[str]] = {
    BloodGroup.O_NEG.value: [
        BloodGroup.O_NEG.value,
        BloodGroup.O_POS.value,
        BloodGroup.A_NEG.value,
        BloodGroup.A_POS.value,
        BloodGroup.B_NEG.value,
        BloodGroup.B_POS.value,
        BloodGroup.AB_NEG.value,
        BloodGroup.AB_POS.value,
    ],
    BloodGroup.O_POS.value: [
        BloodGroup.O_POS.value,
        BloodGroup.O_NEG.value,
        BloodGroup.A_POS.value,
        BloodGroup.A_NEG.value,
        BloodGroup.B_POS.value,
        BloodGroup.B_NEG.value,
        BloodGroup.AB_POS.value,
        BloodGroup.AB_NEG.value,
    ],
    BloodGroup.A_NEG.value: [
        BloodGroup.A_NEG.value,
        BloodGroup.A_POS.value,
        BloodGroup.AB_NEG.value,
        BloodGroup.AB_POS.value,
    ],
    BloodGroup.A_POS.value: [
        BloodGroup.A_POS.value,
        BloodGroup.A_NEG.value,
        BloodGroup.AB_POS.value,
        BloodGroup.AB_NEG.value,
    ],
    BloodGroup.B_NEG.value: [
        BloodGroup.B_NEG.value,
        BloodGroup.B_POS.value,
        BloodGroup.AB_NEG.value,
        BloodGroup.AB_POS.value,
    ],
    BloodGroup.B_POS.value: [
        BloodGroup.B_POS.value,
        BloodGroup.B_NEG.value,
        BloodGroup.AB_POS.value,
        BloodGroup.AB_NEG.value,
    ],
    BloodGroup.AB_NEG.value: [BloodGroup.AB_NEG.value, BloodGroup.AB_POS.value],
    BloodGroup.AB_POS.value: [BloodGroup.AB_POS.value, BloodGroup.AB_NEG.value],
}

# Platelets & Cryo follow standard RBC/ABO preferences
PLATELETS_COMPATIBILITY_PREFERENCE = RBC_COMPATIBILITY_PREFERENCE
CRYO_COMPATIBILITY_PREFERENCE = RBC_COMPATIBILITY_PREFERENCE
