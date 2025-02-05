"""Custom middleware for the application."""
import logging
import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import JSONResponse

from src.core.exceptions import BaseError

logger = logging.getLogger(__name__)

class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware for logging requests."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Process the request and log details."""
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id

        logger.info(
            f"Request started",
            extra={
                "request_id": request_id,
                "method": request.method,
                "url": str(request.url),
                "client_host": request.client.host if request.client else None,
                "user_agent": request.headers.get("user-agent"),
            },
        )

        try:
            response = await call_next(request)
            logger.info(
                f"Request completed",
                extra={
                    "request_id": request_id,
                    "status_code": response.status_code,
                },
            )
            response.headers["X-Request-ID"] = request_id
            return response
        except Exception as e:
            logger.error(
                f"Request failed",
                extra={
                    "request_id": request_id,
                    "error": str(e),
                },
                exc_info=True,
            )
            raise

class ResponseTimeMiddleware(BaseHTTPMiddleware):
    """Middleware for measuring response time."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Process the request and measure response time."""
        start_time = time.time()
        
        response = await call_next(request)
        
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        logger.info(
            f"Request processed",
            extra={
                "request_id": getattr(request.state, "request_id", None),
                "process_time": process_time,
            },
        )
        
        return response

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Middleware for handling errors."""

    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        """Process the request and handle any errors."""
        try:
            return await call_next(request)
        except BaseError as e:
            logger.error(
                f"Application error",
                extra={
                    "request_id": getattr(request.state, "request_id", None),
                    "error_type": e.__class__.__name__,
                    "error_message": str(e),
                    "error_details": e.details,
                },
                exc_info=True,
            )
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "message": e.message,
                    "details": e.details,
                    "code": e.__class__.__name__,
                },
            )
        except Exception as e:
            logger.error(
                f"Unhandled error",
                extra={
                    "request_id": getattr(request.state, "request_id", None),
                    "error_type": e.__class__.__name__,
                    "error_message": str(e),
                },
                exc_info=True,
            )
            return JSONResponse(
                status_code=500,
                content={
                    "message": "Internal server error",
                    "code": "InternalServerError",
                },
            ) 