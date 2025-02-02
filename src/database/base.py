"""Database configuration and base model."""
import asyncio
from typing import AsyncGenerator, Any, ClassVar
import uuid
from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy import MetaData, DateTime, UUID, text
from sqlalchemy.ext.declarative import declared_attr
from sqlalchemy.sql import func
from tenacity import retry, stop_after_attempt, wait_exponential

from src.core.config import get_app_settings
from src.core.exceptions import DatabaseError

settings = get_app_settings()

# Naming convention for constraints
convention = {
    "ix": "ix_%(column_0_label)s",
    "uq": "uq_%(table_name)s_%(column_0_name)s",
    "ck": "ck_%(table_name)s_%(constraint_name)s",
    "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
    "pk": "pk_%(table_name)s"
}

metadata = MetaData(naming_convention=convention)

class Base(DeclarativeBase):
    """Base class for all database models."""
    metadata = metadata
    
    # Admin configuration
    admin_list_display: ClassVar[list[str]] = []
    admin_searchable_fields: ClassVar[list[str]] = []
    admin_filterable_fields: ClassVar[list[str]] = []

    @declared_attr.directive
    def __tablename__(cls) -> str:
        """Generate __tablename__ automatically."""
        return cls.__name__.lower() + "s"

    # Common columns for all tables
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    def dict(self) -> dict[str, Any]:
        """Convert model to dictionary."""
        return {
            column.name: getattr(self, column.name)
            for column in self.__table__.columns
        }

    @classmethod
    def get_admin_fields(cls) -> list[str]:
        """Get fields that should be displayed in admin interface."""
        return cls.admin_list_display or [column.name for column in cls.__table__.columns]

    @classmethod
    def get_searchable_fields(cls) -> list[str]:
        """Get fields that should be searchable in admin interface."""
        return cls.admin_searchable_fields

    @classmethod
    def get_filterable_fields(cls) -> list[str]:
        """Get fields that should be filterable in admin interface."""
        return cls.admin_filterable_fields

@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=4, max=10),
    reraise=True
)
async def init_db() -> None:
    """Initialize database with retry logic."""
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
    except Exception as e:
        raise DatabaseError(f"Failed to initialize database: {str(e)}")

async def check_database_connection(session: AsyncSession) -> bool:
    """Check database connection."""
    try:
        async with session.begin():
            await session.execute(text("SELECT 1"))
        return True
    except Exception as e:
        return False

# Create async engine with retry logic
engine = create_async_engine(
    str(settings.DATABASE_URI),
    echo=settings.DB_ECHO_LOG,
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    pool_recycle=1800,
    pool_pre_ping=True,
)

# Create async session factory
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Dependency for getting async database sessions."""
    async with async_session_maker() as session:
        try:
            yield session
            await session.commit()
        except Exception as e:
            await session.rollback()
            raise DatabaseError(f"Database session error: {str(e)}")
        finally:
            await session.close() 