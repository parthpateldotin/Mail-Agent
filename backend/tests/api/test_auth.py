"""Tests for authentication endpoints."""
import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User
from tests.utils import (
    create_test_user,
    create_test_user_data,
    get_auth_headers,
    verify_token_response,
    verify_user_response
)


@pytest.mark.asyncio
async def test_register_user(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test user registration."""
    user_data = create_test_user_data()
    response = await client.post("/auth/register", json=user_data.model_dump())
    
    assert response.status_code == status.HTTP_201_CREATED
    data = response.json()
    assert verify_user_response(data, User(**data))
    assert data["email"] == user_data.email


@pytest.mark.asyncio
async def test_register_existing_user(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test registering an existing user."""
    # Create user
    user_data = create_test_user_data()
    await create_test_user(test_session, email=user_data.email)
    
    # Try to register same user
    response = await client.post("/auth/register", json=user_data.model_dump())
    
    assert response.status_code == status.HTTP_400_BAD_REQUEST
    assert "Email already registered" in response.json()["detail"]


@pytest.mark.asyncio
async def test_login_user(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test user login."""
    # Create user
    user_data = create_test_user_data()
    await create_test_user(
        test_session,
        email=user_data.email,
        password=user_data.password
    )
    
    # Login
    response = await client.post("/auth/login", json=user_data.model_dump())
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert verify_token_response(data)


@pytest.mark.asyncio
async def test_login_wrong_password(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test login with wrong password."""
    # Create user
    user_data = create_test_user_data()
    await create_test_user(
        test_session,
        email=user_data.email,
        password=user_data.password
    )
    
    # Try to login with wrong password
    wrong_data = user_data.model_dump()
    wrong_data["password"] = "wrongpassword"
    response = await client.post("/auth/login", json=wrong_data)
    
    assert response.status_code == status.HTTP_401_UNAUTHORIZED
    assert "Incorrect email or password" in response.json()["detail"]


@pytest.mark.asyncio
async def test_logout_user(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test user logout."""
    # Create and login user
    user = await create_test_user(test_session)
    login_data = create_test_user_data(email=user.email)
    login_response = await client.post("/auth/login", json=login_data.model_dump())
    token = login_response.json()["access_token"]
    
    # Logout
    response = await client.post(
        "/auth/logout",
        headers=get_auth_headers(token)
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Successfully logged out"


@pytest.mark.asyncio
async def test_refresh_token(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test token refresh."""
    # Create and login user
    user = await create_test_user(test_session)
    login_data = create_test_user_data(email=user.email)
    login_response = await client.post("/auth/login", json=login_data.model_dump())
    refresh_token = login_response.json()["refresh_token"]
    
    # Refresh token
    response = await client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token}
    )
    
    assert response.status_code == status.HTTP_200_OK
    data = response.json()
    assert verify_token_response(data)


@pytest.mark.asyncio
async def test_request_password_reset(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test password reset request."""
    # Create user
    user = await create_test_user(test_session)
    
    # Request password reset
    response = await client.post(
        "/auth/password-reset/request",
        json={"email": user.email}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert "message" in response.json()


@pytest.mark.asyncio
async def test_verify_email_request(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test email verification request."""
    # Create unverified user
    user = await create_test_user(
        test_session,
        is_email_verified=False
    )
    
    # Request verification
    response = await client.post(
        "/auth/verify-email/request",
        json={"email": user.email}
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert "message" in response.json()


@pytest.mark.asyncio
async def test_resend_verification(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test resending verification email."""
    # Create unverified user
    user = await create_test_user(
        test_session,
        is_email_verified=False
    )
    
    # Login user
    login_data = create_test_user_data(email=user.email)
    login_response = await client.post("/auth/login", json=login_data.model_dump())
    token = login_response.json()["access_token"]
    
    # Request verification resend
    response = await client.post(
        "/auth/verify-email/resend",
        headers=get_auth_headers(token)
    )
    
    assert response.status_code == status.HTTP_200_OK
    assert response.json()["message"] == "Verification email sent" 