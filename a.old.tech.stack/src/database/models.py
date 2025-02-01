from datetime import datetime
from typing import List

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    email_accounts: Mapped[List["EmailAccount"]] = relationship(back_populates="user")
    email_rules: Mapped[List["EmailRule"]] = relationship(back_populates="user")


class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    email_address: Mapped[str] = mapped_column(String(255))
    access_token: Mapped[str] = mapped_column(Text)
    refresh_token: Mapped[str] = mapped_column(Text)
    provider: Mapped[str] = mapped_column(String(50))  # e.g., "gmail", "outlook"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="email_accounts")
    emails: Mapped[List["Email"]] = relationship(back_populates="email_account")


class Email(Base):
    __tablename__ = "emails"

    id: Mapped[int] = mapped_column(primary_key=True)
    email_account_id: Mapped[int] = mapped_column(ForeignKey("email_accounts.id"))
    message_id: Mapped[str] = mapped_column(String(255), unique=True)
    subject: Mapped[str] = mapped_column(String(255))
    sender: Mapped[str] = mapped_column(String(255))
    recipients: Mapped[str] = mapped_column(Text)
    content: Mapped[str] = mapped_column(Text)
    received_at: Mapped[datetime] = mapped_column(DateTime)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    is_archived: Mapped[bool] = mapped_column(Boolean, default=False)
    is_spam: Mapped[bool] = mapped_column(Boolean, default=False)
    ai_summary: Mapped[str] = mapped_column(Text, nullable=True)
    ai_category: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    email_account: Mapped["EmailAccount"] = relationship(back_populates="emails")
    labels: Mapped[List["EmailLabel"]] = relationship(secondary="email_label_association")


class EmailRule(Base):
    __tablename__ = "email_rules"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255))
    condition_field: Mapped[str] = mapped_column(String(50))  # e.g., "subject", "sender"
    condition_operator: Mapped[str] = mapped_column(String(50))  # e.g., "contains", "equals"
    condition_value: Mapped[str] = mapped_column(Text)
    action_type: Mapped[str] = mapped_column(String(50))  # e.g., "move", "label", "archive"
    action_value: Mapped[str] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="email_rules")


class EmailLabel(Base):
    __tablename__ = "email_labels"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(50))
    color: Mapped[str] = mapped_column(String(7))  # Hex color code
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    
    # Relationships
    emails: Mapped[List["Email"]] = relationship(secondary="email_label_association")


class EmailLabelAssociation(Base):
    __tablename__ = "email_label_association"

    email_id: Mapped[int] = mapped_column(ForeignKey("emails.id"), primary_key=True)
    label_id: Mapped[int] = mapped_column(ForeignKey("email_labels.id"), primary_key=True) 