"""Logging configuration for the application."""
import asyncio
import json
import logging
import sys
from datetime import datetime
from functools import partial
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Any, Dict, Optional

from pythonjsonlogger import jsonlogger

from src.core.config import settings

# Create logs directory
log_dir = Path("logs")
log_dir.mkdir(exist_ok=True)

# Log file paths
APP_LOG_FILE = log_dir / "app.log"
ERROR_LOG_FILE = log_dir / "error.log"
ACCESS_LOG_FILE = log_dir / "access.log"
SECURITY_LOG_FILE = log_dir / "security.log"

class CustomJsonFormatter(jsonlogger.JsonFormatter):
    """Custom JSON formatter for logs."""
    
    def add_fields(self, log_record: Dict[str, Any], record: logging.LogRecord, message_dict: Dict[str, Any]) -> None:
        """Add custom fields to the log record."""
        super().add_fields(log_record, record, message_dict)
        
        # Add timestamp
        log_record['timestamp'] = datetime.utcnow().isoformat()
        log_record['level'] = record.levelname
        log_record['environment'] = settings.ENVIRONMENT
        
        # Add caller info
        log_record['module'] = record.module
        log_record['funcName'] = record.funcName
        log_record['lineno'] = record.lineno
        
        # Add correlation ID if available
        if hasattr(record, 'correlation_id'):
            log_record['correlation_id'] = record.correlation_id
        
        # Add request info if available
        if hasattr(record, 'request_id'):
            log_record['request_id'] = record.request_id
        if hasattr(record, 'user_id'):
            log_record['user_id'] = record.user_id
        if hasattr(record, 'ip_address'):
            log_record['ip_address'] = record.ip_address


def setup_logger(
    name: str,
    log_file: Path,
    level: int = logging.INFO,
    rotation_max_bytes: int = 10 * 1024 * 1024,  # 10MB
    rotation_backup_count: int = 5
) -> logging.Logger:
    """Set up a logger with file and console handlers."""
    logger = logging.getLogger(name)
    logger.setLevel(level)
    
    # Create formatters
    json_formatter = CustomJsonFormatter(
        '%(timestamp)s %(level)s %(name)s %(message)s'
    )
    
    # File handler with rotation
    file_handler = RotatingFileHandler(
        log_file,
        maxBytes=rotation_max_bytes,
        backupCount=rotation_backup_count
    )
    file_handler.setFormatter(json_formatter)
    logger.addHandler(file_handler)
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setFormatter(json_formatter)
    logger.addHandler(console_handler)
    
    return logger


# Create loggers
app_logger = setup_logger("app", APP_LOG_FILE)
error_logger = setup_logger("error", ERROR_LOG_FILE, level=logging.ERROR)
access_logger = setup_logger("access", ACCESS_LOG_FILE)
security_logger = setup_logger("security", SECURITY_LOG_FILE)


class LoggerMixin:
    """Mixin to add logging capabilities to a class."""
    
    def __init__(self) -> None:
        """Initialize logger for the class."""
        self.logger = logging.getLogger(f"app.{self.__class__.__name__}")
    
    def log_info(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Log info message."""
        self.logger.info(message, extra=extra or {})
    
    def log_error(self, message: str, error: Optional[Exception] = None, extra: Optional[Dict[str, Any]] = None) -> None:
        """Log error message."""
        extra = extra or {}
        if error:
            extra["error_type"] = type(error).__name__
            extra["error_message"] = str(error)
        self.logger.error(message, extra=extra, exc_info=error is not None)
    
    def log_warning(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Log warning message."""
        self.logger.warning(message, extra=extra or {})
    
    def log_debug(self, message: str, extra: Optional[Dict[str, Any]] = None) -> None:
        """Log debug message."""
        self.logger.debug(message, extra=extra or {})


def log_function_call(func):
    """Decorator to log function calls."""
    logger = logging.getLogger(f"app.{func.__module__}.{func.__name__}")
    
    async def async_wrapper(*args, **kwargs):
        start_time = datetime.utcnow()
        try:
            result = await func(*args, **kwargs)
            logger.info(
                f"Function {func.__name__} completed successfully",
                extra={
                    "duration_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
                    "args": str(args),
                    "kwargs": str(kwargs)
                }
            )
            return result
        except Exception as e:
            logger.error(
                f"Function {func.__name__} failed",
                extra={
                    "duration_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
                    "args": str(args),
                    "kwargs": str(kwargs),
                    "error": str(e)
                },
                exc_info=True
            )
            raise
    
    def sync_wrapper(*args, **kwargs):
        start_time = datetime.utcnow()
        try:
            result = func(*args, **kwargs)
            logger.info(
                f"Function {func.__name__} completed successfully",
                extra={
                    "duration_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
                    "args": str(args),
                    "kwargs": str(kwargs)
                }
            )
            return result
        except Exception as e:
            logger.error(
                f"Function {func.__name__} failed",
                extra={
                    "duration_ms": (datetime.utcnow() - start_time).total_seconds() * 1000,
                    "args": str(args),
                    "kwargs": str(kwargs),
                    "error": str(e)
                },
                exc_info=True
            )
            raise
    
    return async_wrapper if asyncio.iscoroutinefunction(func) else sync_wrapper 