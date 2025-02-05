"""FastAPI application factory."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware

from src.api.events import create_start_app_handler, create_stop_app_handler
from src.api.routes import api_router
from src.core.config import settings


def create_application() -> FastAPI:
    """Create FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        docs_url="/api/docs" if settings.ENABLE_DOCS else None,
        redoc_url="/api/redoc" if settings.ENABLE_DOCS else None,
        openapi_url="/api/openapi.json" if settings.ENABLE_DOCS else None,
    )
    
    # Set all CORS enabled origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Set trusted hosts
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )
    
    # Set up event handlers
    app.add_event_handler(
        "startup",
        create_start_app_handler(app)
    )
    app.add_event_handler(
        "shutdown",
        create_stop_app_handler(app)
    )
    
    # Include API router
    app.include_router(api_router, prefix=settings.API_V1_STR)
    
    return app 