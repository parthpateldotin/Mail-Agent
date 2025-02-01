"""User-related test utilities."""
from typing import Dict

from sqlalchemy.ext.asyncio import AsyncSession
from fastapi.security import OAuth2PasswordRequestForm

from src.core.security import create_access_token
from src.models.user import User
from src.services.auth.auth_service import create_user
from src.api.deps import get_db


async def create_test_user(session: AsyncSession = None) -> User:
    """Create a test user."""
    user_data = {
        "email": "test@example.com",
        "password": "testpassword123",
        "full_name": "Test User",
        "is_active": True,
        "is_superuser": False
    }
    
    if session is None:
        session = await anext(get_db())
    
    user = await create_user(
        session=session,
        email=user_data["email"],
        password=user_data["password"],
        full_name=user_data["full_name"]
    )
    
    return user


async def get_test_token(user: User) -> str:
    """Get a test token for a user."""
    access_token = create_access_token(
        data={"sub": user.email}
    )
    return access_token


async def get_superuser_token_headers(client) -> Dict[str, str]:
    """Get superuser token headers."""
    login_data = {
        "username": "admin@example.com",
        "password": "admin123"
    }
    r = await client.post("/api/v1/login/access-token", data=login_data)
    tokens = r.json()
    a_token = tokens["access_token"]
    headers = {"Authorization": f"Bearer {a_token}"}
    return headers 