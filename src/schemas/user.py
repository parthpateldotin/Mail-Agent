"""User schemas."""
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict
import uuid


class UserBase(BaseModel):
    """Base user schema."""
    email: EmailStr = Field(..., description="User's email address")
    full_name: str = Field(..., min_length=1, max_length=255, description="User's full name")


class UserCreate(UserBase):
    """User creation schema."""
    password: str = Field(..., min_length=8, max_length=100, description="User's password")


class UserUpdate(BaseModel):
    """User update schema."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=255)
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    is_active: Optional[bool] = None
    email_signature: Optional[str] = None
    vacation_responder_enabled: Optional[bool] = None
    vacation_responder_message: Optional[str] = None


class UserInDB(UserBase):
    """User database schema."""
    id: uuid.UUID
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserResponse(UserBase):
    """User response schema."""
    id: uuid.UUID
    is_active: bool
    is_superuser: bool
    last_login: Optional[datetime] = None
    email_signature: Optional[str] = None
    vacation_responder_enabled: bool
    vacation_responder_message: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    """Token schema."""
    access_token: str
    token_type: str = "bearer"
    refresh_token: Optional[str] = None


class TokenData(BaseModel):
    """Token data schema."""
    user_id: uuid.UUID
    exp: datetime 