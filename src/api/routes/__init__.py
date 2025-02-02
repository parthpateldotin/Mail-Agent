"""API routes configuration."""
from fastapi import APIRouter

from src.api.routes import (
    auth,
    emails,
    folders,
    labels,
    threads,
    users,
    ai,
    admin,
    health,
)

# Create main API router
api_router = APIRouter()

# Include all route modules
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"],
)

api_router.include_router(
    users.router,
    prefix="/users",
    tags=["Users"],
)

api_router.include_router(
    emails.router,
    prefix="/emails",
    tags=["Emails"],
)

api_router.include_router(
    folders.router,
    prefix="/folders",
    tags=["Folders"],
)

api_router.include_router(
    labels.router,
    prefix="/labels",
    tags=["Labels"],
)

api_router.include_router(
    threads.router,
    prefix="/threads",
    tags=["Threads"],
)

api_router.include_router(
    ai.router,
    prefix="/ai",
    tags=["AI Features"],
)

api_router.include_router(
    admin.router,
    prefix="/admin",
    tags=["Administration"],
)

api_router.include_router(
    health.router,
    prefix="/health",
    tags=["Health Checks"],
    include_in_schema=False,
) 