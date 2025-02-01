"""Password reset service."""
from datetime import datetime, timedelta
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import (
    create_token,
    get_password_hash,
    verify_token
)
from src.models.user import User, PasswordReset
from src.schemas.auth import PasswordResetRequest, PasswordResetConfirm
from src.services.auth.auth_service import get_user_by_email
from src.services.email.email_service import send_password_reset_email


async def create_password_reset_token(
    session: AsyncSession,
    email: str
) -> Optional[Tuple[str, User]]:
    """Create a password reset token for a user."""
    # Get user
    user = await get_user_by_email(session, email)
    if not user or not user.is_active:
        return None
    
    # Create reset token
    token = create_token(
        {"sub": str(user.id), "type": "reset"},
        expires_delta=timedelta(hours=1)
    )
    
    # Store reset request
    reset_request = PasswordReset(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=1),
        is_used=False
    )
    
    session.add(reset_request)
    await session.commit()
    
    return token, user


async def validate_reset_token(
    session: AsyncSession,
    token: str
) -> Optional[User]:
    """Validate a password reset token."""
    # Verify token
    token_data = verify_token(token, token_type="reset")
    if not token_data:
        return None
    
    # Get reset request
    result = await session.execute(
        select(PasswordReset)
        .where(
            PasswordReset.token == token,
            PasswordReset.is_used == False,
            PasswordReset.expires_at > datetime.utcnow()
        )
    )
    reset_request = result.scalar_one_or_none()
    
    if not reset_request:
        return None
    
    # Get user
    result = await session.execute(
        select(User).where(User.id == int(token_data.sub))
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        return None
    
    return user


async def request_password_reset(
    session: AsyncSession,
    request_data: PasswordResetRequest
) -> bool:
    """Handle password reset request."""
    result = await create_password_reset_token(session, request_data.email)
    if not result:
        # Return True even if user not found for security
        return True
    
    token, user = result
    
    # Send reset email
    await send_password_reset_email(user.email, token)
    
    return True


async def reset_password(
    session: AsyncSession,
    token: str,
    new_password: str
) -> bool:
    """Reset user password using reset token."""
    # Validate token
    user = await validate_reset_token(session, token)
    if not user:
        return False
    
    # Update password
    hashed_password = get_password_hash(new_password)
    await session.execute(
        update(User)
        .where(User.id == user.id)
        .values(hashed_password=hashed_password)
    )
    
    # Mark reset token as used
    await session.execute(
        update(PasswordReset)
        .where(
            PasswordReset.token == token,
            PasswordReset.is_used == False
        )
        .values(is_used=True)
    )
    
    await session.commit()
    
    return True 