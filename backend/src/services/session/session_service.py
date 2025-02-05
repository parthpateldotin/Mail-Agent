"""Session service module."""
from typing import Optional
from datetime import datetime, timedelta

from redis.asyncio import Redis

from src.core.config import settings


class SessionService:
    """Session service."""
    
    def __init__(self, redis: Redis):
        """Initialize service."""
        self.redis = redis
        self.prefix = "session:"
        self.expire = timedelta(minutes=settings.SESSION_EXPIRE_MINUTES)
    
    async def create_session(self, user_id: str, data: dict) -> str:
        """Create new session."""
        session_id = f"{self.prefix}{user_id}"
        await self.redis.hmset(session_id, data)
        await self.redis.expire(session_id, self.expire)
        return session_id
    
    async def get_session(self, session_id: str) -> Optional[dict]:
        """Get session data."""
        if not session_id.startswith(self.prefix):
            session_id = f"{self.prefix}{session_id}"
        
        data = await self.redis.hgetall(session_id)
        if not data:
            return None
        
        # Extend session
        await self.redis.expire(session_id, self.expire)
        return data
    
    async def update_session(
        self,
        session_id: str,
        data: dict
    ) -> bool:
        """Update session data."""
        if not session_id.startswith(self.prefix):
            session_id = f"{self.prefix}{session_id}"
        
        if not await self.redis.exists(session_id):
            return False
        
        await self.redis.hmset(session_id, data)
        await self.redis.expire(session_id, self.expire)
        return True
    
    async def delete_session(self, session_id: str) -> bool:
        """Delete session."""
        if not session_id.startswith(self.prefix):
            session_id = f"{self.prefix}{session_id}"
        
        return bool(await self.redis.delete(session_id))
    
    async def cleanup_expired_sessions(self) -> None:
        """Clean up expired sessions."""
        pattern = f"{self.prefix}*"
        cursor = 0
        while True:
            cursor, keys = await self.redis.scan(
                cursor,
                match=pattern,
                count=100
            )
            for key in keys:
                if not await self.redis.exists(key):
                    await self.redis.delete(key)
            if cursor == 0:
                break 