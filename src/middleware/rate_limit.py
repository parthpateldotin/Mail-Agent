"""Rate limiting middleware."""
from datetime import datetime, timedelta
from typing import Callable, Dict, Optional, Tuple

from fastapi import FastAPI, HTTPException, Request, Response, status
from redis.asyncio import Redis
import json

from src.core.config import settings


class RateLimiter:
    """Rate limiter using Redis."""

    def __init__(self, redis: Redis):
        self.redis = redis
        self.rate_limits: Dict[str, Dict] = {
            # Auth endpoints
            "POST:/v1/auth/register": {"calls": 5, "period": 300},  # 5 calls per 5 minutes
            "POST:/v1/auth/login": {"calls": 5, "period": 300},     # 5 calls per 5 minutes
            "POST:/v1/auth/password-reset/request": {"calls": 3, "period": 900},  # 3 calls per 15 minutes
            "POST:/v1/auth/verify-email/request": {"calls": 3, "period": 900},    # 3 calls per 15 minutes
            "POST:/v1/auth/verify-email/resend": {"calls": 3, "period": 900},     # 3 calls per 15 minutes
            
            # Default rate limit for other endpoints
            "default": {"calls": 100, "period": 60}  # 100 calls per minute
        }

    async def is_rate_limited(
        self,
        key: str,
        limit: int,
        period: int
    ) -> Tuple[bool, Optional[int], Optional[int]]:
        """Check if request is rate limited."""
        now = datetime.utcnow().timestamp()
        redis_key = f"rate_limit:{key}"
        
        # Get current window data
        window_data = await self.redis.get(redis_key)
        if window_data:
            data = json.loads(window_data)
            window_start = data["window_start"]
            request_count = data["request_count"]
            
            # Check if window has expired
            if now - window_start > period:
                # Start new window
                window_start = now
                request_count = 1
            else:
                request_count += 1
        else:
            # First request in window
            window_start = now
            request_count = 1
        
        # Store updated window data
        await self.redis.setex(
            redis_key,
            period,
            json.dumps({
                "window_start": window_start,
                "request_count": request_count
            })
        )
        
        # Calculate remaining
        remaining = max(0, limit - request_count)
        reset_time = int(window_start + period)
        
        return request_count > limit, remaining, reset_time

    def get_rate_limit(self, method: str, path: str) -> Dict:
        """Get rate limit configuration for endpoint."""
        endpoint = f"{method}:{path}"
        return self.rate_limits.get(endpoint, self.rate_limits["default"])


async def rate_limit_middleware(
    request: Request,
    call_next: Callable
) -> Response:
    """Rate limiting middleware."""
    # Skip rate limiting if disabled
    if not settings.RATE_LIMIT_ENABLED:
        return await call_next(request)
    
    # Get rate limiter from app state
    rate_limiter: RateLimiter = request.app.state.rate_limiter
    
    # Get client identifier (IP address or API key)
    client_id = request.headers.get("X-API-Key") or request.client.host
    
    # Get rate limit for endpoint
    rate_limit = rate_limiter.get_rate_limit(
        request.method,
        request.url.path
    )
    
    # Create rate limit key
    rate_limit_key = f"{client_id}:{request.method}:{request.url.path}"
    
    # Check rate limit
    is_limited, remaining, reset_time = await rate_limiter.is_rate_limited(
        rate_limit_key,
        rate_limit["calls"],
        rate_limit["period"]
    )
    
    if is_limited:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Rate limit exceeded"
        )
    
    # Return rate limit headers with response
    response = await call_next(request)
    response.headers["X-RateLimit-Limit"] = str(rate_limit["calls"])
    response.headers["X-RateLimit-Remaining"] = str(remaining)
    response.headers["X-RateLimit-Reset"] = str(reset_time)
    
    return response


def setup_rate_limiting(redis: Redis) -> RateLimiter:
    """Set up rate limiting for FastAPI application."""
    return RateLimiter(redis) 