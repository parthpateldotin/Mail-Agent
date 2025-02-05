"""Test users module."""
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.security import verify_password
from src.models.user import User
from src.schemas.user import UserCreate
from src.services.users import UserService


@pytest.mark.asyncio
async def test_create_user(
    test_session: AsyncSession
) -> None:
    """Test user creation."""
    user_service = UserService(test_session)
    user_in = UserCreate(
        email="test@example.com",
        password="testpass123",
        full_name="Test User",
        is_superuser=False,
    )
    
    user = await user_service.create_user(user_in)
    assert user.email == user_in.email
    assert user.full_name == user_in.full_name
    assert user.is_superuser == user_in.is_superuser
    assert verify_password(user_in.password, user.hashed_password)


@pytest.mark.asyncio
async def test_authenticate_user(
    test_session: AsyncSession
) -> None:
    """Test user authentication."""
    user_service = UserService(test_session)
    user_in = UserCreate(
        email="auth@example.com",
        password="authpass123",
        full_name="Auth User",
        is_superuser=False,
    )
    
    user = await user_service.create_user(user_in)
    authenticated = await user_service.authenticate(
        user_in.email,
        user_in.password
    )
    
    assert authenticated
    assert authenticated.email == user.email 