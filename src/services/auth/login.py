"""User authentication service."""
from typing import Optional, Tuple

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import (
    Token,
    create_access_token,
    create_refresh_token,
    verify_password
)
from src.models.user import User
from src.services.auth.registration import get_user_by_email


async def authenticate_user(
    session: AsyncSession,
    email: str,
    password: str
) -> Optional[User]:
    """Authenticate a user."""
    user = await get_user_by_email(session, email)
    if not user:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def login_user(
    session: AsyncSession,
    email: str,
    password: str
) -> Tuple[Token, User]:
    """Login a user and return tokens."""
    # Authenticate user
    user = await authenticate_user(session, email, password)
    if not user:
        return None
    
    # Generate tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    # Create token response
    token = Token(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token
    )
    
    return token, user


async def refresh_user_token(
    session: AsyncSession,
    refresh_token: str
) -> Optional[Token]:
    """Create new access token using refresh token."""
    # Verify refresh token
    token_data = verify_token(refresh_token, token_type="refresh")
    if not token_data:
        return None
    
    # Get user
    user = await get_user_by_id(session, int(token_data.sub))
    if not user or not user.is_active:
        return None
    
    # Generate new access token
    access_token = create_access_token(user.id)
    
    # Create token response
    token = Token(
        access_token=access_token,
        token_type="bearer"
    )
    
    return token 