"""Authentication schemas."""
from typing import Optional

from pydantic import BaseModel, EmailStr, constr


class Token(BaseModel):
    """Token schema."""
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None


class RefreshToken(BaseModel):
    """Refresh token schema."""
    refresh_token: str


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    """User creation schema."""
    password: constr(min_length=8)


class UserLogin(BaseModel):
    """User login schema."""
    email: EmailStr
    password: str


class UserResponse(UserBase):
    """User response schema."""
    id: int
    is_active: bool
    is_admin: bool = False

    class Config:
        """Pydantic config."""
        from_attributes = True


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema."""
    token: str
    new_password: constr(min_length=8)


class EmailVerificationRequest(BaseModel):
    """Email verification request schema."""
    email: EmailStr 