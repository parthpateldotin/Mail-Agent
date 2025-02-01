from typing import Any, Dict, Optional
from fastapi import HTTPException, status


class APIError(HTTPException):
    """Base API exception."""
    def __init__(
        self,
        status_code: int,
        detail: Any = None,
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail, headers=headers)


class AuthenticationError(APIError):
    """Authentication related errors."""
    def __init__(
        self,
        detail: str = "Authentication failed",
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer", **(headers or {})},
        )


class AuthorizationError(APIError):
    """Authorization related errors."""
    def __init__(
        self,
        detail: str = "Not authorized to perform this action",
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
            headers=headers,
        )


class NotFoundError(APIError):
    """Resource not found errors."""
    def __init__(
        self,
        detail: str = "Resource not found",
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
            headers=headers,
        )


class ValidationError(APIError):
    """Validation related errors."""
    def __init__(
        self,
        detail: str = "Validation error",
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
            headers=headers,
        )


class DatabaseError(APIError):
    """Database related errors."""
    def __init__(
        self,
        detail: str = "Database error occurred",
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
            headers=headers,
        )


class ExternalServiceError(APIError):
    """External service related errors."""
    def __init__(
        self,
        detail: str = "External service error",
        headers: Optional[Dict[str, str]] = None,
    ) -> None:
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
            headers=headers,
        ) 