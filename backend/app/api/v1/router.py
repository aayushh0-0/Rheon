from fastapi import APIRouter, status
from app.schemas.health import HealthResponse
from app.core.config import settings
from app.api.v1.endpoints.facilities import router as facilities_router
from app.api.v1.endpoints.inventory import router as inventory_router
from app.api.v1.endpoints.donors import router as donors_router
from app.api.v1.endpoints.requests import router as requests_router
from app.api.v1.endpoints.matching import router as matching_router
from app.api.v1.endpoints.planning import router as planning_router
from app.api.v1.endpoints.events import router as events_router
from app.api.v1.endpoints.agents import router as agents_router

api_router = APIRouter()


@api_router.get(
    "/health",
    response_model=HealthResponse,
    status_code=status.HTTP_200_OK,
    summary="System Health & Status Check",
    description="Returns the operational status of the RHEON AI backend service.",
    tags=["Health"],
)
async def health_check() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        project=settings.PROJECT_NAME,
        tagline=settings.TAGLINE,
        version=settings.VERSION,
        environment=settings.ENVIRONMENT,
    )


# Include Sub-Routers
api_router.include_router(facilities_router)
api_router.include_router(inventory_router)
api_router.include_router(donors_router)
api_router.include_router(requests_router)
api_router.include_router(matching_router)
api_router.include_router(planning_router)
api_router.include_router(events_router)
api_router.include_router(agents_router)
