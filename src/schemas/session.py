"""Session schemas."""
from datetime import datetime
from typing import Any, Dict, Optional

from pydantic import BaseModel, Field


class SessionData(BaseModel):
    """Session data schema."""
    user_id: int
    created_at: datetime
    last_accessed: datetime
    data: Dict[str, Any] = Field(default_factory=dict)


class SessionCreate(BaseModel):
    """Session creation schema."""
    user_id: int
    data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    expiry_days: Optional[int] = Field(None, ge=1)


class SessionUpdate(BaseModel):
    """Session update schema."""
    data: Dict[str, Any]


class SessionResponse(BaseModel):
    """Session response schema."""
    session_id: str
    user_id: int
    created_at: datetime
    last_accessed: datetime
    data: Dict[str, Any]
    expires_in_days: float


class SessionInfo(BaseModel):
    """Session info schema."""
    session_id: str
    created_at: datetime
    last_accessed: datetime
    expires_in_days: float
    user_agent: Optional[str] = None
    ip_address: Optional[str] = None 