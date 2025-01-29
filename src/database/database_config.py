import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base, scoped_session
from sqlalchemy.pool import NullPool
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Database Configuration Class
class DatabaseConfig:
    """
    Centralized database configuration management
    
    Key Responsibilities:
    - Manage database connection parameters
    - Provide connection pooling configurations
    - Support different environment configurations
    """
    
    # Connection Parameters
    DB_USERNAME = os.getenv('DB_USERNAME', 'postgres')
    DB_PASSWORD = os.getenv('DB_PASSWORD', 'postgres')
    DB_HOST = os.getenv('DB_HOST', 'localhost')
    DB_PORT = os.getenv('DB_PORT', '5434')
    DB_NAME = os.getenv('DB_NAME', 'email_assistant')
    
    # Connection String Generation
    @classmethod
    def get_connection_string(cls, testing=False):
        """
        Generate database connection string
        
        Args:
            testing (bool): Flag to generate test database connection
        
        Returns:
            str: Formatted database connection string
        """
        db_name = f'{cls.DB_NAME}_test' if testing else cls.DB_NAME
        return (
            f'postgresql://{cls.DB_USERNAME}:'
            f'{cls.DB_PASSWORD}@{cls.DB_HOST}:'
            f'{cls.DB_PORT}/{db_name}'
        )

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