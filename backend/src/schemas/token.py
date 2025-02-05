"""Token schemas."""
from typing import Optional

from pydantic import BaseModel


class Token(BaseModel):
    """Token schema."""
    
    access_token: str
    token_type: str
    refresh_token: Optional[str] = None


class TokenPayload(BaseModel):
    """Token payload schema."""
    
    sub: Optional[str] = None
    exp: int 