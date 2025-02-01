import os
import logging
from alembic import command
from alembic.config import Config
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def get_alembic_config():
    """Get Alembic configuration"""
    # Get the directory containing this file
    current_dir = Path(__file__).parent
    
    # Alembic config file should be in the migrations directory
    alembic_cfg = Config(str(current_dir / "alembic.ini"))
    
    # Set the script location to the migrations directory
    alembic_cfg.set_main_option("script_location", str(current_dir / "alembic"))
    
    # Set the SQLAlchemy URL from environment
    alembic_cfg.set_main_option("sqlalchemy.url", os.getenv('SQLALCHEMY_DATABASE_URI'))
    
    return alembic_cfg

def create_migration(message):
    """Create a new migration"""
    try:
        cfg = get_alembic_config()
        command.revision(cfg, message=message, autogenerate=True)
        logger.info(f"Created new migration with message: {message}")
        return True
    except Exception as e:
        logger.error(f"Failed to create migration: {e}")
        return False

def upgrade_database():
    """Upgrade database to latest migration"""
    try:
        cfg = get_alembic_config()
        command.upgrade(cfg, "head")
        logger.info("Database upgraded successfully")
        return True
    except Exception as e:
        logger.error(f"Failed to upgrade database: {e}")
        return False

def downgrade_database(revision):
    """Downgrade database to specific revision"""
    try:
        cfg = get_alembic_config()
        command.downgrade(cfg, revision)
        logger.info(f"Database downgraded to revision: {revision}")
        return True
    except Exception as e:
        logger.error(f"Failed to downgrade database: {e}")
        return False

def get_current_revision():
    """Get current database revision"""
    try:
        cfg = get_alembic_config()
        return command.current(cfg)
    except Exception as e:
        logger.error(f"Failed to get current revision: {e}")
        return None

def get_migration_history():
    """Get migration history"""
    try:
        cfg = get_alembic_config()
        return command.history(cfg)
    except Exception as e:
        logger.error(f"Failed to get migration history: {e}")
        return None

if __name__ == "__main__":
    # Example usage
    # create_migration("initial")
    upgrade_database() 