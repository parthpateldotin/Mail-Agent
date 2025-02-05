"""Test configuration."""
import os
from functools import lru_cache
from typing import Generator

import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient

from src.core.config import Settings
from src.db.base import Base
from src.main import app
from src.api.dependencies.database import get_db

# Test database URL
TEST_POSTGRES_SERVER = "localhost"
TEST_POSTGRES_USER = "postgres"
TEST_POSTGRES_PASSWORD = "postgres"
TEST_POSTGRES_DB = "aimail_test"
TEST_POSTGRES_PORT = "5432"

# Test email settings
TEST_MAIL_SERVER = "smtp.hostinger.com"
TEST_MAIL_PORT = 587
TEST_MAIL_USERNAME = "test@deployx.in"
TEST_MAIL_PASSWORD = "test_password"

# Test OpenAI settings
TEST_OPENAI_API_KEY = "test-key"
TEST_OPENAI_MODEL = "gpt-4"

class TestSettings(Settings):
    """Test settings."""
    
    class Config:
        env_prefix = "TEST_"
    
    # Override database settings for testing
    POSTGRES_SERVER: str = TEST_POSTGRES_SERVER
    POSTGRES_USER: str = TEST_POSTGRES_USER
    POSTGRES_PASSWORD: str = TEST_POSTGRES_PASSWORD
    POSTGRES_DB: str = TEST_POSTGRES_DB
    POSTGRES_PORT: str = TEST_POSTGRES_PORT
    
    # Override email settings for testing
    MAIL_SERVER: str = TEST_MAIL_SERVER
    MAIL_PORT: int = TEST_MAIL_PORT
    MAIL_USERNAME: str = TEST_MAIL_USERNAME
    MAIL_PASSWORD: str = TEST_MAIL_PASSWORD
    
    # Override OpenAI settings for testing
    OPENAI_API_KEY: str = TEST_OPENAI_API_KEY
    OPENAI_MODEL: str = TEST_OPENAI_MODEL
    
    # Override other settings for testing
    ENVIRONMENT: str = "test"
    DEBUG: bool = True
    TESTING: bool = True


@lru_cache
def get_test_settings() -> TestSettings:
    """Get cached test settings."""
    return TestSettings()


# Test database
test_engine = create_async_engine(
    str(get_test_settings().DATABASE_URL),
    echo=True,
    future=True,
)

TestingSessionLocal = sessionmaker(
    test_engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def init_test_db() -> None:
    """Initialize test database."""
    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def get_test_db() -> Generator[AsyncSession, None, None]:
    """Get test database session."""
    async with TestingSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


@pytest.fixture
def test_app():
    """Test application fixture."""
    app.dependency_overrides[get_db] = get_test_db
    with TestClient(app) as client:
        yield client
    app.dependency_overrides.clear() 