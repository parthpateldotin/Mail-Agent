from typing import Optional
from pydantic import BaseModel


class Token(BaseModel):
    """Token response model."""
    access_token: str
    refresh_token: str
    token_type: str


class TokenPayload(BaseModel):
    """Token payload model."""
    sub: int  # user_id
    exp: Optional[int] = None
    type: Optional[str] = None  # access or refresh


class TokenData(BaseModel):
    """Token data model."""
    user_id: int


class LoginRequest(BaseModel):
    """Login request model."""
    email: str
    password: str


class RefreshRequest(BaseModel):
    """Refresh token request model."""
    refresh_token: str 