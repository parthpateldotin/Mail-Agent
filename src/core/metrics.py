"""Prometheus metrics configuration."""
from prometheus_client import Counter, Gauge, Histogram, REGISTRY
from prometheus_client.metrics import MetricWrapperBase
from typing import Dict, Optional

# Request metrics
REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total number of HTTP requests",
    ["method", "endpoint", "status_code"]
)

REQUEST_LATENCY = Histogram(
    "http_request_duration_seconds",
    "HTTP request duration in seconds",
    ["method", "endpoint"],
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0, 10.0]
)

# Authentication metrics
AUTH_SUCCESS = Counter(
    "auth_success_total",
    "Total number of successful authentications",
    ["auth_type"]  # login, token_refresh, etc.
)

AUTH_FAILURE = Counter(
    "auth_failure_total",
    "Total number of failed authentications",
    ["auth_type", "reason"]
)

# Email metrics
EMAIL_SENT = Counter(
    "email_sent_total",
    "Total number of emails sent",
    ["email_type"]  # verification, reset_password, etc.
)

EMAIL_FAILURE = Counter(
    "email_failure_total",
    "Total number of failed email sends",
    ["email_type", "reason"]
)

# AI processing metrics
AI_REQUEST_COUNT = Counter(
    "ai_requests_total",
    "Total number of AI API requests",
    ["operation_type"]  # analyze, generate_response, etc.
)

AI_REQUEST_LATENCY = Histogram(
    "ai_request_duration_seconds",
    "AI request duration in seconds",
    ["operation_type"],
    buckets=[0.5, 1.0, 2.0, 5.0, 10.0, 20.0]
)

AI_FAILURE = Counter(
    "ai_failure_total",
    "Total number of failed AI operations",
    ["operation_type", "reason"]
)

# System metrics
ACTIVE_USERS = Gauge(
    "active_users",
    "Number of currently active users"
)

DB_CONNECTION_POOL = Gauge(
    "db_connection_pool_size",
    "Database connection pool size",
    ["pool_type"]  # read, write
)

REDIS_CONNECTION_POOL = Gauge(
    "redis_connection_pool_size",
    "Redis connection pool size"
)

# Cache metrics
CACHE_HITS = Counter(
    "cache_hits_total",
    "Total number of cache hits",
    ["cache_type"]
)

CACHE_MISSES = Counter(
    "cache_misses_total",
    "Total number of cache misses",
    ["cache_type"]
)

# Background task metrics
TASK_COUNT = Counter(
    "background_tasks_total",
    "Total number of background tasks",
    ["task_type", "status"]
)

TASK_DURATION = Histogram(
    "background_task_duration_seconds",
    "Background task duration in seconds",
    ["task_type"],
    buckets=[1.0, 5.0, 10.0, 30.0, 60.0, 300.0]
)

# Rate limiting metrics
RATE_LIMIT_HIT = Counter(
    "rate_limit_hits_total",
    "Total number of rate limit hits",
    ["endpoint"]
)


class MetricsService:
    """Service for handling metrics collection."""

    @staticmethod
    def track_request(method: str, endpoint: str, status_code: int, duration: float) -> None:
        """Track HTTP request metrics."""
        REQUEST_COUNT.labels(method=method, endpoint=endpoint, status_code=status_code).inc()
        REQUEST_LATENCY.labels(method=method, endpoint=endpoint).observe(duration)

    @staticmethod
    def track_auth(success: bool, auth_type: str, reason: Optional[str] = None) -> None:
        """Track authentication metrics."""
        if success:
            AUTH_SUCCESS.labels(auth_type=auth_type).inc()
        else:
            AUTH_FAILURE.labels(auth_type=auth_type, reason=reason or "unknown").inc()

    @staticmethod
    def track_email(success: bool, email_type: str, reason: Optional[str] = None) -> None:
        """Track email metrics."""
        if success:
            EMAIL_SENT.labels(email_type=email_type).inc()
        else:
            EMAIL_FAILURE.labels(email_type=email_type, reason=reason or "unknown").inc()

    @staticmethod
    def track_ai_request(operation_type: str, duration: float, success: bool, reason: Optional[str] = None) -> None:
        """Track AI request metrics."""
        AI_REQUEST_COUNT.labels(operation_type=operation_type).inc()
        AI_REQUEST_LATENCY.labels(operation_type=operation_type).observe(duration)
        if not success:
            AI_FAILURE.labels(operation_type=operation_type, reason=reason or "unknown").inc()

    @staticmethod
    def update_active_users(count: int) -> None:
        """Update active users gauge."""
        ACTIVE_USERS.set(count)

    @staticmethod
    def update_db_pool_size(pool_type: str, size: int) -> None:
        """Update database connection pool size."""
        DB_CONNECTION_POOL.labels(pool_type=pool_type).set(size)

    @staticmethod
    def update_redis_pool_size(size: int) -> None:
        """Update Redis connection pool size."""
        REDIS_CONNECTION_POOL.set(size)

    @staticmethod
    def track_cache(hit: bool, cache_type: str) -> None:
        """Track cache metrics."""
        if hit:
            CACHE_HITS.labels(cache_type=cache_type).inc()
        else:
            CACHE_MISSES.labels(cache_type=cache_type).inc()

    @staticmethod
    def track_background_task(task_type: str, status: str, duration: Optional[float] = None) -> None:
        """Track background task metrics."""
        TASK_COUNT.labels(task_type=task_type, status=status).inc()
        if duration is not None:
            TASK_DURATION.labels(task_type=task_type).observe(duration)

    @staticmethod
    def track_rate_limit(endpoint: str) -> None:
        """Track rate limit hits."""
        RATE_LIMIT_HIT.labels(endpoint=endpoint).inc() 