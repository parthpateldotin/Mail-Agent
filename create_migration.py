import os
from alembic import command, script
from alembic.config import Config
from alembic.runtime.migration import MigrationContext
from sqlalchemy import create_engine, text

# Create Alembic configuration
alembic_cfg = Config()
alembic_cfg.set_main_option('script_location', 'migrations')
alembic_cfg.set_main_option('sqlalchemy.url', 'postgresql://postgres:postgres@localhost:5432/aimail')

# Create the script directory object
script_directory = script.ScriptDirectory.from_config(alembic_cfg)

# Create the migration context
engine = create_engine(alembic_cfg.get_main_option('sqlalchemy.url'))
with engine.connect() as connection:
    # Check if alembic_version table exists
    result = connection.execute(text("""
        SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_name = 'alembic_version'
        );
    """))
    has_version_table = result.scalar()
    
    if not has_version_table:
        # Initialize alembic_version table
        connection.execute(text("""
            CREATE TABLE alembic_version (
                version_num VARCHAR(32) NOT NULL,
                CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num)
            );
        """))
        connection.commit()
    
    context = MigrationContext.configure(connection)
    
    # Create the revision
    print("Creating migration...")
    command.revision(alembic_cfg, 
                    message="Initial migration",
                    autogenerate=True)
    
    # Apply the migration
    print("\nApplying migration...")
    command.upgrade(alembic_cfg, "head") 