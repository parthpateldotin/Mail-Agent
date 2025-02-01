from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm

from src.api.dependencies.auth import get_current_user
from src.core.security import (
    create_access_token,
    create_refresh_token,
    verify_password,
)
from src.models.auth import Token, TokenPayload
from src.models.user import User
from src.services.auth import AuthService
from src.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends()) -> Token:
    """Login user and return access and refresh tokens."""
    try:
        user = await AuthService.authenticate_user(
            email=form_data.username,
            password=form_data.password,
        )
        if not user:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect email or password",
            )

        return Token(
            access_token=create_access_token(user.id),
            refresh_token=create_refresh_token(user.id),
            token_type="bearer",
        )
    except Exception as e:
        logger.error(f"Login failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication failed",
        )


@router.post("/refresh", response_model=Token)
async def refresh_token(
    current_user: User = Depends(get_current_user),
) -> Token:
    """Refresh access token using refresh token."""
    try:
        return Token(
            access_token=create_access_token(current_user.id),
            refresh_token=create_refresh_token(current_user.id),
            token_type="bearer",
        )
    except Exception as e:
        logger.error(f"Token refresh failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token refresh failed",
        )


@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user)) -> dict:
    """Logout user and invalidate tokens."""
    try:
        await AuthService.logout_user(current_user.id)
        return {"message": "Successfully logged out"}
    except Exception as e:
        logger.error(f"Logout failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Logout failed",
        ) 