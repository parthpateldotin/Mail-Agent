import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, scoped_session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv
from dataclasses import dataclass
from typing import Optional

# Load environment variables
load_dotenv()

@dataclass
class DatabaseConfig:
    """Database configuration class"""
    username: str = os.getenv('DB_USERNAME', 'postgres')
    password: str = os.getenv('DB_PASSWORD', 'postgres')
    host: str = os.getenv('DB_HOST', 'localhost')
    port: int = int(os.getenv('DB_PORT', '5434'))
    database: str = os.getenv('DB_NAME', 'email_assistant')
    
    @property
    def database_url(self) -> str:
        """Get database URL"""
        return f"postgresql://{self.username}:{self.password}@{self.host}:{self.port}/{self.database}"

    def validate(self) -> bool:
        """Validate database configuration"""
        return all([
            self.username,
            self.password,
            self.host,
            self.port,
            self.database
        ])

    @classmethod
    def from_env(cls) -> 'DatabaseConfig':
        """Create database configuration from environment variables"""
        return cls(
            username=os.getenv('DB_USERNAME', 'postgres'),
            password=os.getenv('DB_PASSWORD', 'postgres'),
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '5434')),
            database=os.getenv('DB_NAME', 'email_assistant')
        )

    @classmethod
    def get_connection_string(cls) -> str:
        """Get database connection string"""
        config = cls.from_env()
        return config.database_url

# SQLAlchemy Base and Session Management
Base = declarative_base()
engine = create_engine(
    DatabaseConfig.get_connection_string(),
    poolclass=NullPool,  # Disable connection pooling for better resource management
    echo=False  # Set to True for SQL logging during development
)
SessionLocal = scoped_session(sessionmaker(
    bind=engine, 
    autocommit=False, 
    autoflush=False
))

def get_db():
    """
    Database session generator for dependency injection
    
    Yields:
        SQLAlchemy Session: Database session
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()