"""Thread model."""
from datetime import datetime
from typing import List, Optional, TYPE_CHECKING, ClassVar
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base

if TYPE_CHECKING:
    from .user import User
    from .email import Email


class Thread(Base):
    """Thread model."""
    
    __tablename__ = "threads"

    # Admin configuration
    admin_list_display: ClassVar[list[str]] = [
        "id", "user_id", "subject", "is_read", "is_trash", 
        "last_message_at", "message_count"
    ]
    admin_searchable_fields: ClassVar[list[str]] = ["subject"]
    admin_filterable_fields: ClassVar[list[str]] = ["is_read", "is_trash"]
    
    # Fields
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    subject: Mapped[str] = mapped_column(String(255))
    
    # Thread status
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_trash: Mapped[bool] = mapped_column(Boolean, default=False)
    
    # Thread metadata
    last_message_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    message_count: Mapped[int] = mapped_column(default=0)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="threads")
    emails: Mapped[List["Email"]] = relationship(back_populates="thread", cascade="all, delete-orphan") 