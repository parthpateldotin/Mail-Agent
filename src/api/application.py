from typing import AsyncGenerator, Callable
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from src.api.events import create_start_app_handler, create_stop_app_handler
from src.core.config import get_app_settings
from src.core.logging import setup_logging


def create_application() -> FastAPI:
    """Create FastAPI application with all configurations."""
    settings = get_app_settings()
    setup_logging(settings)

    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url=settings.DOCS_URL,
        redoc_url=settings.REDOC_URL,
        openapi_url=settings.OPENAPI_URL,
    )

    # Set up CORS middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Set up Prometheus metrics
    if settings.ENABLE_METRICS:
        Instrumentator().instrument(application).expose(
            application,
            include_in_schema=False,
            should_gzip=True,
        )

    # Set up event handlers
    application.add_event_handler(
        "startup",
        create_start_app_handler(application),
    )
    application.add_event_handler(
        "shutdown",
        create_stop_app_handler(application),
    )

    # Include routers
    from src.api.routes import api_router
    application.include_router(api_router, prefix=settings.API_PREFIX)

    return application


# Create FastAPI application instance
app = create_application() 