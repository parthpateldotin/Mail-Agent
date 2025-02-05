"""Authentication endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.schemas.auth import (
    Token,
    UserCreate,
    UserLogin,
    UserResponse,
    RefreshToken,
    PasswordResetRequest,
    PasswordResetConfirm,
    EmailVerificationRequest
)
from src.services.auth.auth_service import AuthService
from src.services.users import UserService
from src.core.config import settings
from src.core.security import create_access_token, create_refresh_token
from fastapi.security import OAuth2PasswordRequestForm
from typing import Any

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="v1/auth/login")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_db)
) -> User:
    """Register a new user."""
    user_service = UserService(session)
    return await user_service.create(user_data)


@router.post("/login", response_model=Token)
async def login(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends(),
) -> Any:
    """Login user."""
    user_service = UserService(db)
    user = await user_service.authenticate(
        form_data.username,
        form_data.password,
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not await user_service.is_active(user):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
    }


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme)
) -> dict:
    """Logout current user."""
    # Since we're using JWT, we don't need to do anything server-side
    # The client should discard the tokens
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_data: RefreshToken,
    session: AsyncSession = Depends(get_db)
) -> Token:
    """Get new access token using refresh token."""
    auth_service = AuthService(session)
    new_token = await auth_service.refresh_token(refresh_data.refresh_token)
    if not new_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    return Token(
        access_token=new_token,
        refresh_token=refresh_data.refresh_token,
        token_type="bearer"
    )


@router.post("/password-reset/request", status_code=status.HTTP_200_OK)
async def request_reset(
    request_data: PasswordResetRequest,
    session: AsyncSession = Depends(get_db)
) -> dict:
    """Request password reset."""
    auth_service = AuthService(session)
    reset_token = await auth_service.request_password_reset(request_data.email)
    return {
        "message": "If the email exists in our system, you will receive a password reset link"
    }


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_reset(
    reset_data: PasswordResetConfirm,
    session: AsyncSession = Depends(get_db)
) -> dict:
    """Reset password using reset token."""
    auth_service = AuthService(session)
    success = await auth_service.reset_password(
        reset_data.token,
        reset_data.new_password
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    return {"message": "Password successfully reset"}


@router.post("/verify-email/request", status_code=status.HTTP_200_OK)
async def request_verification(
    request_data: EmailVerificationRequest,
    session: AsyncSession = Depends(get_db)
) -> dict:
    """Request email verification."""
    user_service = UserService(session)
    user = await user_service.get_by_email(request_data.email)
    if user and not user.is_email_verified:
        # Here you would typically send a verification email
        # For now, we'll just mark the email as verified
        await user_service.verify_email(user)
    return {
        "message": "If the email exists and is not verified, you will receive a verification link"
    }


@router.post("/verify-email/verify", status_code=status.HTTP_200_OK)
async def verify_email_token(
    token: str,
    session: AsyncSession = Depends(get_db)
) -> dict:
    """Verify email using verification token."""
    # Since we're auto-verifying emails in the request endpoint,
    # this endpoint is just a placeholder for now
    return {"message": "Email successfully verified"}


@router.post("/verify-email/resend", status_code=status.HTTP_200_OK)
async def resend_verification(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> dict:
    """Resend verification email to current user."""
    if current_user.is_email_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already verified"
        )
    
    # Here you would typically resend the verification email
    # For now, we'll just mark the email as verified
    user_service = UserService(session)
    await user_service.verify_email(current_user)
    return {"message": "Email verified"} 