from celery import Celery
from src.config.settings import get_settings

settings = get_settings()

celery_app = Celery(
    "aimail",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
    include=[
        "src.tasks.email_tasks",
        "src.tasks.ai_tasks",
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
    task_time_limit=30 * 60,  # 30 minutes
    worker_prefetch_multiplier=1,
    worker_max_tasks_per_child=50,
)

# Optional: Configure Prometheus monitoring
@celery_app.task(name="celery.ping")
def ping():
    """Simple task that just returns 'pong'."""
    return "pong" 