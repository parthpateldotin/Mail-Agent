"""User registration service."""
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_password_hash
from src.models.user import User
from src.schemas.user import UserCreate


async def get_user_by_email(session: AsyncSession, email: str) -> Optional[User]:
    """Get a user by email."""
    result = await session.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(
    session: AsyncSession,
    user_in: UserCreate,
    is_admin: bool = False
) -> User:
    """Create a new user."""
    # Check if user exists
    if await get_user_by_email(session, user_in.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create user instance
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        is_active=True,
        is_admin=is_admin
    )
    
    # Save to database
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    return user 