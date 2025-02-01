"""Test configuration and fixtures."""
import asyncio
from typing import AsyncGenerator, Generator
from unittest.mock import MagicMock

import pytest
import pytest_asyncio
from fastapi import FastAPI
from httpx import AsyncClient
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine
)

from src.api.deps import get_db, get_redis
from src.core.config import settings
from src.db.base import Base
from src.main import create_application


@pytest.fixture(scope="session")
def event_loop() -> Generator:
    """Create event loop for tests."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(scope="session")
async def test_engine() -> AsyncGenerator[AsyncEngine, None]:
    """Create test database engine."""
    # Use SQLite for testing
    engine = create_async_engine(
        "sqlite+aiosqlite:///./test.db",
        echo=False,
        connect_args={"check_same_thread": False}
    )
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Clean up
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()


@pytest_asyncio.fixture(scope="function")
async def test_session(test_engine: AsyncEngine) -> AsyncGenerator[AsyncSession, None]:
    """Create test database session."""
    async_session = async_sessionmaker(
        test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture(scope="session")
async def mock_redis() -> AsyncGenerator[MagicMock, None]:
    """Create mock Redis client."""
    mock = MagicMock(spec=Redis)
    mock.get.return_value = None
    mock.setex.return_value = True
    yield mock


@pytest_asyncio.fixture(scope="session")
async def app(
    test_engine: AsyncEngine,
    mock_redis: MagicMock
) -> AsyncGenerator[FastAPI, None]:
    """Create test application."""
    app = create_application()
    
    # Override dependencies
    async def get_test_db() -> AsyncGenerator[AsyncSession, None]:
        async_session = async_sessionmaker(
            test_engine,
            class_=AsyncSession,
            expire_on_commit=False
        )
        async with async_session() as session:
            yield session
    
    async def get_test_redis() -> AsyncGenerator[Redis, None]:
        yield mock_redis
    
    app.dependency_overrides[get_db] = get_test_db
    app.dependency_overrides[get_redis] = get_test_redis
    
    yield app


@pytest_asyncio.fixture(scope="session")
async def client(app: FastAPI) -> AsyncGenerator[AsyncClient, None]:
    """Create test client."""
    async with AsyncClient(
        app=app,
        base_url=f"http://test{settings.API_V1_STR}"
    ) as client:
        yield client 