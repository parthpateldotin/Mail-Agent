import os
from database_config import engine, Base
import logging

def initialize_database():
    """
    Initialize database schema
    
    Responsibilities:
    - Create all tables defined in models
    - Set up logging
    - Perform any necessary startup configurations
    """
    # Configure logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    logger = logging.getLogger(__name__)
    
    try:
        # Create all tables
        Base.metadata.create_all(bind=engine)
        logger.info("Database schema initialized successfully")
    
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise

def main():
    """
    Main project initialization entry point
    """
    initialize_database()

if __name__ == "__main__":
    main()