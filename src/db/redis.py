"""Redis connection handler."""
from typing import AsyncGenerator

from redis.asyncio import Redis, ConnectionPool

from src.core.config import settings


async def init_redis_pool() -> ConnectionPool:
    """Initialize Redis connection pool."""
    return ConnectionPool(
        host=settings.REDIS_HOST,
        port=settings.REDIS_PORT,
        password=settings.REDIS_PASSWORD,
        db=settings.REDIS_DB,
        decode_responses=True
    )


async def get_redis() -> AsyncGenerator[Redis, None]:
    """Get Redis connection from pool."""
    pool = await init_redis_pool()
    async with Redis(connection_pool=pool) as redis:
        yield redis 