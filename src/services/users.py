from datetime import datetime
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import get_password_hash, verify_password
from src.models.user import User, UserCreate, UserUpdate
from src.core.config import get_app_settings

settings = get_app_settings()

class UserService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def get_by_id(self, user_id: int) -> Optional[User]:
        """Get user by ID."""
        result = await self.session.execute(
            select(User).where(User.id == user_id)
        )
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> Optional[User]:
        """Get user by email."""
        result = await self.session.execute(
            select(User).where(User.email == email)
        )
        return result.scalar_one_or_none()

    async def create(self, user_data: UserCreate) -> User:
        """Create a new user."""
        user = User(
            email=user_data.email,
            full_name=user_data.full_name,
            hashed_password=get_password_hash(user_data.password),
            is_active=user_data.is_active,
            is_admin=user_data.is_admin
        )
        self.session.add(user)
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def update(self, user: User, user_data: UserUpdate) -> User:
        """Update user data."""
        update_data = user_data.model_dump(exclude_unset=True)
        
        if "password" in update_data:
            update_data["hashed_password"] = get_password_hash(update_data.pop("password"))
        
        for field, value in update_data.items():
            setattr(user, field, value)
        
        user.updated_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(user)
        return user

    async def delete(self, user: User) -> None:
        """Delete a user."""
        await self.session.delete(user)
        await self.session.commit()

    async def authenticate(self, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password."""
        user = await self.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    async def is_active(self, user: User) -> bool:
        """Check if user is active."""
        return user.is_active

    async def is_admin(self, user: User) -> bool:
        """Check if user is admin."""
        return user.is_admin

    async def get_all(self, skip: int = 0, limit: int = 100) -> List[User]:
        """Get all users with pagination."""
        result = await self.session.execute(
            select(User)
            .offset(skip)
            .limit(limit)
        )
        return result.scalars().all()

    async def verify_email(self, user: User) -> None:
        """Mark user's email as verified."""
        user.is_email_verified = True
        user.email_verified_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(user)

    async def update_email_settings(
        self,
        user: User,
        signature: Optional[str] = None,
        vacation_responder_enabled: Optional[bool] = None,
        vacation_responder_message: Optional[str] = None
    ) -> User:
        """Update user's email settings."""
        if signature is not None:
            user.email_signature = signature
        if vacation_responder_enabled is not None:
            user.vacation_responder_enabled = vacation_responder_enabled
        if vacation_responder_message is not None:
            user.vacation_responder_message = vacation_responder_message
        
        user.updated_at = datetime.utcnow()
        await self.session.commit()
        await self.session.refresh(user)
        return user 