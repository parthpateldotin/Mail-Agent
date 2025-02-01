import os
import sys
import logging
from sqlalchemy import inspect
from database_config import engine, SessionLocal
from models.conversation_messages import ConversationMessage, MessageDirection
import subprocess

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def check_database():
    """Check database connection and tables"""
    try:
        # Check connection
        conn = engine.connect()
        logger.info("✓ Database connection successful")
        conn.close()
        
        # Check if table exists
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        if 'conversation_messages' in tables:
            logger.info("✓ conversation_messages table exists")
        else:
            logger.error("✗ conversation_messages table missing")
            return False
            
        return True
    except Exception as e:
        logger.error(f"✗ Database error: {str(e)}")
        return False

def insert_test_data():
    """Insert test data into database"""
    try:
        db = SessionLocal()
        
        # Add test messages
        test_messages = [
            {
                'sender_email': "test@example.com",
                'message_id': "test1",
                'subject': "Test Incoming",
                'body': "This is a test incoming message",
                'direction': MessageDirection.INCOMING
            },
            {
                'sender_email': "ai@system.com",
                'message_id': "test2",
                'subject': "Test Outgoing",
                'body': "This is a test response",
                'direction': MessageDirection.OUTGOING
            }
        ]
        
        for msg_data in test_messages:
            try:
                # Check if message already exists
                existing = db.query(ConversationMessage).filter_by(message_id=msg_data['message_id']).first()
                if not existing:
                    msg = ConversationMessage(**msg_data)
                    db.add(msg)
                    db.commit()
                    logger.info(f"✓ Added test message: {msg.subject}")
                else:
                    logger.info(f"✓ Test message already exists: {msg_data['subject']}")
            except Exception as e:
                db.rollback()
                logger.error(f"✗ Error adding message {msg_data['subject']}: {str(e)}")
        
        db.close()
        return True
    except Exception as e:
        logger.error(f"✗ Error inserting test data: {str(e)}")
        return False

def main():
    """Main debug setup function"""
    logger.info("Starting debug setup...")
    
    # Check if virtual environment is active
    if not hasattr(sys, 'real_prefix') and not sys.base_prefix != sys.prefix:
        logger.error("✗ Virtual environment not activated!")
        logger.info("Please run: source .venv/bin/activate")
        return
    
    # Check PostgreSQL
    try:
        subprocess.run(['docker-compose', 'ps'], check=True)
        logger.info("✓ Docker services running")
    except subprocess.CalledProcessError:
        logger.error("✗ Docker services not running")
        logger.info("Starting Docker services...")
        subprocess.run(['docker-compose', 'up', '-d'])
    
    # Run database migrations
    try:
        subprocess.run(['alembic', 'upgrade', 'head'], check=True)
        logger.info("✓ Database migrations successful")
    except subprocess.CalledProcessError:
        logger.error("✗ Database migration failed")
        return
    
    # Check database and insert test data
    if check_database():
        insert_test_data()
    
    logger.info("Debug setup complete! You can now run the dashboard.")

if __name__ == "__main__":
    main() 