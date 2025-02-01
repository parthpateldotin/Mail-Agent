import subprocess
import logging
import time
import os
from sqlalchemy import text, create_engine, MetaData
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy import Column, Integer, String, DateTime, JSON, Enum as SQLEnum
import enum
from datetime import datetime
from database_config import DatabaseConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Get database URL from environment
DATABASE_URL = os.getenv('SQLALCHEMY_DATABASE_URI')

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for declarative models
Base = declarative_base()

# Define enums
class EmailState(str, enum.Enum):
    NEW = 'new'
    QUEUED = 'queued'
    PROCESSING = 'processing'
    ANALYZED = 'analyzed'
    RESPONDED = 'responded'
    SENT = 'sent'
    FAILED = 'failed'
    ARCHIVED = 'archived'

# Define models
class Email(Base):
    __tablename__ = "emails"

    id = Column(Integer, primary_key=True, index=True)
    message_id = Column(String, unique=True, index=True)
    subject = Column(String)
    sender = Column(String)
    recipients = Column(JSON)  # Store as JSON array
    content = Column(String)
    timestamp = Column(DateTime, default=datetime.utcnow)
    state = Column(SQLEnum(EmailState), default=EmailState.NEW)
    meta_info = Column(JSON, default={})

class ProcessedEmail(Base):
    __tablename__ = "processed_emails"

    id = Column(Integer, primary_key=True, index=True)
    email_id = Column(Integer, index=True)
    analysis_result = Column(JSON)
    response = Column(String, nullable=True)
    processing_time = Column(Integer, nullable=True)  # in milliseconds
    timestamp = Column(DateTime, default=datetime.utcnow)
    meta_info = Column(JSON, default={})

class EmailTemplate(Base):
    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True)
    content = Column(String)
    variables = Column(JSON)  # Store template variables
    category = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

def wait_for_db(engine):
    """Wait for database to be ready"""
    max_retries = 30
    retry_interval = 2  # Increased from 1 to 2 seconds

    for i in range(max_retries):
        try:
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
                logger.info("✓ Database is ready!")
                return True
        except Exception as e:
            logger.warning(f"Database not ready (attempt {i + 1}/{max_retries}): {str(e)}")
            time.sleep(retry_interval)
    
    return False

def create_database_if_not_exists():
    """Create database if it doesn't exist"""
    try:
        # Connect to default postgres database
        default_db_url = f"postgresql://{DatabaseConfig.DB_USERNAME}:{DatabaseConfig.DB_PASSWORD}@{DatabaseConfig.DB_HOST}:{DatabaseConfig.DB_PORT}/postgres"
        engine = create_engine(default_db_url)
        
        with engine.connect() as conn:
            # Don't create if database exists
            conn.execute(text("commit"))
            result = conn.execute(text(f"SELECT 1 FROM pg_database WHERE datname = '{DatabaseConfig.DB_NAME}'"))
            if result.scalar() is None:
                conn.execute(text("commit"))
                conn.execute(text(f"CREATE DATABASE {DatabaseConfig.DB_NAME}"))
                logger.info(f"✓ Created database: {DatabaseConfig.DB_NAME}")
            else:
                logger.info(f"✓ Database {DatabaseConfig.DB_NAME} already exists")
        
        return True
    except Exception as e:
        logger.error(f"✗ Error creating database: {str(e)}")
        return False

def setup_database():
    """Setup database and run migrations"""
    try:
        # Start PostgreSQL container
        logger.info("Starting PostgreSQL container...")
        subprocess.run(['docker-compose', 'down', '-v'], check=True)  # Clean start
        subprocess.run(['docker-compose', 'up', '-d'], check=True)
        
        # Create engine for the target database
        engine = create_engine(DatabaseConfig.get_connection_string())
        
        # Wait for database to be ready
        if not wait_for_db(engine):
            logger.error("✗ Database failed to start!")
            return False
        
        # Create database if needed
        if not create_database_if_not_exists():
            return False
        
        # Run migrations
        logger.info("Running database migrations...")
        result = subprocess.run(['alembic', 'upgrade', 'head'], capture_output=True, text=True)
        
        if result.returncode == 0:
            logger.info("✓ Migrations completed successfully!")
            return True
        else:
            logger.error(f"✗ Migration failed: {result.stderr}")
            return False
            
    except subprocess.CalledProcessError as e:
        logger.error(f"✗ Error running setup: {str(e)}")
        return False

def init_db():
    """Initialize the database"""
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("Database tables created successfully")
        return True
    except Exception as e:
        print(f"Error creating database tables: {e}")
        return False

def get_db():
    """Get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

if __name__ == "__main__":
    init_db() 