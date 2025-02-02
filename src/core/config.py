"""Application configuration."""
import os
from functools import lru_cache
from typing import List, Optional, Union, Any, Dict
from pydantic import AnyHttpUrl, PostgresDsn, field_validator, EmailStr, computed_field, RedisDsn
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )

    # Project Info
    PROJECT_NAME: str = "AiMail"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    DOCS_URL: str = "/docs"
    REDOC_URL: str = "/redoc"
    OPENAPI_URL: str = "/openapi.json"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Security
    SECRET_KEY: str = "your-secret-key-here"  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    ALGORITHM: str = "HS256"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = False
    WORKERS: int = 1
    LOG_LEVEL: str = "info"
    
    # CORS
    BACKEND_CORS_ORIGINS: List[AnyHttpUrl] = []
    ALLOWED_HOSTS: List[str] = ["*"]
    
    @field_validator("ALLOWED_HOSTS", mode="before")
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str):
            try:
                # Try to parse as JSON
                import json
                return json.loads(v)
            except json.JSONDecodeError:
                # If not JSON, split by comma
                return [host.strip() for host in v.split(",")]
        return v

    @field_validator("ACCESS_TOKEN_EXPIRE_MINUTES", "REFRESH_TOKEN_EXPIRE_DAYS", mode="before")
    def parse_int(cls, v: Union[str, int]) -> int:
        if isinstance(v, str):
            # Remove any comments and whitespace
            v = v.split("#")[0].strip()
            return int(v)
        return v

    # Database
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: str = "5432"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "aimail"
    DB_ECHO_LOG: bool = False
    DATABASE_URI: Optional[PostgresDsn] = None

    @field_validator("DATABASE_URI", mode="before")
    def assemble_db_connection(cls, v: Optional[str], info) -> str:
        """Assemble database connection string."""
        if isinstance(v, str):
            return v
        
        host = info.data.get("POSTGRES_HOST", "localhost")
        port = info.data.get("POSTGRES_PORT", "5432")
        user = info.data.get("POSTGRES_USER", "postgres")
        password = info.data.get("POSTGRES_PASSWORD", "postgres")
        db = info.data.get("POSTGRES_DB", "aimail")

        return f"postgresql+asyncpg://{user}:{password}@{host}:{port}/{db}"

    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    REDIS_URI: Optional[RedisDsn] = None

    @field_validator("REDIS_URI", mode="before")
    def assemble_redis_connection(cls, v: Optional[str], info) -> str:
        """Assemble Redis connection string."""
        if isinstance(v, str):
            return v
        
        host = info.data.get("REDIS_HOST", "localhost")
        port = info.data.get("REDIS_PORT", 6379)
        password = info.data.get("REDIS_PASSWORD")
        db = info.data.get("REDIS_DB", 0)

        if password:
            return f"redis://:{password}@{host}:{port}/{db}"
        return f"redis://{host}:{port}/{db}"

    # Email
    SMTP_TLS: bool = True
    SMTP_PORT: int = 587
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    EMAILS_FROM_EMAIL: Optional[EmailStr] = None
    EMAILS_FROM_NAME: Optional[str] = None

    # Features
    ENABLE_METRICS: bool = False
    ENABLE_DOCS: bool = True

    # Rate Limiting
    RATE_LIMIT_PER_USER: int = 1000  # requests per hour
    RATE_LIMIT_SIGNUP: str = "5/5m"  # 5 requests per 5 minutes
    RATE_LIMIT_LOGIN: str = "5/5m"  # 5 requests per 5 minutes
    RATE_LIMIT_PASSWORD_RESET: str = "3/15m"  # 3 requests per 15 minutes
    RATE_LIMIT_EMAIL_VERIFY: str = "3/15m"  # 3 requests per 15 minutes
    RATE_LIMIT_AI: str = "10/1m"  # 10 requests per minute

    # Email
    MAIL_USERNAME: str
    MAIL_PASSWORD: str
    MAIL_FROM: EmailStr
    MAIL_PORT: int
    MAIL_SERVER: str
    MAIL_FROM_NAME: str
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False
    MAIL_USE_CREDENTIALS: bool = True
    MAIL_VALIDATE_CERTS: bool = True
    FRONTEND_URL: AnyHttpUrl

    # OpenAI
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_MAX_TOKENS: int = 2000
    OPENAI_TEMPERATURE: float = 0.7
    OPENAI_RATE_LIMIT: int = 10  # requests per minute
    OPENAI_TIMEOUT: int = 30  # seconds
    
    # AI Features
    AI_ENABLED: bool = True
    AI_EMAIL_ANALYSIS: bool = True
    AI_RESPONSE_GENERATION: bool = True
    AI_THREAD_SUMMARIZATION: bool = True
    AI_PRIORITY_CLASSIFICATION: bool = True

    # Session Management
    SESSION_COOKIE_NAME: str = "aimail_session"
    SESSION_EXPIRE_MINUTES: int = 60
    SESSION_COOKIE_SECURE: bool = True
    SESSION_COOKIE_HTTPONLY: bool = True
    SESSION_COOKIE_SAMESITE: str = "lax"
    SESSION_CLEANUP_INTERVAL: int = 3600  # seconds


# Create settings instance
settings = Settings()

def get_app_settings() -> Settings:
    """Get cached application settings."""
    return settings 