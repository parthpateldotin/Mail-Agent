"""Authentication schemas."""
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


class Token(BaseModel):
    """Token schema."""
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None


class TokenPayload(BaseModel):
    """Token payload schema."""
    sub: Optional[str] = None
    exp: int


class UserLogin(BaseModel):
    """User login schema."""
    email: EmailStr
    password: str = Field(..., min_length=8)


class UserCreate(BaseModel):
    """User creation schema."""
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: str = Field(..., min_length=1, max_length=100)
    is_superuser: bool = False


class UserResponse(BaseModel):
    """User response schema."""
    id: str
    email: EmailStr
    full_name: str
    is_active: bool
    is_superuser: bool

    class Config:
        """Pydantic config."""
        from_attributes = True


class RefreshToken(BaseModel):
    """Refresh token schema."""
    refresh_token: str


class PasswordResetRequest(BaseModel):
    """Password reset request schema."""
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation schema."""
    token: str
    new_password: str = Field(..., min_length=8)


class EmailVerificationRequest(BaseModel):
    """Email verification request schema."""
    email: EmailStr 