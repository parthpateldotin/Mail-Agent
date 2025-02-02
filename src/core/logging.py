"""Logging configuration for the application."""
import asyncio
import json
import logging
import logging.config
import logging.handlers
import sys
from datetime import datetime
from functools import partial
from pathlib import Path
from typing import Any, Dict, Optional

import structlog
from structlog.types import EventDict, Processor

from src.core.config import get_app_settings

settings = get_app_settings()

# Create logs directory if it doesn't exist
LOGS_DIR = Path("logs")
LOGS_DIR.mkdir(exist_ok=True)

# Configure logging settings
LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {
        "standard": {
            "format": "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
        },
        "json": {
            "()": structlog.stdlib.ProcessorFormatter,
            "processor": structlog.processors.JSONRenderer(),
        },
    },
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "standard",
            "stream": sys.stdout,
        },
        "file": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "json",
            "filename": LOGS_DIR / "app.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
        },
        "error_file": {
            "class": "logging.handlers.RotatingFileHandler",
            "formatter": "json",
            "filename": LOGS_DIR / "error.log",
            "maxBytes": 10485760,  # 10MB
            "backupCount": 5,
            "level": "ERROR",
        },
    },
    "loggers": {
        "": {  # Root logger
            "handlers": ["console", "file", "error_file"],
            "level": settings.LOG_LEVEL.upper(),
            "propagate": True,
        },
        "uvicorn": {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
        "sqlalchemy": {
            "handlers": ["console", "file"],
            "level": "WARNING",
            "propagate": False,
        },
    },
}

def add_timestamp(_, __, event_dict: EventDict) -> EventDict:
    """Add timestamp to the event dictionary."""
    event_dict["timestamp"] = datetime.utcnow().isoformat()
    return event_dict

def add_log_level(_, level: str, event_dict: EventDict) -> EventDict:
    """Add log level to the event dictionary."""
    event_dict["level"] = level
    return event_dict

def add_logger_name(logger: str, _, event_dict: EventDict) -> EventDict:
    """Add logger name to the event dictionary."""
    event_dict["logger"] = logger
    return event_dict

def setup_logging() -> None:
    """Set up logging configuration."""
    # Configure standard logging
    logging.config.dictConfig(LOGGING_CONFIG)
    
    # Configure structlog
    structlog.configure(
        processors=[
            structlog.stdlib.add_log_level,
            structlog.stdlib.PositionalArgumentsFormatter(),
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.StackInfoRenderer(),
            structlog.processors.format_exc_info,
            structlog.processors.UnicodeDecoder(),
            structlog.stdlib.ProcessorFormatter.wrap_for_formatter,
        ],
        logger_factory=structlog.stdlib.LoggerFactory(),
        wrapper_class=structlog.stdlib.BoundLogger,
        cache_logger_on_first_use=True,
    )

def get_logger(name: str) -> structlog.BoundLogger:
    """Get a logger instance."""
    return structlog.get_logger(name)

class LoggerMixin:
    """Mixin to add logging capabilities to a class."""
    
    def __init__(self, *args: Any, **kwargs: Any) -> None:
        """Initialize the logger."""
        super().__init__(*args, **kwargs)
        self.logger = get_logger(self.__class__.__name__)

def log_function_call(func: Any) -> Any:
    """Decorator to log function calls."""
    logger = get_logger(func.__module__)
    
    def wrapper(*args: Any, **kwargs: Any) -> Any:
        logger.info(
            f"Calling {func.__name__}",
            args=args,
            kwargs=kwargs
        )
        try:
            result = func(*args, **kwargs)
            logger.info(
                f"{func.__name__} completed successfully",
                result=result
            )
            return result
        except Exception as e:
            logger.error(
                f"Error in {func.__name__}",
                error=str(e),
                exc_info=True
            )
            raise
    
    return wrapper

def log_error(logger: structlog.BoundLogger, error: Exception, context: Dict[str, Any] = None) -> None:
    """Log an error with context."""
    error_context = {
        "error_type": type(error).__name__,
        "error_message": str(error),
        **(context or {})
    }
    logger.error("Error occurred", **error_context, exc_info=True)

def configure_logger(name: str, level: str = None) -> structlog.BoundLogger:
    """Configure a logger with custom settings."""
    logger = get_logger(name)
    if level:
        logging.getLogger(name).setLevel(level.upper())
    return logger

def create_audit_logger() -> structlog.BoundLogger:
    """Create a logger for audit events."""
    audit_handler = logging.handlers.RotatingFileHandler(
        LOGS_DIR / "audit.log",
        maxBytes=10485760,  # 10MB
        backupCount=5
    )
    audit_handler.setFormatter(logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    ))
    
    audit_logger = logging.getLogger("audit")
    audit_logger.addHandler(audit_handler)
    audit_logger.setLevel(logging.INFO)
    
    return get_logger("audit")

# Create loggers
app_logger = get_logger("app")
error_logger = get_logger("error")
access_logger = get_logger("access")
security_logger = get_logger("security")

def log_info(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
    """Log info message."""
    self.logger.info(message, extra=extra or {})

def log_warning(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
    """Log warning message."""
    self.logger.warning(message, extra=extra or {})

def log_debug(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
    """Log debug message."""
    self.logger.debug(message, extra=extra or {}) 