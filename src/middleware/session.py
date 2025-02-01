"""Session middleware."""
from typing import Callable, Optional

from fastapi import FastAPI, Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

from src.core.config import settings
from src.core.logging import LoggerMixin
from src.services.session.session_service import SessionService


class SessionMiddleware(BaseHTTPMiddleware, LoggerMixin):
    """Middleware for handling sessions."""

    def __init__(
        self,
        app: ASGIApp,
        session_service: SessionService,
        cookie_name: str = "session_id",
        secure: bool = True,
        same_site: str = "lax"
    ) -> None:
        """Initialize middleware."""
        super().__init__(app)
        self.session_service = session_service
        self.cookie_name = cookie_name
        self.secure = secure
        self.same_site = same_site

    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """Process the request/response and handle session."""
        # Get session ID from cookie
        session_id = request.cookies.get(self.cookie_name)
        session_data = None

        if session_id:
            try:
                # Get session data
                session_data = await self.session_service.get_session(session_id)
                if session_data:
                    # Attach session data to request state
                    request.state.session = session_data
                    request.state.session_id = session_id
                else:
                    # Invalid or expired session
                    session_id = None
            except Exception as e:
                self.log_error(
                    "Error getting session",
                    error=e,
                    extra={"session_id": session_id}
                )
                session_id = None

        # Process request
        response = await call_next(request)

        # Handle session cookie
        if session_id and session_data:
            # Extend existing session
            response.set_cookie(
                key=self.cookie_name,
                value=session_id,
                max_age=settings.SESSION_EXPIRY_DAYS * 24 * 60 * 60,
                httponly=True,
                secure=self.secure,
                samesite=self.same_site
            )
        elif hasattr(request.state, "new_session_id"):
            # Set cookie for new session
            response.set_cookie(
                key=self.cookie_name,
                value=request.state.new_session_id,
                max_age=settings.SESSION_EXPIRY_DAYS * 24 * 60 * 60,
                httponly=True,
                secure=self.secure,
                samesite=self.same_site
            )
        elif session_id and not session_data:
            # Clear invalid session cookie
            response.delete_cookie(
                key=self.cookie_name,
                httponly=True,
                secure=self.secure,
                samesite=self.same_site
            )

        return response


def get_session_data(request: Request) -> Optional[dict]:
    """Get session data from request."""
    return getattr(request.state, "session", None)


def get_session_id(request: Request) -> Optional[str]:
    """Get session ID from request."""
    return getattr(request.state, "session_id", None)


def setup_session_middleware(
    app: FastAPI,
    session_service: SessionService,
    cookie_name: str = "session_id",
    secure: bool = True,
    same_site: str = "lax"
) -> None:
    """Set up session middleware."""
    app.add_middleware(
        SessionMiddleware,
        session_service=session_service,
        cookie_name=cookie_name,
        secure=secure,
        same_site=same_site
    ) 