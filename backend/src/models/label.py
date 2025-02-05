"""Label model."""
from typing import List, TYPE_CHECKING, ClassVar
import uuid

from sqlalchemy import String, ForeignKey, Integer, Table, Column
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base

if TYPE_CHECKING:
    from .user import User
    from .email import Email

# Association table for many-to-many relationship between emails and labels
email_labels = Table(
    "email_labels",
    Base.metadata,
    Column("email_id", ForeignKey("emails.id", ondelete="CASCADE"), primary_key=True),
    Column("label_id", ForeignKey("labels.id", ondelete="CASCADE"), primary_key=True),
)

class Label(Base):
    """Label model."""
    
    __tablename__ = "labels"

    # Admin configuration
    admin_list_display: ClassVar[list[str]] = [
        "id", "user_id", "name", "color", "order"
    ]
    admin_searchable_fields: ClassVar[list[str]] = ["name"]
    admin_filterable_fields: ClassVar[list[str]] = ["color"]
    
    # Fields
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    color: Mapped[str] = mapped_column(String(50))  # hex color code
    order: Mapped[int] = mapped_column(Integer, default=0)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="labels")
    emails: Mapped[List["Email"]] = relationship(
        secondary=email_labels,
        back_populates="labels",
        cascade="all, delete",
    ) 