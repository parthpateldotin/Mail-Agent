import subprocess
import logging
import time
import os
from sqlalchemy import text, create_engine
from database_config import DatabaseConfig

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

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

if __name__ == "__main__":
    setup_database() 