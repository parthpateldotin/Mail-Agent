"""Token management service."""
from datetime import datetime
from typing import Optional, Set

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import TokenData, verify_token
from src.models.user import User


class TokenBlacklist:
    """In-memory token blacklist."""
    
    def __init__(self):
        self._blacklist: Set[str] = set()
    
    def add_token(self, jti: str) -> None:
        """Add a token to the blacklist."""
        self._blacklist.add(jti)
    
    def is_blacklisted(self, jti: str) -> bool:
        """Check if a token is blacklisted."""
        return jti in self._blacklist
    
    def clear_expired(self, current_time: datetime) -> None:
        """Clear expired tokens from blacklist."""
        # TODO: Implement cleanup of expired tokens
        pass


# Global token blacklist instance
token_blacklist = TokenBlacklist()


async def validate_token(
    session: AsyncSession,
    token: str,
    token_type: str = "access"
) -> Optional[User]:
    """Validate a token and return the associated user."""
    # Verify token
    token_data = verify_token(token, token_type=token_type)
    if not token_data:
        return None
    
    # Check if token is blacklisted
    if token_blacklist.is_blacklisted(token_data.jti):
        return None
    
    # Get user
    result = await session.execute(
        select(User).where(User.id == int(token_data.sub))
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        return None
    
    return user


async def blacklist_token(token: str) -> bool:
    """Add a token to the blacklist."""
    token_data = verify_token(token)
    if not token_data:
        return False
    
    token_blacklist.add_token(token_data.jti)
    return True


def cleanup_expired_tokens() -> None:
    """Clean up expired tokens from the blacklist."""
    current_time = datetime.utcnow()
    token_blacklist.clear_expired(current_time) 