import logging
import streamlit as st
from datetime import datetime

class StreamlitLogHandler(logging.Handler):
    def emit(self, record):
        try:
            # Format the log message
            msg = self.format(record)
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Add log level emoji
            level_emoji = {
                'DEBUG': '🔍',
                'INFO': 'ℹ️',
                'WARNING': '⚠️',
                'ERROR': '❌',
                'CRITICAL': '🚨'
            }.get(record.levelname, '')
            
            # Create formatted log entry
            log_entry = f"{timestamp} {level_emoji} {msg}"
            
            # Initialize test_logs in session state if not exists
            if 'test_logs' not in st.session_state:
                st.session_state.test_logs = []
            
            # Add new log entry
            st.session_state.test_logs.append(log_entry)
            
            # Keep only last 100 logs
            if len(st.session_state.test_logs) > 100:
                st.session_state.test_logs = st.session_state.test_logs[-100:]
                
        except Exception as e:
            print(f"Error in StreamlitLogHandler: {e}")

def setup_streamlit_logging():
    """Setup logging to capture logs in Streamlit interface"""
    # Create custom handler
    streamlit_handler = StreamlitLogHandler()
    streamlit_handler.setFormatter(
        logging.Formatter('%(levelname)s: %(message)s')
    )
    
    # Get root logger
    logger = logging.getLogger()
    
    # Remove existing handlers to avoid duplicates
    for handler in logger.handlers[:]:
        logger.removeHandler(handler)
    
    # Add our custom handler
    logger.addHandler(streamlit_handler)
    
    # Set logging level
    logger.setLevel(logging.INFO) 