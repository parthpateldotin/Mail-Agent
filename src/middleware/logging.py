"""Logging middleware."""
import time
import uuid
from typing import Callable

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from src.core.logging import access_logger, error_logger


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests and responses."""

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request/response and log details."""
        request_id = str(uuid.uuid4())
        start_time = time.time()
        
        # Extract request details
        request_details = {
            "request_id": request_id,
            "method": request.method,
            "url": str(request.url),
            "client_ip": request.client.host if request.client else None,
            "user_agent": request.headers.get("user-agent"),
        }
        
        # Get user ID if authenticated
        user_id = None
        if hasattr(request.state, "user"):
            user_id = request.state.user.id
            request_details["user_id"] = user_id

        # Log request
        access_logger.info(
            f"Incoming request: {request.method} {request.url.path}",
            extra=request_details
        )

        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log successful response
            access_logger.info(
                f"Request completed: {request.method} {request.url.path}",
                extra={
                    **request_details,
                    "status_code": response.status_code,
                    "duration_ms": duration_ms
                }
            )
            
            return response

        except Exception as e:
            # Calculate duration
            duration_ms = (time.time() - start_time) * 1000
            
            # Log error
            error_logger.error(
                f"Request failed: {request.method} {request.url.path}",
                extra={
                    **request_details,
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "duration_ms": duration_ms
                },
                exc_info=True
            )
            raise


def setup_logging_middleware(app: FastAPI) -> None:
    """Set up logging middleware for the application."""
    app.add_middleware(RequestLoggingMiddleware) 