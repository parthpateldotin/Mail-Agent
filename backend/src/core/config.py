"""Application configuration."""
from functools import lru_cache
from typing import Any, Dict, List, Optional, Union

from pydantic import AnyHttpUrl, PostgresDsn, field_validator, EmailStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Application settings."""
    
    # Project info
    PROJECT_NAME: str = "AiMail"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    API_PREFIX: str = "/api/v1"
    
    # Environment
    ENVIRONMENT: str = "development"
    NODE_ENV: str = "development"
    DEBUG: bool = True
    
    # Security
    SECRET_KEY: str = "your-secret-key"  # Change in production
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    ALGORITHM: str = "HS256"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    RELOAD: bool = True
    WORKERS: int = 1
    LOG_LEVEL: str = "INFO"
    
    # Database
    POSTGRES_SERVER: str = "localhost"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "postgres"
    POSTGRES_DB: str = "aimail"
    POSTGRES_PORT: str = "5432"
    DATABASE_URL: Optional[str] = None
    
    # Database connection pool
    DB_ECHO: bool = False
    DB_POOL_SIZE: int = 5
    DB_MAX_OVERFLOW: int = 10
    DB_POOL_TIMEOUT: int = 30
    DB_POOL_RECYCLE: int = 1800
    
    # Redis
    REDIS_HOST: str = "localhost"
    REDIS_PORT: int = 6379
    REDIS_DB: int = 0
    REDIS_PASSWORD: Optional[str] = None
    
    # Email
    MAIL_USERNAME: str = "ai@deployx.in"
    MAIL_PASSWORD: str = "Pa55w0rd@2025"
    MAIL_FROM: EmailStr = "ai@deployx.in"
    MAIL_PORT: int = 587
    MAIL_SERVER: str = "smtp.hostinger.com"
    MAIL_FROM_NAME: str = "AiMail"
    MAIL_TLS: bool = True
    MAIL_SSL: bool = False
    MAIL_USE_CREDENTIALS: bool = True
    MAIL_VALIDATE_CERTS: bool = True
    
    # SMTP
    SMTP_HOST: str = "smtp.hostinger.com"
    SMTP_PORT: int = 587
    SMTP_SECURE: bool = True
    SMTP_USER: str = "ai@deployx.in"
    SMTP_PASS: str = "Pa55w0rd@2025"
    
    # IMAP
    IMAP_HOST: str = "imap.hostinger.com"
    IMAP_PORT: int = 993
    IMAP_SECURE: bool = True
    IMAP_USER: str = "ai@deployx.in"
    IMAP_PASS: str = "Pa55w0rd@2025"
    
    # OpenAI
    OPENAI_API_KEY: str = ""
    OPENAI_MODEL: str = "gpt-4"
    OPENAI_MAX_TOKENS: int = 2000
    OPENAI_TEMPERATURE: float = 0.7
    
    # Admin
    ADMIN_EMAIL: EmailStr = "ai@deployx.in"
    ADMIN_PASSWORD: str = "Pa55w0rd@2025"
    
    # Frontend
    FRONTEND_URL: AnyHttpUrl = "http://localhost:8000"
    CORS_ORIGINS: List[str] = ["http://localhost:8000"]
    ALLOWED_HOSTS: List[str] = ["*"]
    
    # Feature flags
    ENABLE_METRICS: bool = False
    ENABLE_DOCS: bool = True
    AI_ENABLED: bool = True
    
    # Rate limiting
    RATE_LIMIT_ENABLED: bool = True
    DEFAULT_RATE_LIMIT_CALLS: int = 100
    DEFAULT_RATE_LIMIT_PERIOD: int = 60
    
    # Session
    SESSION_COOKIE_NAME: str = "session"
    SESSION_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        validate_default=True,
        extra="allow",
        arbitrary_types_allowed=True,
    )
    
    @field_validator("DATABASE_URL", mode="before")
    def assemble_db_url(cls, v: Optional[str], values: Dict[str, Any]) -> Any:
        """Assemble database URL from components."""
        if isinstance(v, str):
            return v
        
        url = PostgresDsn.build(
            scheme="postgresql+asyncpg",
            username=values.data.get("POSTGRES_USER"),
            password=values.data.get("POSTGRES_PASSWORD"),
            host=values.data.get("POSTGRES_SERVER"),
            port=int(values.data.get("POSTGRES_PORT", 5432)),
            path=f"/{values.data.get('POSTGRES_DB') or ''}",
        )
        return str(url)
    
    @field_validator("CORS_ORIGINS", mode="before")
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        """Assemble CORS origins from string or list."""
        if isinstance(v, str):
            try:
                # Try to parse as JSON
                import json
                return json.loads(v)
            except json.JSONDecodeError:
                # If not JSON, split by comma
                return [i.strip() for i in v.split(",")]
        return v
    
    @field_validator("ALLOWED_HOSTS", mode="before")
    def assemble_allowed_hosts(cls, v: Union[str, List[str]]) -> List[str]:
        """Assemble allowed hosts from string or list."""
        if isinstance(v, str):
            try:
                # Try to parse as JSON
                import json
                return json.loads(v)
            except json.JSONDecodeError:
                # If not JSON, split by comma
                return [i.strip() for i in v.split(",")]
        return v


@lru_cache
def get_app_settings() -> Settings:
    """Get cached application settings."""
    return Settings()


settings = get_app_settings() 