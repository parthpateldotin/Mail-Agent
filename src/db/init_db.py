import logging
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_app_settings
from src.core.security import get_password_hash
from src.db.base import Base
from src.db.session import engine
from src.models.user import UserCreate
from src.services.users import UserService

settings = get_app_settings()
logger = logging.getLogger(__name__)


async def init_db() -> None:
    """Initialize database."""
    try:
        # Create database tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database tables created successfully")

        # Create initial admin user if it doesn't exist
        async with AsyncSession(engine) as session:
            admin_user = await UserService.get_user_by_email(
                session,
                settings.FIRST_ADMIN_EMAIL,
            )
            if not admin_user and settings.FIRST_ADMIN_EMAIL:
                admin = UserCreate(
                    email=settings.FIRST_ADMIN_EMAIL,
                    password=settings.FIRST_ADMIN_PASSWORD,
                    full_name="Admin User",
                    is_admin=True,
                )
                await UserService.create_user(session, admin)
                logger.info("Admin user created successfully")

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise 