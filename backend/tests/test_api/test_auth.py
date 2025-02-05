"""Test authentication endpoints."""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models import User
from src.core.security import verify_password


def test_login(client: TestClient, test_user: User) -> None:
    """Test login endpoint."""
    response = client.post(
        "/auth/login",
        data={
            "username": test_user.email,
            "password": "password123",
        },
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" in data


def test_login_wrong_password(client: TestClient, test_user: User) -> None:
    """Test login with wrong password."""
    response = client.post(
        "/auth/login",
        data={
            "username": test_user.email,
            "password": "wrongpassword",
        },
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Incorrect email or password"


def test_login_inactive_user(client: TestClient, test_user: User) -> None:
    """Test login with inactive user."""
    test_user.is_active = False
    response = client.post(
        "/auth/login",
        data={
            "username": test_user.email,
            "password": "password123",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Inactive user"


@pytest.mark.asyncio
async def test_register(client: TestClient, db_session: AsyncSession) -> None:
    """Test register endpoint."""
    response = client.post(
        "/auth/register",
        json={
            "email": "new@example.com",
            "password": "newpassword123",
            "full_name": "New User",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["full_name"] == "New User"
    assert data["is_active"] is True
    assert "id" in data

    # Verify user in database
    db_user = await db_session.get(User, data["id"])
    assert db_user is not None
    assert db_user.email == "new@example.com"
    assert verify_password("newpassword123", db_user.hashed_password)


def test_register_existing_email(client: TestClient, test_user: User) -> None:
    """Test register with existing email."""
    response = client.post(
        "/auth/register",
        json={
            "email": test_user.email,
            "password": "password123",
            "full_name": "Another User",
        },
    )
    assert response.status_code == 400
    assert response.json()["detail"] == "Email already registered"


def test_refresh_token(client: TestClient, test_user: User, test_user_token: str) -> None:
    """Test refresh token endpoint."""
    response = client.post(
        "/auth/refresh",
        json={"refresh_token": test_user_token},
    )
    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    assert "refresh_token" in data


def test_refresh_token_invalid(client: TestClient) -> None:
    """Test refresh token with invalid token."""
    response = client.post(
        "/auth/refresh",
        json={"refresh_token": "invalid_token"},
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Invalid refresh token" 