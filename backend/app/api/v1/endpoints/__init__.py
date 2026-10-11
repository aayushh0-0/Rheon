from app.api.v1.endpoints.facilities import router as facilities_router
from app.api.v1.endpoints.inventory import router as inventory_router
from app.api.v1.endpoints.donors import router as donors_router
from app.api.v1.endpoints.requests import router as requests_router
from app.api.v1.endpoints.matching import router as matching_router
from app.api.v1.endpoints.planning import router as planning_router
from app.api.v1.endpoints.events import router as events_router

__all__ = [
    "facilities_router",
    "inventory_router",
    "donors_router",
    "requests_router",
    "matching_router",
    "planning_router",
    "events_router",
]
