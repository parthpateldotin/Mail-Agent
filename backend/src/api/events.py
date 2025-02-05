"""Application event handlers."""
from typing import Callable

from fastapi import FastAPI
from redis.asyncio import Redis

from src.db.session import engine, async_session_maker
from src.core.config import settings


def create_start_app_handler(app: FastAPI) -> Callable:
    """Create start application handler."""
    async def start_app() -> None:
        """Start application."""
        # Initialize Redis
        app.state.redis = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
    
    return start_app


def create_stop_app_handler(app: FastAPI) -> Callable:
    """Create stop application handler."""
    async def stop_app() -> None:
        """Stop application."""
        # Close Redis connection
        await app.state.redis.close()
        
        # Close database connections
        await engine.dispose()
    
    return stop_app 