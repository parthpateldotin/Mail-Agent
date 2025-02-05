"""Test user model."""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User
from src.core.security import get_password_hash


@pytest.mark.asyncio
async def test_create_user(db_session: AsyncSession) -> None:
    """Test user creation."""
    user = User(
        email="test@example.com",
        hashed_password=get_password_hash("password123"),
        full_name="Test User",
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()
    await db_session.refresh(user)

    assert user.id is not None
    assert user.email == "test@example.com"
    assert user.full_name == "Test User"
    assert user.is_active is True
    assert user.is_superuser is False
    assert user.created_at is not None
    assert user.updated_at is not None


@pytest.mark.asyncio
async def test_update_user(db_session: AsyncSession, test_user: User) -> None:
    """Test user update."""
    test_user.full_name = "Updated Name"
    test_user.email = "updated@example.com"
    db_session.add(test_user)
    await db_session.commit()
    await db_session.refresh(test_user)

    assert test_user.full_name == "Updated Name"
    assert test_user.email == "updated@example.com"


@pytest.mark.asyncio
async def test_delete_user(db_session: AsyncSession, test_user: User) -> None:
    """Test user deletion."""
    await db_session.delete(test_user)
    await db_session.commit()

    result = await db_session.get(User, test_user.id)
    assert result is None


@pytest.mark.asyncio
async def test_user_relationships(db_session: AsyncSession, test_user: User) -> None:
    """Test user relationships."""
    assert test_user.emails == []
    assert test_user.folders == []
    assert test_user.labels == []
    assert test_user.threads == []
    assert test_user.password_resets == []
    assert test_user.email_verifications == [] 