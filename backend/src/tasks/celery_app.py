"""Celery application configuration."""
import os
from functools import lru_cache

from celery import Celery

from src.core.config import settings

celery_app = Celery(
    "aimail",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.tasks.email_tasks",
        "src.tasks.ai_tasks",
        "src.tasks.sync_tasks"
    ]
)

# Optional configuration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=3600,  # 1 hour
    worker_max_tasks_per_child=1000,
    worker_prefetch_multiplier=1
)

# Optional: Configure task routing
celery_app.conf.task_routes = {
    "src.tasks.email_tasks.*": {"queue": "email"},
    "src.tasks.ai_tasks.*": {"queue": "ai"},
    "src.tasks.sync_tasks.*": {"queue": "sync"}
}

# Optional: Configure task schedules
celery_app.conf.beat_schedule = {
    "sync-emails-every-5-minutes": {
        "task": "src.tasks.sync_tasks.sync_all_mailboxes",
        "schedule": 300.0,  # 5 minutes
        "options": {"queue": "sync"}
    },
    "cleanup-old-emails-daily": {
        "task": "src.tasks.email_tasks.cleanup_old_emails",
        "schedule": 86400.0,  # 24 hours
        "options": {"queue": "email"}
    }
} 