"""Email schemas."""
from datetime import datetime
from typing import List, Optional, Dict, TypeVar, Generic
from pydantic import BaseModel, EmailStr, Field, ConfigDict, constr, validator
import uuid


T = TypeVar('T')

class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response."""
    total: int
    page: int
    size: int
    items: List[T]


class EmailBase(BaseModel):
    """Base email schema."""
    subject: str = Field(..., min_length=1, max_length=500, description="Email subject")
    body_text: str = Field(..., min_length=1, description="Plain text email body")
    body_html: Optional[str] = Field(None, description="HTML formatted email body")
    sender: EmailStr = Field(..., description="Email sender address")
    recipients: List[EmailStr] = Field(..., min_items=1, description="List of recipient email addresses")
    cc: List[EmailStr] = Field(default_factory=list, description="List of CC recipients")
    bcc: List[EmailStr] = Field(default_factory=list, description="List of BCC recipients")

    @validator('body_html')
    def validate_html(cls, v: Optional[str]) -> Optional[str]:
        """Validate HTML content."""
        if v is not None and not v.strip():
            return None
        return v


class EmailCreate(EmailBase):
    """Email creation schema."""
    folder_id: uuid.UUID = Field(..., description="ID of the folder to store the email")
    thread_id: Optional[uuid.UUID] = Field(None, description="ID of the thread this email belongs to")
    is_draft: bool = Field(True, description="Whether this is a draft email")


class EmailUpdate(BaseModel):
    """Email update schema."""
    subject: Optional[str] = Field(None, min_length=1, max_length=500)
    body_text: Optional[str] = Field(None, min_length=1)
    body_html: Optional[str] = None
    recipients: Optional[List[EmailStr]] = Field(None, min_items=1)
    cc: Optional[List[EmailStr]] = None
    bcc: Optional[List[EmailStr]] = None
    is_read: Optional[bool] = None
    is_starred: Optional[bool] = None
    is_important: Optional[bool] = None
    folder_id: Optional[uuid.UUID] = None
    thread_id: Optional[uuid.UUID] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "subject": "Updated: Meeting Notes",
                "body_text": "Updated meeting notes...",
                "recipients": ["user@example.com"],
                "is_read": True
            }
        }
    )


class EmailResponse(EmailBase):
    """Email response schema."""
    id: uuid.UUID
    user_id: uuid.UUID
    folder_id: uuid.UUID
    thread_id: Optional[uuid.UUID] = None
    is_read: bool
    is_starred: bool
    is_important: bool
    sent_at: Optional[datetime] = None
    received_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmailListResponse(PaginatedResponse[EmailResponse]):
    """Email list response schema."""
    pass


class EmailThread(BaseModel):
    """Email thread schema."""
    id: uuid.UUID
    subject: str
    emails: List[EmailResponse] = Field(..., min_items=1)
    participants: List[EmailStr]
    last_updated: datetime
    metadata: Optional[Dict[str, str]] = None

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "subject": "Meeting Discussion",
                "participants": ["user1@example.com", "user2@example.com"],
                "metadata": {"category": "work", "priority": "high"}
            }
        }
    )


class EmailAnalysisRequest(BaseModel):
    """Email analysis request schema."""
    email_id: uuid.UUID = Field(..., description="ID of the email to analyze")
    analysis_type: str = Field(
        ...,
        pattern='^(sentiment|priority|full)$',
        description="Type of analysis to perform"
    )
    options: Optional[Dict[str, str]] = Field(
        None,
        description="Additional analysis options"
    )


class EmailResponseRequest(BaseModel):
    """Email response generation request schema."""
    email_id: uuid.UUID = Field(..., description="ID of the email to respond to")
    tone: str = Field(
        "professional",
        pattern='^(professional|casual|formal)$',
        description="Desired tone of the response"
    )
    length: str = Field(
        "medium",
        pattern='^(short|medium|long)$',
        description="Desired length of the response"
    )
    include_greeting: bool = True
    include_signature: bool = True


class ThreadSummaryRequest(BaseModel):
    """Thread summary request schema."""
    thread_id: uuid.UUID = Field(..., description="ID of the thread to summarize")
    max_length: int = Field(
        150,
        description="Maximum length of the summary in words",
        ge=50,
        le=500
    )
    focus_points: Optional[List[str]] = Field(
        None,
        pattern='^(decisions|action_items|timeline)$',
        description="Specific aspects to focus on in the summary"
    ) 