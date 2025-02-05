"""Authentication service."""
import logging
from datetime import datetime, timedelta
from typing import Optional, Tuple
from uuid import uuid4

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.core.security import (
    create_access_token,
    create_refresh_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from src.models.user import EmailVerification, PasswordReset, User
from src.services.email.email_service import EmailService

logger = logging.getLogger(__name__)


class AuthService:
    """Authentication service."""

    def __init__(self, session: AsyncSession):
        """Initialize service."""
        self.session = session
        self.email_service = EmailService()

    async def authenticate_user(
        self,
        email: str,
        password: str
    ) -> Optional[User]:
        """Authenticate user with email and password."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()

        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None

        return user

    async def create_refresh_token(
        self,
        user_id: str,
        expires_delta: Optional[timedelta] = None
    ) -> str:
        """Create refresh token."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(
                minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES
            )
        return create_refresh_token(
            {"sub": str(user_id), "exp": expire.timestamp()}
        )

    async def refresh_token(self, refresh_token: str) -> Optional[str]:
        """Refresh access token using refresh token."""
        try:
            payload = decode_access_token(refresh_token)
            if not payload:
                return None

            result = await self.session.execute(
                select(User).where(User.id == payload.sub)
            )
            user = result.scalar_one_or_none()
            if not user or not user.is_active:
                return None

            return create_access_token(user.id)
        except Exception as e:
            logger.error(f"Error refreshing token: {e}")
            return None

    async def create_password_reset(self, user: User) -> Tuple[str, datetime]:
        """Create password reset token."""
        token = str(uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=24)

        reset = PasswordReset(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        self.session.add(reset)
        await self.session.commit()

        return token, expires_at

    async def request_password_reset(self, email: str) -> bool:
        """Request password reset."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        user = result.scalar_one_or_none()
        if not user:
            return False

        token, expires_at = await self.create_password_reset(user)
        
        # Send password reset email
        try:
            await self.email_service.send_password_reset_email(
                user.email,
                user.full_name,
                token,
                expires_at
            )
            return True
        except Exception as e:
            logger.error(f"Error sending password reset email: {e}")
            return False

    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset password using reset token."""
        result = await self.session.execute(
            select(PasswordReset)
            .where(
                PasswordReset.token == token,
                PasswordReset.is_used == False,  # noqa: E712
                PasswordReset.expires_at > datetime.utcnow()
            )
        )
        reset = result.scalar_one_or_none()
        if not reset:
            return False

        result = await self.session.execute(
            select(User).where(User.id == reset.user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return False

        # Update password and mark token as used
        user.hashed_password = get_password_hash(new_password)
        reset.is_used = True
        
        self.session.add(user)
        self.session.add(reset)
        await self.session.commit()

        return True

    async def create_email_verification(
        self,
        user: User
    ) -> Tuple[str, datetime]:
        """Create email verification token."""
        token = str(uuid4())
        expires_at = datetime.utcnow() + timedelta(hours=24)

        verification = EmailVerification(
            user_id=user.id,
            token=token,
            expires_at=expires_at
        )
        self.session.add(verification)
        await self.session.commit()

        return token, expires_at

    async def verify_email(self, token: str) -> bool:
        """Verify email using verification token."""
        result = await self.session.execute(
            select(EmailVerification)
            .where(
                EmailVerification.token == token,
                EmailVerification.is_used == False,  # noqa: E712
                EmailVerification.expires_at > datetime.utcnow()
            )
        )
        verification = result.scalar_one_or_none()
        if not verification:
            return False

        result = await self.session.execute(
            select(User).where(User.id == verification.user_id)
        )
        user = result.scalar_one_or_none()
        if not user:
            return False

        # Mark email as verified and token as used
        verification.is_used = True
        user.is_email_verified = True
        
        self.session.add(verification)
        self.session.add(user)
        await self.session.commit()

        return True 