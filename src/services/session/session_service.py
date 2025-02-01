"""Session management service."""
import json
import uuid
from datetime import datetime, timedelta
from typing import Any, Dict, Optional, Union

from fastapi import HTTPException, status
from redis.asyncio import Redis

from src.core.config import settings
from src.core.logging import LoggerMixin
from src.core.metrics import MetricsService


class SessionService(LoggerMixin):
    """Service for managing user sessions."""

    def __init__(self, redis: Redis) -> None:
        """Initialize session service."""
        super().__init__()
        self.redis = redis
        self.prefix = "session:"
        self.default_expiry = timedelta(days=settings.SESSION_EXPIRY_DAYS)

    def _get_key(self, session_id: str) -> str:
        """Get Redis key for session."""
        return f"{self.prefix}{session_id}"

    async def create_session(
        self,
        user_id: int,
        data: Optional[Dict[str, Any]] = None,
        expiry: Optional[timedelta] = None
    ) -> str:
        """Create a new session."""
        session_id = str(uuid.uuid4())
        key = self._get_key(session_id)
        
        session_data = {
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat(),
            "last_accessed": datetime.utcnow().isoformat(),
            "data": data or {}
        }
        
        try:
            await self.redis.setex(
                key,
                expiry or self.default_expiry,
                json.dumps(session_data)
            )
            
            self.log_info(
                "Session created",
                extra={
                    "session_id": session_id,
                    "user_id": user_id
                }
            )
            
            MetricsService.track_cache(hit=True, cache_type="session_create")
            return session_id
            
        except Exception as e:
            self.log_error(
                "Failed to create session",
                error=e,
                extra={
                    "session_id": session_id,
                    "user_id": user_id
                }
            )
            MetricsService.track_cache(hit=False, cache_type="session_create")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create session"
            )

    async def get_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get session data."""
        key = self._get_key(session_id)
        
        try:
            data = await self.redis.get(key)
            if not data:
                self.log_warning(
                    "Session not found",
                    extra={"session_id": session_id}
                )
                MetricsService.track_cache(hit=False, cache_type="session_get")
                return None
            
            session_data = json.loads(data)
            
            # Update last accessed time
            session_data["last_accessed"] = datetime.utcnow().isoformat()
            await self.redis.setex(
                key,
                self.default_expiry,
                json.dumps(session_data)
            )
            
            MetricsService.track_cache(hit=True, cache_type="session_get")
            return session_data
            
        except Exception as e:
            self.log_error(
                "Failed to get session",
                error=e,
                extra={"session_id": session_id}
            )
            MetricsService.track_cache(hit=False, cache_type="session_get")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to get session"
            )

    async def update_session(
        self,
        session_id: str,
        data: Dict[str, Any]
    ) -> bool:
        """Update session data."""
        key = self._get_key(session_id)
        
        try:
            current_data = await self.redis.get(key)
            if not current_data:
                self.log_warning(
                    "Session not found for update",
                    extra={"session_id": session_id}
                )
                MetricsService.track_cache(hit=False, cache_type="session_update")
                return False
            
            session_data = json.loads(current_data)
            session_data["data"].update(data)
            session_data["last_accessed"] = datetime.utcnow().isoformat()
            
            await self.redis.setex(
                key,
                self.default_expiry,
                json.dumps(session_data)
            )
            
            self.log_info(
                "Session updated",
                extra={"session_id": session_id}
            )
            
            MetricsService.track_cache(hit=True, cache_type="session_update")
            return True
            
        except Exception as e:
            self.log_error(
                "Failed to update session",
                error=e,
                extra={"session_id": session_id}
            )
            MetricsService.track_cache(hit=False, cache_type="session_update")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to update session"
            )

    async def delete_session(self, session_id: str) -> bool:
        """Delete a session."""
        key = self._get_key(session_id)
        
        try:
            result = await self.redis.delete(key)
            success = bool(result)
            
            if success:
                self.log_info(
                    "Session deleted",
                    extra={"session_id": session_id}
                )
                MetricsService.track_cache(hit=True, cache_type="session_delete")
            else:
                self.log_warning(
                    "Session not found for deletion",
                    extra={"session_id": session_id}
                )
                MetricsService.track_cache(hit=False, cache_type="session_delete")
            
            return success
            
        except Exception as e:
            self.log_error(
                "Failed to delete session",
                error=e,
                extra={"session_id": session_id}
            )
            MetricsService.track_cache(hit=False, cache_type="session_delete")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to delete session"
            )

    async def extend_session(
        self,
        session_id: str,
        duration: Optional[timedelta] = None
    ) -> bool:
        """Extend session expiry time."""
        key = self._get_key(session_id)
        
        try:
            data = await self.redis.get(key)
            if not data:
                self.log_warning(
                    "Session not found for extension",
                    extra={"session_id": session_id}
                )
                MetricsService.track_cache(hit=False, cache_type="session_extend")
                return False
            
            await self.redis.expire(
                key,
                duration or self.default_expiry
            )
            
            self.log_info(
                "Session extended",
                extra={"session_id": session_id}
            )
            
            MetricsService.track_cache(hit=True, cache_type="session_extend")
            return True
            
        except Exception as e:
            self.log_error(
                "Failed to extend session",
                error=e,
                extra={"session_id": session_id}
            )
            MetricsService.track_cache(hit=False, cache_type="session_extend")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to extend session"
            )

    async def cleanup_expired_sessions(self) -> int:
        """Clean up expired sessions."""
        try:
            pattern = f"{self.prefix}*"
            cursor = 0
            deleted_count = 0
            
            while True:
                cursor, keys = await self.redis.scan(
                    cursor=cursor,
                    match=pattern,
                    count=100
                )
                
                for key in keys:
                    if not await self.redis.exists(key):
                        deleted_count += 1
                
                if cursor == 0:
                    break
            
            self.log_info(
                "Expired sessions cleaned up",
                extra={"deleted_count": deleted_count}
            )
            
            return deleted_count
            
        except Exception as e:
            self.log_error(
                "Failed to cleanup expired sessions",
                error=e
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to cleanup expired sessions"
            ) 