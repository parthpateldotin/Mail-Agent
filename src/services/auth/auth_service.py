"""Authentication service."""
from datetime import datetime
from typing import Optional, Tuple

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import (
    create_access_token,
    create_refresh_token,
    get_password_hash,
    verify_password,
    verify_token
)
from src.models.user import User
from src.schemas.auth import Token, UserCreate, UserLogin
from src.services.auth.token_management import blacklist_token, validate_token


async def get_user_by_email(
    session: AsyncSession,
    email: str
) -> Optional[User]:
    """Get a user by email."""
    result = await session.execute(
        select(User).where(User.email == email)
    )
    return result.scalar_one_or_none()


async def get_user_by_id(
    session: AsyncSession,
    user_id: int
) -> Optional[User]:
    """Get a user by ID."""
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    user_data: UserCreate
) -> User:
    """Create a new user."""
    # Check if user exists
    if await get_user_by_email(session, user_data.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user
    hashed_password = get_password_hash(user_data.password)
    user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        is_active=True,
        created_at=datetime.utcnow()
    )
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    return user


async def authenticate_user(
    session: AsyncSession,
    user_data: UserLogin
) -> Optional[User]:
    """Authenticate a user."""
    user = await get_user_by_email(session, user_data.email)
    if not user:
        return None
    
    if not verify_password(user_data.password, user.hashed_password):
        return None
    
    return user


async def login(
    session: AsyncSession,
    user_data: UserLogin
) -> Tuple[str, str]:
    """Login a user and return tokens."""
    user = await authenticate_user(session, user_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create tokens
    access_token = create_access_token(user.id)
    refresh_token = create_refresh_token(user.id)
    
    return access_token, refresh_token


async def logout(token: str) -> bool:
    """Logout a user by blacklisting their token."""
    return await blacklist_token(token)


async def refresh_token(
    session: AsyncSession,
    refresh_token_str: str
) -> Optional[Token]:
    """Create new access token using refresh token."""
    # Validate refresh token
    user = await validate_token(session, refresh_token_str, token_type="refresh")
    if not user:
        return None
    
    # Generate new access token
    access_token = create_access_token(user.id)
    
    # Create token response
    return Token(
        access_token=access_token,
        token_type="bearer",
        refresh_token=refresh_token_str  # Keep the same refresh token
    ) 