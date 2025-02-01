"""Email schemas."""
from datetime import datetime
from typing import Dict, List, Optional

from pydantic import BaseModel, EmailStr, Field


class EmailBase(BaseModel):
    """Base email schema."""
    subject: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    sender: EmailStr
    importance: Optional[str] = None
    metadata: Optional[Dict] = None


class EmailCreate(EmailBase):
    """Email creation schema."""
    recipient: EmailStr
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    attachments: Optional[List[str]] = None


class EmailUpdate(BaseModel):
    """Email update schema."""
    subject: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    importance: Optional[str] = None
    metadata: Optional[Dict] = None


class EmailResponse(EmailBase):
    """Email response schema."""
    id: int
    recipient: EmailStr
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    attachments: Optional[List[str]] = None
    created_at: datetime
    updated_at: datetime
    is_read: bool = False
    is_archived: bool = False
    is_deleted: bool = False
    labels: Optional[List[str]] = None

    class Config:
        """Pydantic config."""
        from_attributes = True


class EmailThread(BaseModel):
    """Email thread schema."""
    emails: List[Dict] = Field(..., min_items=1)
    metadata: Optional[Dict] = None


class EmailAnalysisRequest(BaseModel):
    """Email analysis request schema."""
    email: EmailBase
    analysis_type: str = Field(
        ...,
        description="Type of analysis to perform",
        examples=["sentiment", "priority", "full"]
    )
    options: Optional[Dict] = None


class EmailResponseRequest(BaseModel):
    """Email response generation request schema."""
    email: EmailBase
    tone: str = Field(
        "professional",
        description="Desired tone of the response",
        examples=["professional", "casual", "formal"]
    )
    length: str = Field(
        "medium",
        description="Desired length of the response",
        examples=["short", "medium", "long"]
    )
    include_greeting: bool = True
    include_signature: bool = True


class ThreadSummaryRequest(BaseModel):
    """Thread summary request schema."""
    thread: EmailThread
    max_length: int = Field(
        150,
        description="Maximum length of the summary in words",
        ge=50,
        le=500
    )
    focus_points: Optional[List[str]] = Field(
        None,
        description="Specific points to focus on in the summary",
        examples=[["decisions", "action_items", "timeline"]]
    ) 