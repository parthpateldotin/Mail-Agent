import os
import sys
import logging
import subprocess
from src.database.setup_database import setup_database
from src.utils.debug_setup import insert_test_data

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def run_application():
    """Run the Flask app and Streamlit dashboard"""
    
    # Check virtual environment
    if not hasattr(sys, 'real_prefix') and not sys.base_prefix != sys.prefix:
        logger.error("Virtual environment not activated!")
        logger.info("Please run: source .aimail/bin/activate")
        return
    
    # Setup database and run migrations
    if not setup_database():
        logger.error("Database setup failed!")
        return
    
    # Insert test data
    insert_test_data()
    
    try:
        # Start Flask app
        flask_process = subprocess.Popen(
            ['flask', 'run', '--debug'],
            env=dict(os.environ, FLASK_APP='src/api/app.py')
        )
        
        # Start Streamlit dashboard
        streamlit_process = subprocess.Popen(
            ['streamlit', 'run', 'src/dashboard/email_monitor.py']
        )
        
        logger.info("Application started successfully!")
        logger.info("Flask running on: http://localhost:5000")
        logger.info("Dashboard will be available on: http://localhost:8501")
        
        # Wait for processes
        flask_process.wait()
        streamlit_process.wait()
        
    except KeyboardInterrupt:
        logger.info("Shutting down...")
        flask_process.terminate()
        streamlit_process.terminate()
        sys.exit(0)
    except Exception as e:
        logger.error(f"Error running application: {str(e)}")

if __name__ == "__main__":
    run_application() 