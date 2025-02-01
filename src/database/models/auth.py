from typing import Optional
from datetime import datetime
import uuid

from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base

class User(Base):
    """User model for authentication and profile information."""
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_superuser: Mapped[bool] = mapped_column(Boolean, default=False)
    last_login: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Relationships
    email_accounts: Mapped[list["EmailAccount"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    access_tokens: Mapped[list["AccessToken"]] = relationship(back_populates="user", cascade="all, delete-orphan")

class EmailAccount(Base):
    """Email account configuration for users."""
    __tablename__ = "email_accounts"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    email_address: Mapped[str] = mapped_column(String(255))
    provider: Mapped[str] = mapped_column(String(50))  # e.g., "gmail", "outlook"
    access_token: Mapped[str] = mapped_column(String(1024))
    refresh_token: Mapped[Optional[str]] = mapped_column(String(1024), nullable=True)
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_sync: Mapped[Optional[datetime]] = mapped_column(nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="email_accounts")

class AccessToken(Base):
    """Access tokens for API authentication."""
    __tablename__ = "access_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    expires_at: Mapped[datetime]
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False)
    device_info: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    ip_address: Mapped[Optional[str]] = mapped_column(String(45), nullable=True)

    # Relationships
    user: Mapped["User"] = relationship(back_populates="access_tokens") 