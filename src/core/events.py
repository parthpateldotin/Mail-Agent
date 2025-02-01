import logging
from typing import Callable
from fastapi import FastAPI
from prometheus_client import make_asgi_app

from src.core.config import settings
from src.database.base import init_db

logger = logging.getLogger(__name__)

def create_start_app_handler(app: FastAPI) -> Callable:
    """Create start-up event handler."""
    async def start_app() -> None:
        # Initialize database
        try:
            await init_db()
            logger.info("Database initialized successfully")
        except Exception as e:
            logger.error(f"Error initializing database: {e}")
            raise

        # Set up Prometheus metrics
        if settings.METRICS_ENABLED:
            metrics_app = make_asgi_app()
            app.mount("/metrics", metrics_app)
            logger.info("Prometheus metrics endpoint mounted")

        # Initialize other services
        logger.info("Application startup complete")

    return start_app

def create_stop_app_handler(app: FastAPI) -> Callable:
    """Create shutdown event handler."""
    async def stop_app() -> None:
        # Clean up resources
        logger.info("Shutting down application")

        # Close database connections
        from src.database.base import engine
        await engine.dispose()
        logger.info("Database connections closed")

        # Clean up other resources
        logger.info("Application shutdown complete")

    return stop_app

def init_logging() -> None:
    """Initialize logging configuration."""
    logging.basicConfig(
        level=logging.INFO if not settings.DEBUG else logging.DEBUG,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    )
    logger.info("Logging initialized") 