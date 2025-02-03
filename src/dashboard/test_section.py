from asyncio.log import logger
import streamlit as st
import logging
from datetime import datetime
from test_flow import test_email_connection, test_ai_service, test_full_flow

def show_test_section():
    """Display the test section with improved error handling and test status tracking"""
    st.header("System Tests")
    
    # Create containers for different test sections
    email_container = st.container()
    ai_container = st.container()
    flow_container = st.container()
    error_container = st.container()
    
    # Initialize session state for test results if not exists
    if 'test_results' not in st.session_state:
        st.session_state.test_results = {
            'email': {'status': None, 'message': '', 'timestamp': None},
            'ai': {'status': None, 'message': '', 'timestamp': None},
            'flow': {'status': None, 'message': '', 'timestamp': None}
        }
    
    with email_container:
        st.subheader("1. Email Service Test")
        if st.button("Test Email Connection"):
            try:
                with st.spinner("Testing email connection..."):
                    result = test_email_connection()
                    timestamp = datetime.now()
                    
                    if result:
                        st.success("✓ Email connection test passed")
                        st.session_state.test_results['email'] = {
                            'status': True,
                            'message': "Connection successful",
                            'timestamp': timestamp
                        }
                    else:
                        st.error("× Email connection test failed")
                        st.session_state.test_results['email'] = {
                            'status': False,
                            'message': "Connection failed",
                            'timestamp': timestamp
                        }
            except Exception as e:
                error_msg = f"Email test error: {str(e)}"
                st.error(error_msg)
                st.session_state.test_results['email'] = {
                    'status': False,
                    'message': error_msg,
                    'timestamp': datetime.now()
                }
    
    with ai_container:
        st.subheader("2. AI Service Test")
        if st.button("Test AI Service"):
            try:
                with st.spinner("Testing AI service..."):
                    result = test_ai_service()
                    timestamp = datetime.now()
                    
                    if result:
                        st.success("✓ AI service test passed")
                        st.session_state.test_results['ai'] = {
                            'status': True,
                            'message': "Service operational",
                            'timestamp': timestamp
                        }
                    else:
                        st.error("× AI service test failed")
                        st.session_state.test_results['ai'] = {
                            'status': False,
                            'message': "Service not responding",
                            'timestamp': timestamp
                        }
            except Exception as e:
                error_msg = f"AI test error: {str(e)}"
                st.error(error_msg)
                st.session_state.test_results['ai'] = {
                    'status': False,
                    'message': error_msg,
                    'timestamp': datetime.now()
                }
    
    with flow_container:
        st.subheader("3. Full Flow Test")
        if st.button("Test Full Flow"):
            try:
                with st.spinner("Running full flow test..."):
                    result = test_full_flow()
                    timestamp = datetime.now()
                    
                    if result:
                        st.success("✓ Full flow test passed")
                        st.session_state.test_results['flow'] = {
                            'status': True,
                            'message': "Flow completed successfully",
                            'timestamp': timestamp
                        }
                    else:
                        st.error("× Full flow test failed")
                        st.session_state.test_results['flow'] = {
                            'status': False,
                            'message': "Flow failed to complete",
                            'timestamp': timestamp
                        }
            except Exception as e:
                error_msg = f"Full flow test error: {str(e)}"
                st.error(error_msg)
                st.session_state.test_results['flow'] = {
                    'status': False,
                    'message': error_msg,
                    'timestamp': datetime.now()
                }
    
    # Display test history
    st.subheader("Test History")
    for test_type, result in st.session_state.test_results.items():
        if result['timestamp']:
            status = "✓" if result['status'] else "×"
            timestamp_str = result['timestamp'].strftime("%Y-%m-%d %H:%M:%S")
            st.text(f"{status} {test_type.title()}: {result['message']} ({timestamp_str})")
    
    # Display test logs
    st.subheader("Test Logs")
    log_level = st.selectbox("Log Level", ["INFO", "WARNING", "ERROR"], index=0)
    
    # Get logs from the logger
    log_records = []
    for handler in logger.handlers:
        if isinstance(handler, logging.StreamHandler):
            log_records.extend(handler.buffer)
    
    # Filter and display logs based on selected level
    filtered_logs = [
        record for record in log_records 
        if record.levelname == log_level
    ]
    
    if filtered_logs:
        for record in filtered_logs:
            st.text(f"{record.asctime} - {record.levelname}: {record.message}")
    else:
        st.info(f"No {log_level} logs available") 