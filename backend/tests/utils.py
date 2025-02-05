"""Test utilities."""
from datetime import datetime, timedelta
from typing import Dict, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import create_access_token, get_password_hash
from src.models.user import User
from src.schemas.auth import UserCreate


async def create_test_user(
    session: AsyncSession,
    email: str = "test@example.com",
    password: str = "testpassword123",
    is_active: bool = True,
    is_admin: bool = False,
    is_email_verified: bool = False
) -> User:
    """Create a test user."""
    user = User(
        email=email,
        hashed_password=get_password_hash(password),
        is_active=is_active,
        is_admin=is_admin,
        is_email_verified=is_email_verified,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(user)
    await session.commit()
    await session.refresh(user)
    
    return user


def create_test_token(
    user_id: int,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create a test access token."""
    return create_access_token(
        user_id,
        expires_delta=expires_delta or timedelta(minutes=30)
    )


def get_auth_headers(token: str) -> Dict[str, str]:
    """Get authorization headers."""
    return {"Authorization": f"Bearer {token}"}


def create_test_user_data(
    email: str = "test@example.com",
    password: str = "testpassword123"
) -> UserCreate:
    """Create test user data."""
    return UserCreate(
        email=email,
        password=password
    )


def verify_token_response(response_data: Dict) -> bool:
    """Verify token response format."""
    return all([
        "access_token" in response_data,
        "token_type" in response_data,
        response_data["token_type"] == "bearer"
    ])


def verify_user_response(response_data: Dict, user: User) -> bool:
    """Verify user response format."""
    return all([
        response_data["email"] == user.email,
        response_data["is_active"] == user.is_active,
        response_data["is_admin"] == user.is_admin,
        "id" in response_data
    ]) 