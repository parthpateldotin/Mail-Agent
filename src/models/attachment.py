"""Attachment model."""
from typing import TYPE_CHECKING, ClassVar
import uuid

from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base

if TYPE_CHECKING:
    from .email import Email


class Attachment(Base):
    """Attachment model."""
    
    __tablename__ = "attachments"

    # Admin configuration
    admin_list_display: ClassVar[list[str]] = [
        "id", "email_id", "filename", "content_type", "size"
    ]
    admin_searchable_fields: ClassVar[list[str]] = ["filename", "content_type"]
    admin_filterable_fields: ClassVar[list[str]] = ["content_type"]
    
    # Fields
    email_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"), index=True)
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int] = mapped_column(Integer)  # Size in bytes
    storage_path: Mapped[str] = mapped_column(String(255))  # Path to the file in storage
    
    # Relationships
    email: Mapped["Email"] = relationship(back_populates="attachments") 