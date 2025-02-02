from typing import Callable
from fastapi import FastAPI
from src.core.config import get_app_settings
from src.database.session import engine, async_session_maker
from src.database.base import Base

def create_start_app_handler(app: FastAPI) -> Callable:
    async def start_app() -> None:
        # Create database tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Initialize any services or connections here
        pass

    return start_app

def create_stop_app_handler(app: FastAPI) -> Callable:
    async def stop_app() -> None:
        # Close any open connections or cleanup here
        await engine.dispose()

    return stop_app 