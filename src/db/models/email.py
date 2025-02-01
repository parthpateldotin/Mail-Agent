from datetime import datetime
from typing import List, Optional
from sqlalchemy import String, Text, JSON, ForeignKey, Enum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base


class Email(Base):
    """Email database model."""

    subject: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
    )
    content: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    to_email: Mapped[List[str]] = mapped_column(
        JSON,
        nullable=False,
    )
    cc_email: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        default=[],
    )
    bcc_email: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        default=[],
    )
    attachments: Mapped[Optional[List[str]]] = mapped_column(
        JSON,
        nullable=True,
        default=[],
    )
    status: Mapped[str] = mapped_column(
        Enum("draft", "sent", "failed", name="email_status"),
        default="draft",
        nullable=False,
    )
    sent_at: Mapped[Optional[datetime]] = mapped_column(
        nullable=True,
    )

    # Foreign Keys
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user.id", ondelete="CASCADE"),
        nullable=False,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        "User",
        back_populates="emails",
    )

    def __repr__(self) -> str:
        """String representation of Email model."""
        return f"<Email {self.id}: {self.subject}>" 