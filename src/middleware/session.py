"""Session middleware."""
from typing import Callable, Optional
from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware

from src.services.session.session_service import SessionService


async def session_middleware(
    request: Request,
    call_next: Callable
) -> Response:
    """Session middleware."""
    # Get session service from app state
    session_service: SessionService = request.app.state.session_service
    
    # Get session ID from cookie
    session_id = request.cookies.get(session_service.cookie_name)
    
    # Get session data
    if session_id:
        session_data = await session_service.get_session(session_id)
        request.state.session = session_data
    else:
        request.state.session = {}
    
    # Process request
    response = await call_next(request)
    
    # Update session if modified
    if hasattr(request.state, "session"):
        session_data = request.state.session
        if session_data:
            # Create or update session
            session_id = await session_service.set_session(
                session_id,
                session_data
            )
            # Set session cookie
            response.set_cookie(
                session_service.cookie_name,
                session_id,
                max_age=session_service.expire_seconds,
                httponly=True,
                secure=session_service.secure,
                samesite=session_service.same_site
            )
        elif session_id:
            # Delete session if empty
            await session_service.delete_session(session_id)
            response.delete_cookie(
                session_service.cookie_name,
                httponly=True,
                secure=session_service.secure,
                samesite=session_service.same_site
            )
    
    return response


def setup_session_middleware(app, session_service: SessionService) -> None:
    """Set up session middleware for FastAPI application."""
    app.state.session_service = session_service 