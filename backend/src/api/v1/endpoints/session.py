"""Session management endpoints."""
from datetime import datetime, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from src.api.deps import get_current_user, get_redis, get_session_service
from src.core.config import settings
from src.core.logging import LoggerMixin
from src.models.user import User
from src.schemas.session import (
    SessionCreate,
    SessionInfo,
    SessionResponse,
    SessionUpdate
)
from src.services.session.session_service import SessionService


router = APIRouter()
logger = LoggerMixin()


@router.post(
    "/sessions",
    response_model=SessionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new session",
    description="Create a new session for the current user."
)
async def create_session(
    request: Request,
    response: Response,
    data: SessionCreate,
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service)
) -> SessionResponse:
    """Create a new session."""
    # Verify user ID matches current user
    if data.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User ID mismatch"
        )
    
    # Create session
    expiry = timedelta(days=data.expiry_days) if data.expiry_days else None
    session_id = await session_service.create_session(
        user_id=current_user.id,
        data=data.data,
        expiry=expiry
    )
    
    # Store session ID for middleware
    request.state.new_session_id = session_id
    
    # Get session data
    session_data = await session_service.get_session(session_id)
    
    return SessionResponse(
        session_id=session_id,
        user_id=current_user.id,
        created_at=datetime.fromisoformat(session_data["created_at"]),
        last_accessed=datetime.fromisoformat(session_data["last_accessed"]),
        data=session_data["data"],
        expires_in_days=data.expiry_days or settings.SESSION_EXPIRY_DAYS
    )


@router.get(
    "/sessions/current",
    response_model=SessionResponse,
    summary="Get current session",
    description="Get information about the current session."
)
async def get_current_session(
    request: Request,
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service)
) -> SessionResponse:
    """Get current session."""
    session_id = getattr(request.state, "session_id", None)
    if not session_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active session"
        )
    
    session_data = await session_service.get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify session belongs to current user
    if session_data["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session belongs to another user"
        )
    
    return SessionResponse(
        session_id=session_id,
        user_id=current_user.id,
        created_at=datetime.fromisoformat(session_data["created_at"]),
        last_accessed=datetime.fromisoformat(session_data["last_accessed"]),
        data=session_data["data"],
        expires_in_days=settings.SESSION_EXPIRY_DAYS
    )


@router.get(
    "/sessions",
    response_model=List[SessionInfo],
    summary="List user sessions",
    description="List all active sessions for the current user."
)
async def list_sessions(
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service)
) -> List[SessionInfo]:
    """List user sessions."""
    # Get all sessions with prefix
    pattern = f"{session_service.prefix}*"
    sessions = []
    cursor = 0
    
    while True:
        cursor, keys = await session_service.redis.scan(
            cursor=cursor,
            match=pattern,
            count=100
        )
        
        for key in keys:
            try:
                data = await session_service.redis.get(key)
                if data:
                    session_data = session_service._parse_session_data(data)
                    if session_data["user_id"] == current_user.id:
                        ttl = await session_service.redis.ttl(key)
                        sessions.append(
                            SessionInfo(
                                session_id=key.decode().replace(session_service.prefix, ""),
                                created_at=datetime.fromisoformat(session_data["created_at"]),
                                last_accessed=datetime.fromisoformat(session_data["last_accessed"]),
                                expires_in_days=ttl / (24 * 60 * 60) if ttl > 0 else 0,
                                user_agent=session_data.get("user_agent"),
                                ip_address=session_data.get("ip_address")
                            )
                        )
            except Exception as e:
                logger.log_error(
                    "Error processing session",
                    error=e,
                    extra={"key": key}
                )
        
        if cursor == 0:
            break
    
    return sessions


@router.put(
    "/sessions/{session_id}",
    response_model=SessionResponse,
    summary="Update session",
    description="Update session data for the specified session."
)
async def update_session(
    session_id: str,
    data: SessionUpdate,
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service)
) -> SessionResponse:
    """Update session data."""
    # Get session
    session_data = await session_service.get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify session belongs to current user
    if session_data["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session belongs to another user"
        )
    
    # Update session
    success = await session_service.update_session(session_id, data.data)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update session"
        )
    
    # Get updated session data
    updated_data = await session_service.get_session(session_id)
    
    return SessionResponse(
        session_id=session_id,
        user_id=current_user.id,
        created_at=datetime.fromisoformat(updated_data["created_at"]),
        last_accessed=datetime.fromisoformat(updated_data["last_accessed"]),
        data=updated_data["data"],
        expires_in_days=settings.SESSION_EXPIRY_DAYS
    )


@router.delete(
    "/sessions/{session_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete session",
    description="Delete the specified session."
)
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service)
) -> None:
    """Delete session."""
    # Get session
    session_data = await session_service.get_session(session_id)
    if not session_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Session not found"
        )
    
    # Verify session belongs to current user
    if session_data["user_id"] != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Session belongs to another user"
        )
    
    # Delete session
    success = await session_service.delete_session(session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete session"
        )


@router.delete(
    "/sessions",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete all sessions",
    description="Delete all sessions for the current user."
)
async def delete_all_sessions(
    current_user: User = Depends(get_current_user),
    session_service: SessionService = Depends(get_session_service)
) -> None:
    """Delete all user sessions."""
    pattern = f"{session_service.prefix}*"
    cursor = 0
    
    while True:
        cursor, keys = await session_service.redis.scan(
            cursor=cursor,
            match=pattern,
            count=100
        )
        
        for key in keys:
            try:
                data = await session_service.redis.get(key)
                if data:
                    session_data = session_service._parse_session_data(data)
                    if session_data["user_id"] == current_user.id:
                        await session_service.redis.delete(key)
            except Exception as e:
                logger.log_error(
                    "Error deleting session",
                    error=e,
                    extra={"key": key}
                )
        
        if cursor == 0:
            break 