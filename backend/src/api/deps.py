"""API dependencies."""
from typing import AsyncGenerator, Optional
from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from redis.asyncio import Redis
import time

from src.core.config import get_app_settings
from src.core.security import decode_access_token
from src.db.session import async_session_maker
from src.core.exceptions import RateLimitError
from src.models.user import User
from src.services.users import UserService
from src.services.session.session_service import SessionService

settings = get_app_settings()

# OAuth2
reusable_oauth2 = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

# Database
async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Get database session."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()

# Redis
redis: Optional[Redis] = None

async def get_redis() -> Redis:
    """Get Redis connection."""
    global redis
    if redis is None:
        redis = Redis(
            host=settings.REDIS_HOST,
            port=settings.REDIS_PORT,
            db=settings.REDIS_DB,
            password=settings.REDIS_PASSWORD,
            decode_responses=True
        )
    return redis

# Rate Limiter
class RateLimiter:
    """Rate limiter using Redis."""
    
    def __init__(self, redis: Redis):
        self.redis = redis
        self.rate_limit = settings.DEFAULT_RATE_LIMIT_CALLS
        self.rate_limit_period = settings.DEFAULT_RATE_LIMIT_PERIOD

    async def check_rate_limit(self, user_id: str, action: str) -> None:
        """Check if the rate limit has been exceeded."""
        if not settings.RATE_LIMIT_ENABLED:
            return

        key = f"rate_limit:{user_id}:{action}"
        current_time = int(time.time())
        window_start = current_time - self.rate_limit_period

        async with self.redis.pipeline() as pipe:
            # Clean old records
            await pipe.zremrangebyscore(key, 0, window_start)
            # Count requests in current window
            await pipe.zcard(key)
            # Add new request
            await pipe.zadd(key, {str(current_time): current_time})
            # Set expiry
            await pipe.expire(key, self.rate_limit_period)
            # Execute pipeline
            _, request_count, *_ = await pipe.execute()

        if request_count > self.rate_limit:
            raise RateLimitError(
                f"Rate limit exceeded for {action}. "
                f"Maximum {self.rate_limit} requests per {self.rate_limit_period} seconds."
            )

async def get_rate_limiter(
    redis: Redis = Depends(get_redis)
) -> RateLimiter:
    """Get rate limiter instance."""
    return RateLimiter(redis)

# Authentication
async def get_current_user(
    token: str = Depends(reusable_oauth2)
) -> Optional[User]:
    """Get current authenticated user."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    token_data = decode_access_token(token)
    if not token_data:
        raise credentials_exception
    
    return token_data.sub

async def get_current_active_user(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current active user."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

async def get_current_superuser(
    current_user: User = Depends(get_current_user)
) -> User:
    """Get current superuser."""
    if not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not enough privileges"
        )
    return current_user

# Session Management
async def get_session_service(
    redis: Redis = Depends(get_redis)
) -> SessionService:
    """Get session service instance."""
    return SessionService(redis)

def get_session_data(request: Request) -> Optional[dict]:
    """Get session data from request."""
    return getattr(request.state, "session", None)

def get_session_id(request: Request) -> Optional[str]:
    """Get session ID from request."""
    return request.cookies.get(settings.SESSION_COOKIE_NAME) 