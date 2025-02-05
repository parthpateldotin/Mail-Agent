"""API router configuration."""
from fastapi import APIRouter

from src.api.v1.endpoints import (
    ai,
    auth,
    email,
    session,
    users
)

api_router = APIRouter()

# Include routers
api_router.include_router(auth.router, prefix="/auth", tags=["Authentication"])
api_router.include_router(users.router, prefix="/users", tags=["Users"])
api_router.include_router(email.router, prefix="/email", tags=["Email"])
api_router.include_router(ai.router, prefix="/ai", tags=["AI Features"])
api_router.include_router(session.router, prefix="/session", tags=["Sessions"]) 