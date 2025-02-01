"""Email verification service."""
from datetime import datetime, timedelta
from typing import Optional, Tuple

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import create_token, verify_token
from src.models.user import User, EmailVerification
from src.services.auth.auth_service import get_user_by_email
from src.services.email.email_service import send_verification_email


async def create_verification_token(
    session: AsyncSession,
    user: User
) -> str:
    """Create an email verification token."""
    # Create verification token
    token = create_token(
        {"sub": str(user.id), "type": "verification"},
        expires_delta=timedelta(hours=24)
    )
    
    # Store verification request
    verification = EmailVerification(
        user_id=user.id,
        token=token,
        expires_at=datetime.utcnow() + timedelta(hours=24),
        is_used=False
    )
    
    session.add(verification)
    await session.commit()
    
    return token


async def validate_verification_token(
    session: AsyncSession,
    token: str
) -> Optional[User]:
    """Validate an email verification token."""
    # Verify token
    token_data = verify_token(token, token_type="verification")
    if not token_data:
        return None
    
    # Get verification request
    result = await session.execute(
        select(EmailVerification)
        .where(
            EmailVerification.token == token,
            EmailVerification.is_used == False,
            EmailVerification.expires_at > datetime.utcnow()
        )
    )
    verification = result.scalar_one_or_none()
    
    if not verification:
        return None
    
    # Get user
    result = await session.execute(
        select(User).where(User.id == int(token_data.sub))
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        return None
    
    return user


async def verify_email(
    session: AsyncSession,
    token: str
) -> bool:
    """Verify user's email using verification token."""
    # Validate token
    user = await validate_verification_token(session, token)
    if not user:
        return False
    
    # Update user
    await session.execute(
        update(User)
        .where(User.id == user.id)
        .values(
            is_email_verified=True,
            email_verified_at=datetime.utcnow()
        )
    )
    
    # Mark verification token as used
    await session.execute(
        update(EmailVerification)
        .where(
            EmailVerification.token == token,
            EmailVerification.is_used == False
        )
        .values(is_used=True)
    )
    
    await session.commit()
    
    return True


async def send_verification_token(
    session: AsyncSession,
    email: str
) -> bool:
    """Send verification email to user."""
    # Get user
    user = await get_user_by_email(session, email)
    if not user or not user.is_active or user.is_email_verified:
        return False
    
    # Create verification token
    token = await create_verification_token(session, user)
    
    # Send verification email
    await send_verification_email(user.email, token)
    
    return True


async def resend_verification_email(
    session: AsyncSession,
    user: User
) -> bool:
    """Resend verification email to user."""
    if user.is_email_verified:
        return False
    
    # Create new verification token
    token = await create_verification_token(session, user)
    
    # Send verification email
    await send_verification_email(user.email, token)
    
    return True 