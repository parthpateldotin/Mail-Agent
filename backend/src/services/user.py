"""User service."""
from typing import Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_password_hash, verify_password
from src.models.user import User
from src.schemas.user import UserCreate, UserUpdate


class UserService:
    """User service."""

    def __init__(self, session: AsyncSession) -> None:
        """Initialize user service."""
        self._session = session

    async def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID."""
        query = select(User).where(User.id == user_id)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        query = select(User).where(User.email == email)
        result = await self._session.execute(query)
        return result.scalar_one_or_none()

    async def create(self, user_in: UserCreate) -> User:
        """Create new user."""
        user = User(
            email=user_in.email,
            hashed_password=get_password_hash(user_in.password),
            full_name=user_in.full_name,
            is_active=user_in.is_active,
            is_superuser=user_in.is_superuser,
        )
        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def update(self, user: User, user_in: UserUpdate) -> User:
        """Update user."""
        if user_in.email is not None:
            user.email = user_in.email
        if user_in.full_name is not None:
            user.full_name = user_in.full_name
        if user_in.password is not None:
            user.hashed_password = get_password_hash(user_in.password)
        if user_in.is_active is not None:
            user.is_active = user_in.is_active
        if user_in.is_superuser is not None:
            user.is_superuser = user_in.is_superuser

        self._session.add(user)
        await self._session.commit()
        await self._session.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        """Delete user."""
        await self._session.delete(user)
        await self._session.commit()

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate user."""
        user = await self.get_by_email(email=email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user 