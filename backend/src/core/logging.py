"""Logging configuration for the application."""

import os
import logging
import logging.config
import sys
from typing import Any, Dict

from src.core.config import get_app_settings

settings = get_app_settings()

# Define the logs directory relative to the project root
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LOGS_DIR = os.path.join(BASE_DIR, "logs")

# Create logs directory if it doesn't exist
if not os.path.exists(LOGS_DIR):
    os.makedirs(LOGS_DIR)

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
        },
        "detailed": {
            "format": "[%(asctime)s] %(levelname)s %(name)s %(filename)s:%(lineno)d: %(message)s"
        }
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
        },
        "file": {
            "class": "logging.FileHandler",
            "filename": os.path.join(LOGS_DIR, "app.log"),
            "formatter": "detailed",
        }
    },
    "root": {
        "level": "INFO",
        "handlers": ["console", "file"]
    }
}

def setup_logging():
    """Set up logging configuration."""
    logging.config.dictConfig(LOGGING_CONFIG)

    # Set log levels for third-party libraries
    logging.getLogger("uvicorn").setLevel(logging.INFO)
    logging.getLogger("fastapi").setLevel(logging.INFO)
    logging.getLogger("sqlalchemy").setLevel(logging.WARNING)
    
    # Log startup message
    logging.info(
        f"Starting {settings.PROJECT_NAME} v{settings.VERSION} "
        f"in {settings.ENVIRONMENT} mode"
    )


def get_logger(name: str) -> logging.Logger:
    """Get logger instance."""
    return logging.getLogger(name)


def log_error(
    logger: logging.Logger,
    error: Exception,
    context: Dict[str, Any] = None,
) -> None:
    """Log error with context."""
    error_type = type(error).__name__
    error_message = str(error)
    
    log_data = {
        "error_type": error_type,
        "error_message": error_message,
    }
    
    if context:
        log_data.update(context)
    
    logger.error(
        f"Error occurred: {error_type} - {error_message}",
        extra={"data": log_data},
        exc_info=True,
    ) 