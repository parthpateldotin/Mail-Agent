from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class EmailBase(BaseModel):
    """Base email model."""
    subject: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    to_email: List[EmailStr]
    cc_email: Optional[List[EmailStr]] = []
    bcc_email: Optional[List[EmailStr]] = []
    attachments: Optional[List[str]] = []


class EmailCreate(EmailBase):
    """Email creation model."""
    pass


class EmailUpdate(BaseModel):
    """Email update model."""
    subject: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    to_email: Optional[List[EmailStr]] = None
    cc_email: Optional[List[EmailStr]] = None
    bcc_email: Optional[List[EmailStr]] = None
    attachments: Optional[List[str]] = None


class EmailInDB(EmailBase):
    """Email database model."""
    id: int
    user_id: int
    status: str = Field(..., regex="^(draft|sent|failed)$")
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Email(EmailBase):
    """Email response model."""
    id: int
    user_id: int
    status: str
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class EmailResponse(BaseModel):
    """Email sending response model."""
    message_id: str
    status: str
    sent_at: datetime 