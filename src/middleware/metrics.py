"""Metrics middleware."""
import time
from typing import Callable

from fastapi import FastAPI, Request, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from starlette.types import ASGIApp

from src.core.metrics import MetricsService


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware for tracking Prometheus metrics."""

    def __init__(self, app: ASGIApp, app_name: str = "app") -> None:
        """Initialize middleware."""
        super().__init__(app)
        self.app_name = app_name

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request/response and track metrics."""
        # Skip metrics endpoint
        if request.url.path == "/metrics":
            return await call_next(request)

        # Start timer
        start_time = time.time()
        
        try:
            # Process request
            response = await call_next(request)
            
            # Calculate duration
            duration = time.time() - start_time
            
            # Track metrics
            MetricsService.track_request(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code,
                duration=duration
            )
            
            return response

        except Exception as e:
            # Calculate duration
            duration = time.time() - start_time
            
            # Track metrics for failed requests
            MetricsService.track_request(
                method=request.method,
                endpoint=request.url.path,
                status_code=500,
                duration=duration
            )
            raise


async def metrics_endpoint() -> Response:
    """Expose Prometheus metrics."""
    return StarletteResponse(
        generate_latest(),
        media_type=CONTENT_TYPE_LATEST
    )


def setup_metrics(app: FastAPI, app_name: str = "app") -> None:
    """Set up metrics middleware and endpoint."""
    # Add metrics endpoint
    app.add_route("/metrics", metrics_endpoint)
    
    # Add middleware
    app.add_middleware(
        PrometheusMiddleware,
        app_name=app_name
    ) 