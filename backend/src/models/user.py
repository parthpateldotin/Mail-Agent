"""User models and schemas."""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING, ClassVar
from pydantic import BaseModel, EmailStr, Field, ConfigDict
import uuid

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base

if TYPE_CHECKING:
    from .email import Email
    from .folder import Folder
    from .label import Label
    from .thread import Thread


class UserBase(BaseModel):
    """Base user model."""
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    is_active: bool = True
    is_admin: bool = False


class UserCreate(UserBase):
    """User creation model."""
    password: str = Field(..., min_length=8, max_length=100)


class UserUpdate(BaseModel):
    """User update model."""
    email: Optional[EmailStr] = None
    full_name: Optional[str] = Field(None, min_length=1, max_length=100)
    password: Optional[str] = Field(None, min_length=8, max_length=100)
    is_active: Optional[bool] = None
    is_admin: Optional[bool] = None


class UserInDB(UserBase):
    """User database model."""
    id: int
    hashed_password: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class User(Base):
    """User model."""
    
    __tablename__ = "users"
    
    # Admin configuration
    admin_list_display: ClassVar[list[str]] = [
        "id", "email", "full_name", "is_active", "is_superuser", "last_login"
    ]
    admin_searchable_fields: ClassVar[list[str]] = ["email", "full_name"]
    admin_filterable_fields: ClassVar[list[str]] = ["is_active", "is_superuser"]
    
    # Fields
    id: Mapped[str] = mapped_column(
        String,
        primary_key=True,
        default=lambda: str(uuid.uuid4())
    )
    email: Mapped[str] = mapped_column(
        String,
        unique=True,
        index=True,
        nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        String,
        nullable=False
    )
    full_name: Mapped[str] = mapped_column(
        String,
        index=True
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        default=True
    )
    is_superuser: Mapped[bool] = mapped_column(
        Boolean,
        default=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )
    last_login: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Email settings
    email_signature: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    vacation_responder_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    vacation_responder_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    
    # Relationships
    emails: Mapped[List["Email"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    folders: Mapped[List["Folder"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    labels: Mapped[List["Label"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    threads: Mapped[List["Thread"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    password_resets: Mapped[List["PasswordReset"]] = relationship(back_populates="user", cascade="all, delete-orphan")
    email_verifications: Mapped[List["EmailVerification"]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @classmethod
    def get_admin_fields(cls) -> list[str]:
        """Get fields that should be displayed in admin interface."""
        return cls.admin_list_display

    @classmethod
    def get_searchable_fields(cls) -> list[str]:
        """Get fields that should be searchable in admin interface."""
        return cls.admin_searchable_fields

    @classmethod
    def get_filterable_fields(cls) -> list[str]:
        """Get fields that should be filterable in admin interface."""
        return cls.admin_filterable_fields

    def __repr__(self) -> str:
        """Return string representation of the user."""
        return f"<User {self.email}>"


class EmailVerification(Base):
    """Email verification model."""
    
    __tablename__ = "email_verifications"
    
    # Admin configuration
    admin_list_display: ClassVar[list[str]] = [
        "id", "user_id", "token", "is_used", "expires_at"
    ]
    admin_searchable_fields: ClassVar[list[str]] = ["token"]
    admin_filterable_fields: ClassVar[list[str]] = ["is_used"]
    
    # Fields
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="email_verifications")


class PasswordReset(Base):
    """Password reset model."""
    
    __tablename__ = "password_resets"
    
    # Admin configuration
    admin_list_display: ClassVar[list[str]] = [
        "id", "user_id", "token", "is_used", "expires_at"
    ]
    admin_searchable_fields: ClassVar[list[str]] = ["token"]
    admin_filterable_fields: ClassVar[list[str]] = ["is_used"]
    
    # Fields
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    token: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="password_resets")


class UserResponse(UserBase):
    """User response model."""
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True) 