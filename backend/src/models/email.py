from datetime import datetime
from typing import List, Optional, TYPE_CHECKING, ClassVar
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from sqlalchemy import ForeignKey, String, Text, Boolean, DateTime, func, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
import uuid

from src.db.base import Base
from .label import email_labels

if TYPE_CHECKING:
    from .user import User
    from .folder import Folder
    from .thread import Thread
    from .attachment import Attachment
    from .label import Label


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
    status: str = Field(..., pattern="^(draft|sent|failed)$")
    created_at: datetime
    updated_at: datetime
    sent_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class Email(Base):
    """Email model."""
    __tablename__ = "emails"

    # Admin configuration
    admin_list_display: ClassVar[list[str]] = [
        "id", "user_id", "thread_id", "subject", "from_address", "to_address", 
        "is_read", "is_sent", "is_draft", "is_trash", "sent_at"
    ]
    admin_searchable_fields: ClassVar[list[str]] = [
        "subject", "from_address", "to_address", "cc", "bcc"
    ]
    admin_filterable_fields: ClassVar[list[str]] = [
        "is_read", "is_sent", "is_draft", "is_trash"
    ]
    
    # Fields
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    thread_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("threads.id", ondelete="CASCADE"), nullable=True, index=True)
    
    # Email content
    subject: Mapped[str] = mapped_column(String(255))
    body: Mapped[str] = mapped_column(Text)
    from_address: Mapped[str] = mapped_column(String(255))
    to_address: Mapped[str] = mapped_column(String(255))
    cc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    bcc: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    
    # Email status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_sent: Mapped[bool] = mapped_column(Boolean, default=False)
    is_draft: Mapped[bool] = mapped_column(Boolean, default=True)
    is_trash: Mapped[bool] = mapped_column(Boolean, default=False)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Email importance
    importance: Mapped[int] = mapped_column(Integer, default=0)  # 0=normal, 1=important, 2=urgent
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="emails")
    thread: Mapped[Optional["Thread"]] = relationship(back_populates="emails")
    attachments: Mapped[List["Attachment"]] = relationship(back_populates="email", cascade="all, delete-orphan")
    labels: Mapped[List["Label"]] = relationship(
        secondary=email_labels,
        back_populates="emails",
        cascade="all, delete",
    )

    def __repr__(self) -> str:
        """String representation."""
        return f"<Email {self.id}: {self.subject}>"


class EmailResponse(BaseModel):
    """Email sending response model."""
    message_id: str
    status: str
    sent_at: datetime 