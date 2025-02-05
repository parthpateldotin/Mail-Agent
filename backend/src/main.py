"""Main application module."""
import logging
import uvicorn
from src.core.config import settings
from src.core.logging import setup_logging
from src.api.application import create_application

# Initialize logging
setup_logging()
logger = logging.getLogger(__name__)

# Get settings
settings = settings

# Create FastAPI application
app = create_application()

if __name__ == "__main__":
    try:
        logger.info(
            f"Starting {settings.PROJECT_NAME} v{settings.VERSION} "
            f"in {settings.ENVIRONMENT} mode"
        )
        uvicorn.run(
            "src.main:app",
            host=settings.HOST,
            port=settings.PORT,
            reload=settings.RELOAD,
            workers=settings.WORKERS,
            log_level=settings.LOG_LEVEL.lower(),
            proxy_headers=True,
            forwarded_allow_ips="*",
        )
    except Exception as e:
        logger.error(f"Failed to start application: {e}")
        raise