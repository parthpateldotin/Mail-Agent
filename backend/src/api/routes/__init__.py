"""API routes."""
from fastapi import APIRouter

from src.api.routes.auth import router as auth_router
from src.api.routes.users import router as users_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(users_router, prefix="/users", tags=["users"]) 