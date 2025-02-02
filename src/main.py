"""Main application module."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.utils import get_openapi
from starlette.middleware.base import BaseHTTPMiddleware

from src.api.v1.api import api_router
from src.core.config import settings
from src.db.redis import get_redis
from src.middleware.logging import setup_logging_middleware
from src.middleware.metrics import setup_metrics
from src.middleware.rate_limit import setup_rate_limiting, rate_limit_middleware
from src.middleware.session import setup_session_middleware, session_middleware
from src.services.session.session_service import SessionService


def custom_openapi():
    """Create custom OpenAPI schema."""
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="""
        AiMail API provides a comprehensive email management system with AI-powered features.
        
        ## Features
        * User Authentication with JWT
        * Email Management
        * AI-Powered Email Analysis and Response Generation
        * Real-time Email Processing
        
        ## Authentication
        The API uses JWT tokens for authentication. Most endpoints require a valid access token.
        
        * Access tokens are valid for 30 minutes
        * Refresh tokens are valid for 7 days
        * Rate limiting is applied to authentication endpoints
        
        ## OpenAI Integration
        The API integrates with OpenAI for:
        * Email content analysis
        * Response suggestions
        * Email summarization
        * Priority classification
        
        ## Rate Limiting
        Rate limits are applied to protect the API:
        * Authentication endpoints: 5 requests per 5 minutes
        * Password reset: 3 requests per 15 minutes
        * Email verification: 3 requests per 15 minutes
        * OpenAI endpoints: 10 requests per minute
        """,
        routes=app.routes,
    )

    # Security schemes
    openapi_schema["components"]["securitySchemes"] = {
        "bearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
            "description": "Enter the JWT token in the format: Bearer <token>"
        },
        "APIKeyAuth": {
            "type": "apiKey",
            "in": "header",
            "name": "X-API-Key",
            "description": "Optional API key for higher rate limits"
        }
    }

    # Add security requirement to all operations
    if "security" not in openapi_schema:
        openapi_schema["security"] = []
    
    openapi_schema["security"].append({"bearerAuth": []})

    # Add OpenAI-specific tags
    openapi_schema["tags"].append({
        "name": "AI Features",
        "description": "Endpoints for AI-powered email features using OpenAI",
        "externalDocs": {
            "description": "OpenAI API Documentation",
            "url": "https://platform.openai.com/docs/api-reference"
        }
    })

    app.openapi_schema = openapi_schema
    return app.openapi_schema


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Rate limiting middleware."""
    async def dispatch(self, request, call_next):
        return await rate_limit_middleware(request, call_next)


class SessionMiddleware(BaseHTTPMiddleware):
    """Session middleware."""
    async def dispatch(self, request, call_next):
        return await session_middleware(request, call_next)


def create_application() -> FastAPI:
    """Create FastAPI application."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.VERSION,
        description="AiMail API with OpenAI Integration",
        docs_url=settings.DOCS_URL if settings.ENABLE_DOCS else None,
        redoc_url=settings.REDOC_URL if settings.ENABLE_DOCS else None,
        openapi_url=settings.OPENAPI_URL if settings.ENABLE_DOCS else None
    )
    
    # Set up CORS
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.ALLOWED_HOSTS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    
    # Set up rate limiting and session middleware
    app.add_middleware(RateLimitMiddleware)
    app.add_middleware(SessionMiddleware)
    
    # Set up logging middleware
    setup_logging_middleware(app)
    
    # Set up metrics if enabled
    if settings.ENABLE_METRICS:
        setup_metrics(app, settings.PROJECT_NAME)
    
    # Include API router
    app.include_router(api_router, prefix=settings.API_PREFIX)
    
    # Custom OpenAPI schema
    app.openapi = custom_openapi
    
    return app


app = create_application()


@app.on_event("startup")
async def startup_event() -> None:
    """Initialize application services on startup."""
    # Initialize Redis connection
    redis = await anext(get_redis())
    
    # Set up rate limiting
    rate_limiter = setup_rate_limiting(redis)
    app.state.rate_limiter = rate_limiter
    
    # Set up session service
    session_service = SessionService(redis)
    app.state.session_service = session_service 