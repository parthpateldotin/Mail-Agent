from datetime import datetime, timedelta
from typing import Optional
from jose import jwt
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_app_settings
from src.core.security import verify_password, get_password_hash
from src.services.users import UserService
from src.models.user import User

settings = get_app_settings()

class AuthService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.user_service = UserService(session)

    async def authenticate_user(self, email: str, password: str) -> Optional[User]:
        """Authenticate user by email and password."""
        user = await self.user_service.get_by_email(email)
        if not user:
            return None
        if not verify_password(password, user.hashed_password):
            return None
        return user

    def create_access_token(self, user_id: int, expires_delta: Optional[timedelta] = None) -> str:
        """Create access token for user."""
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode = {
            "exp": expire,
            "sub": str(user_id),
            "type": "access"
        }
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    def create_refresh_token(self, user_id: int) -> str:
        """Create refresh token for user."""
        expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
        to_encode = {
            "exp": expire,
            "sub": str(user_id),
            "type": "refresh"
        }
        encoded_jwt = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return encoded_jwt

    async def get_current_user(self, token: str) -> Optional[User]:
        """Get current user from token."""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            user_id = int(payload["sub"])
            if payload["type"] != "access":
                return None
        except (jwt.JWTError, ValueError):
            return None
        
        user = await self.user_service.get_by_id(user_id)
        if not user:
            return None
        if not user.is_active:
            return None
        return user

    async def get_current_active_user(self, token: str) -> Optional[User]:
        """Get current active user from token."""
        current_user = await self.get_current_user(token)
        if not current_user:
            return None
        if not current_user.is_active:
            return None
        return current_user

    async def refresh_token(self, refresh_token: str) -> Optional[str]:
        """Refresh access token using refresh token."""
        try:
            payload = jwt.decode(
                refresh_token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            user_id = int(payload["sub"])
            if payload["type"] != "refresh":
                return None
        except (jwt.JWTError, ValueError):
            return None
        
        user = await self.user_service.get_by_id(user_id)
        if not user or not user.is_active:
            return None
        
        return self.create_access_token(user_id)

    async def change_password(self, user: User, current_password: str, new_password: str) -> bool:
        """Change user password."""
        if not verify_password(current_password, user.hashed_password):
            return False
        
        user.hashed_password = get_password_hash(new_password)
        await self.session.commit()
        return True

    async def request_password_reset(self, email: str) -> Optional[str]:
        """Request password reset for user."""
        user = await self.user_service.get_by_email(email)
        if not user:
            return None
        
        # Generate password reset token
        expire = datetime.utcnow() + timedelta(hours=24)
        to_encode = {
            "exp": expire,
            "sub": str(user.id),
            "type": "reset"
        }
        reset_token = jwt.encode(
            to_encode,
            settings.SECRET_KEY,
            algorithm=settings.ALGORITHM
        )
        return reset_token

    async def reset_password(self, token: str, new_password: str) -> bool:
        """Reset user password using reset token."""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM]
            )
            user_id = int(payload["sub"])
            if payload["type"] != "reset":
                return False
        except (jwt.JWTError, ValueError):
            return False
        
        user = await self.user_service.get_by_id(user_id)
        if not user:
            return False
        
        user.hashed_password = get_password_hash(new_password)
        await self.session.commit()
        return True 