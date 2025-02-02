"""Script to create database tables."""
import asyncio

from sqlalchemy.ext.asyncio import create_async_engine

from src.database.base import Base
from src.models.user import User
from src.models.folder import Folder
from src.models.email import Email
from src.models.label import Label, email_labels
from src.models.thread import Thread
from src.models.attachment import Attachment


async def create_tables():
    """Create database tables."""
    engine = create_async_engine(
        "postgresql+asyncpg://postgres:postgres@localhost:5432/aimail",
        echo=True,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    await engine.dispose()
    print("Tables created successfully!")


if __name__ == "__main__":
    asyncio.run(create_tables()) 