"""Folder model."""
from typing import List, Optional, TYPE_CHECKING, ClassVar
import uuid

from sqlalchemy import String, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.db.base import Base

if TYPE_CHECKING:
    from .user import User


class Folder(Base):
    """Folder model."""
    
    __tablename__ = "folders"

    # Admin configuration
    admin_list_display: ClassVar[list[str]] = [
        "id", "user_id", "name", "type", "order"
    ]
    admin_searchable_fields: ClassVar[list[str]] = ["name"]
    admin_filterable_fields: ClassVar[list[str]] = ["type"]
    
    # Fields
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255))
    type: Mapped[str] = mapped_column(String(50))  # inbox, sent, drafts, trash, etc.
    order: Mapped[int] = mapped_column(Integer, default=0)
    parent_id: Mapped[Optional[uuid.UUID]] = mapped_column(ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    
    # Relationships
    user: Mapped["User"] = relationship(back_populates="folders")
    parent: Mapped[Optional["Folder"]] = relationship(
        "Folder",
        remote_side="Folder.id",
        back_populates="children"
    )
    children: Mapped[List["Folder"]] = relationship(back_populates="parent") 