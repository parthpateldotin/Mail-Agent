"""Tests for rate limiting middleware."""
import pytest
from fastapi import status
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.utils import create_test_user, create_test_user_data


@pytest.mark.asyncio
async def test_rate_limit_login(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test rate limiting on login endpoint."""
    # Create user
    user_data = create_test_user_data()
    await create_test_user(
        test_session,
        email=user_data.email,
        password=user_data.password
    )
    
    # Make multiple requests
    responses = []
    for _ in range(6):  # Limit is 5 requests per 5 minutes
        response = await client.post(
            "/auth/login",
            json=user_data.model_dump()
        )
        responses.append(response)
    
    # First 5 requests should succeed
    for response in responses[:5]:
        assert response.status_code == status.HTTP_200_OK
        assert "X-RateLimit-Remaining" in response.headers
    
    # 6th request should be rate limited
    assert responses[5].status_code == status.HTTP_429_TOO_MANY_REQUESTS
    assert "Rate limit exceeded" in responses[5].json()["detail"]


@pytest.mark.asyncio
async def test_rate_limit_headers(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test rate limit headers."""
    # Create user
    user_data = create_test_user_data()
    await create_test_user(
        test_session,
        email=user_data.email,
        password=user_data.password
    )
    
    # Make request
    response = await client.post(
        "/auth/login",
        json=user_data.model_dump()
    )
    
    # Verify headers
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
    assert "X-RateLimit-Reset" in response.headers
    
    # Verify values
    assert int(response.headers["X-RateLimit-Limit"]) == 5  # Login endpoint limit
    assert int(response.headers["X-RateLimit-Remaining"]) == 4  # One request used
    assert response.headers["X-RateLimit-Reset"].isdigit()  # Reset time is a timestamp


@pytest.mark.asyncio
async def test_rate_limit_password_reset(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test rate limiting on password reset endpoint."""
    # Create user
    user = await create_test_user(test_session)
    
    # Make multiple requests
    responses = []
    for _ in range(4):  # Limit is 3 requests per 15 minutes
        response = await client.post(
            "/auth/password-reset/request",
            json={"email": user.email}
        )
        responses.append(response)
    
    # First 3 requests should succeed
    for response in responses[:3]:
        assert response.status_code == status.HTTP_200_OK
    
    # 4th request should be rate limited
    assert responses[3].status_code == status.HTTP_429_TOO_MANY_REQUESTS


@pytest.mark.asyncio
async def test_rate_limit_email_verification(
    client: AsyncClient,
    test_session: AsyncSession
) -> None:
    """Test rate limiting on email verification endpoint."""
    # Create user
    user = await create_test_user(test_session, is_email_verified=False)
    
    # Make multiple requests
    responses = []
    for _ in range(4):  # Limit is 3 requests per 15 minutes
        response = await client.post(
            "/auth/verify-email/request",
            json={"email": user.email}
        )
        responses.append(response)
    
    # First 3 requests should succeed
    for response in responses[:3]:
        assert response.status_code == status.HTTP_200_OK
    
    # 4th request should be rate limited
    assert responses[3].status_code == status.HTTP_429_TOO_MANY_REQUESTS 