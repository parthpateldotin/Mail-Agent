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
from src.services.auth.auth_service import (
    create_user,
    login,
    logout,
    refresh_token
)
from src.services.auth.password_reset import (
    request_password_reset,
    reset_password
)
from src.services.auth.email_verification import (
    verify_email,
    send_verification_token,
    resend_verification_email
)

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="v1/auth/login")


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    user_data: UserCreate,
    session: AsyncSession = Depends(get_db)
) -> User:
    """Register a new user."""
    return await create_user(session, user_data)


@router.post("/login", response_model=Token)
async def login_user(
    user_data: UserLogin,
    session: AsyncSession = Depends(get_db)
) -> Token:
    """Login user and return tokens."""
    access_token, refresh_token = await login(session, user_data)
    return Token(
        access_token=access_token,
        refresh_token=refresh_token,
        token_type="bearer"
    )


@router.post("/logout", status_code=status.HTTP_200_OK)
async def logout_user(
    current_user: User = Depends(get_current_user),
    token: str = Depends(oauth2_scheme)
) -> dict:
    """Logout current user."""
    success = await logout(token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Could not logout user"
        )
    return {"message": "Successfully logged out"}


@router.post("/refresh", response_model=Token)
async def refresh_access_token(
    refresh_data: RefreshToken,
    session: AsyncSession = Depends(get_db)
) -> Token:
    """Get new access token using refresh token."""
    new_token = await refresh_token(session, refresh_data.refresh_token)
    if not new_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )
    return new_token


@router.post("/password-reset/request", status_code=status.HTTP_200_OK)
async def request_reset(
    request_data: PasswordResetRequest,
    session: AsyncSession = Depends(get_db)
) -> dict:
    """Request password reset."""
    await request_password_reset(session, request_data)
    return {
        "message": "If the email exists in our system, you will receive a password reset link"
    }


@router.post("/password-reset/confirm", status_code=status.HTTP_200_OK)
async def confirm_reset(
    reset_data: PasswordResetConfirm,
    session: AsyncSession = Depends(get_db)
) -> dict:
    """Reset password using reset token."""
    success = await reset_password(
        session,
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
    success = await send_verification_token(session, request_data.email)
    return {
        "message": "If the email exists and is not verified, you will receive a verification link"
    }


@router.post("/verify-email/verify", status_code=status.HTTP_200_OK)
async def verify_email_token(
    token: str,
    session: AsyncSession = Depends(get_db)
) -> dict:
    """Verify email using verification token."""
    success = await verify_email(session, token)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
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
    
    success = await resend_verification_email(session, current_user)
    return {"message": "Verification email sent"} 