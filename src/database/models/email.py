from typing import Optional
from datetime import datetime
import uuid

from sqlalchemy import String, Boolean, ForeignKey, Text, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base, metadata

# Association table for email labels
email_label_association = Table(
    "email_label_association",
    metadata,
    Column("email_id", ForeignKey("emails.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", ForeignKey("email_labels.id", ondelete="CASCADE"), primary_key=True)
)

class Email(Base):
    """Email message model."""
    __tablename__ = "emails"

    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("email_accounts.id", ondelete="CASCADE"))
    message_id: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    conversation_id: Mapped[Optional[str]] = mapped_column(String(255), index=True, nullable=True)
    subject: Mapped[str] = mapped_column(String(512))
    sender: Mapped[str] = mapped_column(String(255), index=True)
    sender_name: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    recipients: Mapped[str] = mapped_column(Text)  # JSON array of recipients
    cc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of CC
    bcc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array of BCC
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    received_at: Mapped[datetime] = mapped_column(index=True)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    is_spam: Mapped[bool] = mapped_column(Boolean, default=False)
    is_trash: Mapped[bool] = mapped_column(Boolean, default=False)
    importance: Mapped[int] = mapped_column(default=0)  # 0: normal, 1: important, 2: urgent

    # AI-generated fields
    ai_summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    ai_category: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    sentiment_score: Mapped[Optional[float]] = mapped_column(nullable=True)
    priority_score: Mapped[Optional[float]] = mapped_column(nullable=True)

    # Relationships
    account: Mapped["EmailAccount"] = relationship(back_populates="emails")
    attachments: Mapped[list["EmailAttachment"]] = relationship(back_populates="email", cascade="all, delete-orphan")
    labels: Mapped[list["EmailLabel"]] = relationship(secondary=email_label_association, back_populates="emails")

class EmailAttachment(Base):
    """Email attachment model."""
    __tablename__ = "email_attachments"

    email_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"))
    filename: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(100))
    size: Mapped[int]
    storage_path: Mapped[str] = mapped_column(String(512))
    is_inline: Mapped[bool] = mapped_column(Boolean, default=False)
    content_id: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)

    # Relationships
    email: Mapped["Email"] = relationship(back_populates="attachments")

class EmailLabel(Base):
    """Email label/folder model."""
    __tablename__ = "email_labels"

    name: Mapped[str] = mapped_column(String(100))
    color: Mapped[str] = mapped_column(String(7))  # Hex color code
    icon: Mapped[Optional[str]] = mapped_column(String(50), nullable=True)
    is_system: Mapped[bool] = mapped_column(Boolean, default=False)
    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("email_accounts.id", ondelete="CASCADE"))

    # Relationships
    emails: Mapped[list["Email"]] = relationship(secondary=email_label_association, back_populates="labels")

class EmailDraft(Base):
    """Email draft model."""
    __tablename__ = "email_drafts"

    account_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("email_accounts.id", ondelete="CASCADE"))
    subject: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    recipients: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    cc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    bcc: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON array
    content_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content_html: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    reply_to_email_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("emails.id", ondelete="SET NULL"), nullable=True)

    # Relationships
    account: Mapped["EmailAccount"] = relationship(foreign_keys=[account_id])
    reply_to: Mapped[Optional["Email"]] = relationship(foreign_keys=[reply_to_email_id]) 