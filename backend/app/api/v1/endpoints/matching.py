from typing import List, Dict, Any
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.matching import MatchingRequest, MatchingResponse
from app.services.matching.engine import SourceMatchingEngine
from app.services.compatibility.engine import BloodCompatibilityEngine
from app.services.compatibility.matrix import (
    RBC_COMPATIBILITY_PREFERENCE,
    FFP_COMPATIBILITY_PREFERENCE,
    PLATELETS_COMPATIBILITY_PREFERENCE,
    CRYO_COMPATIBILITY_PREFERENCE,
)

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.post(
    "/evaluate",
    response_model=MatchingResponse,
    summary="Evaluate & Rank Source Candidates",
    description="Deterministic evaluation of all potential blood inventory sources for an emergency request.",
)
def evaluate_matching_candidates(
    payload: MatchingRequest,
    db: Session = Depends(get_db),
) -> MatchingResponse:
    return SourceMatchingEngine.evaluate_candidates(db, payload)


@router.get(
    "/compatibility-matrix",
    summary="Get Compatibility Matrix",
    description="Returns the biological donor-recipient compatibility preference ranking for a component type.",
)
def get_compatibility_matrix(
    component_type: str = Query("RBC", description="Component type: RBC, FFP, PLATELETS, CRYO"),
) -> Dict[str, Any]:
    comp = component_type.upper()
    if comp in ["RBC", "PRBC"]:
        matrix = RBC_COMPATIBILITY_PREFERENCE
    elif comp == "FFP":
        matrix = FFP_COMPATIBILITY_PREFERENCE
    elif comp == "PLATELETS":
        matrix = PLATELETS_COMPATIBILITY_PREFERENCE
    elif comp == "CRYO":
        matrix = CRYO_COMPATIBILITY_PREFERENCE
    else:
        matrix = RBC_COMPATIBILITY_PREFERENCE

    return {
        "component_type": comp,
        "matrix": matrix,
    }


@router.get(
    "/compatibility-check",
    summary="Check Donor-Recipient Compatibility",
    description="Deterministic check to determine if a specific donor group can be safely transfused to a recipient.",
)
def check_compatibility(
    recipient_blood_group: str = Query(..., description="Recipient blood group (e.g. A+, O-)"),
    donor_blood_group: str = Query(..., description="Donor blood group (e.g. O-, A+)"),
    component_type: str = Query("RBC", description="Component type (RBC, FFP, etc.)"),
) -> Dict[str, Any]:
    is_compat = BloodCompatibilityEngine.is_compatible(
        recipient_group=recipient_blood_group,
        donor_group=donor_blood_group,
        component_type=component_type,
    )
    is_exact = BloodCompatibilityEngine.is_exact_match(
        recipient_group=recipient_blood_group,
        donor_group=donor_blood_group,
    )
    is_univ = BloodCompatibilityEngine.is_universal_donor(
        donor_group=donor_blood_group,
        component_type=component_type,
    )
    score = BloodCompatibilityEngine.get_compatibility_score(
        recipient_group=recipient_blood_group,
        donor_group=donor_blood_group,
        component_type=component_type,
    )
    rank = BloodCompatibilityEngine.get_preference_rank(
        recipient_group=recipient_blood_group,
        donor_group=donor_blood_group,
        component_type=component_type,
    )

    return {
        "recipient_blood_group": recipient_blood_group,
        "donor_blood_group": donor_blood_group,
        "component_type": component_type.upper(),
        "is_compatible": is_compat,
        "is_exact_match": is_exact,
        "is_universal_donor": is_univ,
        "preference_rank": rank,
        "compatibility_score": score,
    }
