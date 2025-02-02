"""Health check endpoints."""
import logging
from typing import Dict, Any
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis

from src.api.deps import get_db, get_redis
from src.core.config import get_app_settings
from src.database.base import check_database_connection
from src.services.admin import AdminService

router = APIRouter()
logger = logging.getLogger(__name__)
settings = get_app_settings()

@router.get("/")
async def health_check() -> Dict[str, str]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    }

@router.get("/readiness")
async def readiness_check(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
) -> Dict[str, Any]:
    """Readiness check endpoint."""
    try:
        # Check database connection
        db_status = await check_database_connection(db)
        
        # Check Redis connection
        redis_status = await redis.ping()
        
        # Check admin service
        admin_service = AdminService()
        admin_status = await admin_service.check_health()
        
        return {
            "status": "ready",
            "checks": {
                "database": {
                    "status": "up" if db_status else "down",
                },
                "redis": {
                    "status": "up" if redis_status else "down",
                },
                "admin": admin_status,
            },
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        return {
            "status": "not_ready",
            "error": str(e),
            "service": settings.PROJECT_NAME,
            "version": settings.VERSION,
            "environment": settings.ENVIRONMENT,
        }

@router.get("/liveness")
async def liveness_check() -> Dict[str, Any]:
    """Liveness check endpoint."""
    return {
        "status": "alive",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
    } 