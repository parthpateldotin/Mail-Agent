"""FastAPI application factory."""
import logging
from typing import Callable
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from prometheus_fastapi_instrumentator import Instrumentator
from starlette.middleware.sessions import SessionMiddleware

from src.api.events import create_start_app_handler, create_stop_app_handler
from src.api.middleware import (
    RequestLoggingMiddleware,
    ResponseTimeMiddleware,
    ErrorHandlingMiddleware
)
from src.core.config import get_app_settings
from src.core.exceptions import BaseError
from src.core.logging import setup_logging

logger = logging.getLogger(__name__)

def create_application() -> FastAPI:
    """Create FastAPI application with all configurations."""
    settings = get_app_settings()
    setup_logging()

    # Create FastAPI application
    application = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="AiMail API with OpenAI Integration",
        docs_url=settings.DOCS_URL if settings.ENABLE_DOCS else None,
        redoc_url=settings.REDOC_URL if settings.ENABLE_DOCS else None,
        openapi_url=settings.OPENAPI_URL if settings.ENABLE_DOCS else None,
        debug=settings.DEBUG,
    )

    # Set up error handlers
    @application.exception_handler(BaseError)
    async def custom_exception_handler(request: Request, exc: BaseError) -> JSONResponse:
        """Handle custom exceptions."""
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "message": exc.message,
                "details": exc.details,
                "code": exc.__class__.__name__,
            },
        )

    # Set up middleware
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Request-ID", "X-API-Version"],
    )

    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )

    application.add_middleware(GZipMiddleware, minimum_size=1000)
    application.add_middleware(RequestLoggingMiddleware)
    application.add_middleware(ResponseTimeMiddleware)
    application.add_middleware(ErrorHandlingMiddleware)

    # Set up session middleware
    application.add_middleware(
        SessionMiddleware,
        secret_key=settings.SECRET_KEY,
        session_cookie=settings.SESSION_COOKIE_NAME,
        max_age=settings.SESSION_EXPIRY_DAYS * 24 * 60 * 60,  # Convert days to seconds
        same_site=settings.SESSION_COOKIE_SAMESITE,
        https_only=settings.SESSION_COOKIE_SECURE,
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
    application.include_router(
        api_router,
        prefix=settings.API_PREFIX,
    )

    # Add version header middleware
    @application.middleware("http")
    async def add_version_header(request: Request, call_next: Callable) -> JSONResponse:
        """Add API version header to response."""
        response = await call_next(request)
        response.headers["X-API-Version"] = settings.VERSION
        return response

    logger.info(
        f"Application {settings.PROJECT_NAME} v{settings.VERSION} "
        f"initialized in {settings.ENVIRONMENT} mode"
    )
    return application


# Create FastAPI application instance
app = create_application() 