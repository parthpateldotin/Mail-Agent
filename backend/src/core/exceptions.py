"""Custom exceptions for the application."""
from typing import Any, Dict, Optional

from fastapi import HTTPException, status


class BaseError(HTTPException):
    """Base error class."""
    
    def __init__(
        self,
        status_code: int,
        detail: Any = None,
        headers: Optional[Dict[str, str]] = None
    ) -> None:
        """Initialize error."""
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class DatabaseError(BaseError):
    """Database error."""
    
    def __init__(
        self,
        detail: Any = "Database error occurred",
        headers: Optional[Dict[str, str]] = None
    ) -> None:
        """Initialize error."""
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            headers=headers
        )


class NotFoundError(BaseError):
    """Not found error."""
    
    def __init__(
        self,
        detail: Any = "Resource not found",
        headers: Optional[Dict[str, str]] = None
    ) -> None:
        """Initialize error."""
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            headers=headers
        )


class ValidationError(BaseError):
    """Validation error."""
    
    def __init__(
        self,
        detail: Any = "Validation error",
        headers: Optional[Dict[str, str]] = None
    ) -> None:
        """Initialize error."""
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            headers=headers
        )


class AuthenticationError(BaseError):
    """Authentication error."""
    
    def __init__(
        self,
        detail: Any = "Authentication error",
        headers: Optional[Dict[str, str]] = None
    ) -> None:
        """Initialize error."""
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers=headers
        )


class AuthorizationError(BaseError):
    """Authorization error."""
    
    def __init__(
        self,
        detail: Any = "Authorization error",
        headers: Optional[Dict[str, str]] = None
    ) -> None:
        """Initialize error."""
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            headers=headers
        )


class RateLimitError(BaseError):
    """Rate limit error."""
    
    def __init__(
        self,
        detail: Any = "Too many requests",
        headers: Optional[Dict[str, str]] = None
    ) -> None:
        """Initialize error."""
        super().__init__(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=detail,
            headers=headers
        ) 