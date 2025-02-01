from asyncio.log import logger
import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import networkx as nx
from datetime import datetime, timedelta
import time
import json
from typing import Dict, Any
import asyncio
import logging
from test_flow import test_email_connection, test_ai_service, test_full_flow
from streamlit_logger import setup_streamlit_logging
import queue
import threading
import random
import numpy as np
from src.utils.port_utils import find_available_port
import socket
from src.email.services.ai_service import AIService, AIServiceManager
from contextlib import closing
import os
import signal
import psutil
import sys
import subprocess

# Configuration
API_BASE_URL = "http://127.0.0.1:5001"  # Use localhost IP explicitly
API_TIMEOUT = 30  # Increased timeout for slower connections
MAX_RETRIES = 3
RETRY_DELAY = 2

# System components and their positions
SYSTEM_LAYOUT = {
    'email_server': {'pos': (0, 0), 'name': 'Email Server', 'color': '#1f77b4', 'icon': '📧'},
    'flask_app': {'pos': (1, 0), 'name': 'Flask App', 'color': '#2ca02c', 'icon': '🚀'},
    'email_service': {'pos': (2, 0), 'name': 'Email Service', 'color': '#ff7f0e', 'icon': '✉️'},
    'ai_service': {'pos': (3, 0), 'name': 'AI Service', 'color': '#9467bd', 'icon': '🤖'},
    'database': {'pos': (2, -1), 'name': 'Database', 'color': '#d62728', 'icon': '💾'}
}

# Define system flows with descriptions
SYSTEM_FLOWS = [
    ('email_server', 'flask_app', 'Incoming Email', 'New email received'),
    ('flask_app', 'email_service', 'Process', 'Processing email content'),
    ('email_service', 'ai_service', 'Generate Response', 'Generating AI response'),
    ('ai_service', 'email_service', 'Response', 'AI response ready'),
    ('email_service', 'email_server', 'Send Reply', 'Sending reply email'),
    ('email_service', 'database', 'Store', 'Storing conversation')
]

# Set page config
st.set_page_config(
    page_title="AiMail Monitor",
    page_icon="📧",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
    <style>
    .status-healthy { color: #28a745; }
    .status-degraded { color: #ffc107; }
    .status-error { color: #dc3545; }
    .metric-card {
        border: 1px solid #ddd;
        padding: 1rem;
        border-radius: 0.5rem;
        background: #f8f9fa;
    }
    .stProgress > div > div > div {
        background-color: #2196f3;
    }
    .connection-status { padding: 0.5rem; border-radius: 0.3rem; margin-bottom: 1rem; }
    .connection-status.connected { background-color: #d4edda; color: #155724; }
    .connection-status.error { background-color: #f8d7da; color: #721c24; }
    </style>
""", unsafe_allow_html=True)

def init_session_state():
    """Initialize all session state variables"""
    if "session" not in st.session_state:
        st.session_state.session = requests.Session()
        st.session_state.session.verify = False  # For development only
    
    if "connection_status" not in st.session_state:
        st.session_state.connection_status = None
    
    if "error_count" not in st.session_state:
        st.session_state.error_count = 0
    
    if not hasattr(st, 'session_state'):
        st.session_state = {}
    
    # Test-related state
    if 'test_logs' not in st.session_state:
        st.session_state.test_logs = []
    if 'test_running' not in st.session_state:
        st.session_state.test_running = False
    if 'current_test' not in st.session_state:
        st.session_state.current_test = None
    
    # Component states
    if 'components_loaded' not in st.session_state:
        st.session_state.components_loaded = False
    if 'loading_error' not in st.session_state:
        st.session_state.loading_error = None
    if 'active_flows' not in st.session_state:
        st.session_state.active_flows = []
    
    # Refresh state
    if "last_refresh" not in st.session_state:
        st.session_state.last_refresh = time.time()
    if "refresh_interval" not in st.session_state:
        st.session_state.refresh_interval = 10

def load_components():
    """Load all components with proper error handling"""
    try:
        with st.spinner("Loading components..."):
            # Check API availability
            health_response = requests.get(f"{API_BASE_URL}/health", timeout=API_TIMEOUT)
            health_response.raise_for_status()
            
            # Initialize services
            metrics_response = requests.get(f"{API_BASE_URL}/metrics", timeout=API_TIMEOUT)
            metrics_response.raise_for_status()
            
            st.session_state.components_loaded = True
            st.session_state.loading_error = None
            
            return True
    except requests.exceptions.ConnectionError:
        st.session_state.loading_error = "Cannot connect to API server. Please ensure the server is running."
        return False
    except requests.exceptions.Timeout:
        st.session_state.loading_error = "Connection timeout. Please check server status."
        return False
    except Exception as e:
        st.session_state.loading_error = f"Error loading components: {str(e)}"
        return False

def check_api_availability():
    """Check if the API server is available with retries"""
    for attempt in range(MAX_RETRIES):
        try:
            response = requests.get(
                f"{API_BASE_URL}/health",
                timeout=API_TIMEOUT,
                headers={"Accept": "application/json"},
                verify=False  # For development only
            )
            if response.status_code == 200:
                return True
            logger.warning(f"API check failed with status code: {response.status_code}")
        except requests.exceptions.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning(f"API check attempt {attempt + 1} failed: {e}")
                time.sleep(RETRY_DELAY * (attempt + 1))  # Exponential backoff
                continue
            logger.error(f"API server not available: {e}")
        except Exception as e:
            logger.error(f"Unexpected error checking API: {e}")
    return False

def fetch_api_data(endpoint: str) -> Dict[str, Any]:
    """Fetch data from API endpoint with improved error handling and retries"""
    session = requests.Session()
    session.verify = False  # For development only
    
    for attempt in range(MAX_RETRIES):
        try:
            response = session.get(
                f"{API_BASE_URL}/{endpoint}",
                timeout=API_TIMEOUT,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning(f"API fetch attempt {attempt + 1} failed: {e}")
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue
            logger.error(f"Error fetching data from {endpoint}: {e}")
        except json.JSONDecodeError as e:
            logger.error(f"Error decoding JSON from {endpoint}: {e}")
        except Exception as e:
            logger.error(f"Unexpected error fetching from {endpoint}: {e}")
    
    return get_default_response(endpoint)

def get_default_response(endpoint: str) -> Dict[str, Any]:
    """Get default response for different endpoints"""
    current_time = datetime.now().isoformat()
    
    defaults = {
        "health": {
            "status": "error",
            "timestamp": current_time,
            "services": {
                "email_service": {
                    "status": "error",
                    "imap_connected": False,
                    "smtp_connected": False,
                    "last_check": current_time,
                    "error": "Connection failed"
                },
                "ai_service": {
                    "status": "error",
                    "api_status": "error",
                    "last_check": current_time
                },
                "email_processor": {
                    "status": "error",
                    "queue_size": 0,
                    "processing": False,
                    "processed": 0,
                    "failed": 0,
                    "avg_processing_time": 0
                }
            }
        },
        "metrics": {
            "timestamp": current_time,
            "email_service": {
                "total_fetched": 0,
                "total_sent": 0,
                "failed_fetches": 0,
                "failed_sends": 0,
                "avg_fetch_time": 0,
                "avg_send_time": 0,
                "last_fetch": current_time,
                "last_send": current_time
            },
            "ai_service": {
                "total_responses": 0,
                "successful_validations": 0,
                "failed_validations": 0,
                "avg_validation_score": 0,
                "avg_response_time": 0,
                "quality_excellent": 0,
                "quality_good": 0,
                "quality_fair": 0,
                "quality_poor": 0,
                "common_issues": {}
            },
            "email_processor": {
                "queue_size": 0,
                "processing": False,
                "processed": 0,
                "failed": 0,
                "avg_processing_time": 0
            }
        },
        "stats": {
            "total_messages": 0,
            "messages_today": 0,
            "incoming_today": 0,
            "outgoing_today": 0,
            "response_rate": 0,
            "unique_senders": 0
        }
    }
    
    return defaults.get(endpoint, {})

def create_animated_system_diagram(active_flows=None, highlight_component=None):
    """Create an animated system diagram using Plotly with improved layout"""
    if active_flows is None:
        active_flows = []

    # Define system components with improved layout
    SYSTEM_LAYOUT = {
        'email_server': {'pos': (0, 0.5), 'name': 'Email Server', 'icon': '📧', 'color': '#3498db'},
        'flask_app': {'pos': (0.25, 0.5), 'name': 'Flask App', 'icon': '🚀', 'color': '#2ecc71'},
        'email_service': {'pos': (0.5, 0.5), 'name': 'Email Service', 'icon': '✉️', 'color': '#e74c3c'},
        'ai_service': {'pos': (0.75, 0.5), 'name': 'AI Service', 'icon': '🤖', 'color': '#9b59b6'},
        'database': {'pos': (0.5, 0.8), 'name': 'Database', 'icon': '💾', 'color': '#f1c40f'}
    }

    # Define system flows with descriptions
    SYSTEM_FLOWS = [
        ('email_server', 'flask_app', 'Incoming Email', 'New email received from server'),
        ('flask_app', 'email_service', 'Process Email', 'Email processing and validation'),
        ('email_service', 'ai_service', 'AI Request', 'Generate AI response'),
        ('ai_service', 'email_service', 'AI Response', 'Process AI response'),
        ('email_service', 'database', 'Store', 'Save conversation to database'),
        ('email_service', 'email_server', 'Send Reply', 'Send response email')
    ]

    fig = make_subplots(specs=[[{"secondary_y": True}]])

    # Add nodes with improved styling
    for component, info in SYSTEM_LAYOUT.items():
        x, y = info['pos']
        is_active = any(component in flow for flow in active_flows) or component == highlight_component
        opacity = 1 if is_active else 0.7
        pulse_effect = 1.2 if is_active else 1.0
        
        # Add node
        fig.add_trace(go.Scatter(
            x=[x], y=[y],
            mode='markers+text',
            name=component,
            text=[f"{info['icon']} {info['name']}"],
            textposition="bottom center",
            marker=dict(
                size=40 * pulse_effect,
                color=info['color'],
                opacity=opacity,
                line=dict(width=3, color='white'),
                symbol='circle',
                sizemode='diameter',
            ),
            hoverinfo='text',
            hovertext=f"{info['name']}<br>Status: {'Active' if is_active else 'Idle'}",
            showlegend=False
        ))

    # Add edges with animated effects
    for start, end, label, description in SYSTEM_FLOWS:
        start_pos = SYSTEM_LAYOUT[start]['pos']
        end_pos = SYSTEM_LAYOUT[end]['pos']
        is_active = (start, end) in active_flows
        
        # Calculate intermediate points for curved lines
        mid_x = (start_pos[0] + end_pos[0]) / 2
        mid_y = (start_pos[1] + end_pos[1]) / 2 + (0.2 if start_pos[1] == end_pos[1] else 0)
        
        x = [start_pos[0], mid_x, end_pos[0]]
        y = [start_pos[1], mid_y, end_pos[1]]
        
        # Add flow line
        fig.add_trace(go.Scatter(
            x=x, y=y,
            mode='lines',
            line=dict(
                color='rgba(50, 50, 50, 0.3)' if not is_active else '#00ff00',
                width=3,
                dash='solid' if is_active else 'dot',
                shape='spline'
            ),
            hoverinfo='text',
            hovertext=f"{label}<br>{description}<br>Status: {'Active' if is_active else 'Idle'}",
            showlegend=False
        ))

        # Add animated particles for active flows
        if is_active:
            particle_positions = np.linspace(0, 1, 5)
            for pos in particle_positions:
                # Calculate particle position along the curve
                interp_x = start_pos[0] + pos * (end_pos[0] - start_pos[0])
                interp_y = start_pos[1] + pos * (end_pos[1] - start_pos[1])
                
                fig.add_trace(go.Scatter(
                    x=[interp_x],
                    y=[interp_y],
                    mode='markers',
                    marker=dict(
                        size=8,
                        color='#00ff00',
                        symbol='diamond',
                        opacity=0.8
                    ),
                    showlegend=False
                ))

    # Update layout with improved styling
    fig.update_layout(
        showlegend=False,
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        xaxis=dict(
            showgrid=False, 
            zeroline=False, 
            showticklabels=False,
            range=[-0.1, 1.1]
        ),
        yaxis=dict(
            showgrid=False, 
            zeroline=False, 
            showticklabels=False,
            range=[-0.1, 1.1]
        ),
        margin=dict(l=20, r=20, t=20, b=20),
        height=500,
        hovermode='closest',
        updatemenus=[{
            'buttons': [{
                'args': [None, {'frame': {'duration': 500, 'redraw': True}}],
                'label': '⏵',
                'method': 'animate'
            }],
            'direction': 'left',
            'pad': {'r': 10, 't': 10},
            'showactive': False,
            'type': 'buttons',
            'x': 0.1,
            'xanchor': 'right',
            'y': 1.1,
            'yanchor': 'top'
        }]
    )

    return fig

def simulate_message_flow():
    """Simulate message flow through the system with improved visualization"""
    flows = [
        ([('email_server', 'flask_app')], 'email_server', 'Receiving new email...'),
        ([('email_server', 'flask_app'), ('flask_app', 'email_service')], 'flask_app', 'Processing incoming email...'),
        ([('flask_app', 'email_service'), ('email_service', 'ai_service')], 'email_service', 'Requesting AI response...'),
        ([('email_service', 'ai_service'), ('ai_service', 'email_service')], 'ai_service', 'Generating response...'),
        ([('ai_service', 'email_service'), ('email_service', 'database')], 'email_service', 'Storing conversation...'),
        ([('email_service', 'database'), ('email_service', 'email_server')], 'database', 'Sending reply...'),
        ([], None, 'Process completed')
    ]
    
    flow_container = st.empty()
    status_container = st.empty()
    
    for flow, active_component, status in flows:
        fig = create_animated_system_diagram(flow, active_component)
        flow_container.plotly_chart(fig, use_container_width=True)
        
        with status_container:
            st.info(f"Status: {status}")
            if active_component:
                progress = st.progress(0)
                for i in range(100):
                    progress.progress(i + 1)
                    time.sleep(0.01)
        
        time.sleep(0.5)

def parse_iso_timestamp(timestamp_str: str) -> datetime:
    """Parse ISO8601 timestamp string to datetime object with proper microsecond handling"""
    if not timestamp_str:
        return datetime.now()
        
    try:
        # Handle microseconds explicitly
        if '.' in timestamp_str:
            base, ms = timestamp_str.split('.')
            # Remove any timezone indicator from microseconds
            ms = ms.split('+')[0].split('-')[0].split('Z')[0]
            # Pad microseconds to 6 digits
            ms = ms.ljust(6, '0')
            timestamp_str = f"{base}.{ms}"
            
        # Use pandas with explicit format
        return pd.to_datetime(timestamp_str).tz_localize(None)
    except Exception as e:
        logger.error(f"Error parsing timestamp {timestamp_str}: {e}")
        return datetime.now()

def display_message_list(messages_data):
    """Display message list with pagination"""
    st.subheader("Recent Messages")
    
    if messages_data.get("messages"):
        df = pd.DataFrame(messages_data["messages"])
        
        # Convert timestamps safely
        if "created_at" in df.columns:
            df["created_at"] = df["created_at"].apply(parse_iso_timestamp)
        
        st.dataframe(
            df.style.format({
                "created_at": lambda x: x.strftime("%Y-%m-%d %H:%M:%S")
            })
        )
        
        cols = st.columns(4)
        with cols[0]:
            if st.button("Previous Page") and messages_data["page"] > 1:
                st.session_state.page = messages_data["page"] - 1
        with cols[1]:
            total_pages = (messages_data["total"] - 1) // messages_data["per_page"] + 1
            st.write(f"Page {messages_data['page']} of {total_pages}")
        with cols[2]:
            if st.button("Next Page") and messages_data["page"] < total_pages:
                st.session_state.page = messages_data["page"] + 1

def show_test_section():
    """Show the test section in the dashboard with improved error handling"""
    st.header("System Tests")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🔌 Test Email Connection", disabled=st.session_state.test_running):
            st.session_state.test_running = True
            st.session_state.current_test = 'email'
            st.rerun()
    
    with col2:
        if st.button("🤖 Test AI Service", disabled=st.session_state.test_running):
            st.session_state.test_running = True
            st.session_state.current_test = 'ai'
            st.rerun()
    
    with col3:
        if st.button("🔄 Test Full Flow", disabled=st.session_state.test_running):
            st.session_state.test_running = True
            st.session_state.current_test = 'full'
            st.rerun()
    
    if st.session_state.test_running:
        progress = st.progress(0)
        status = st.empty()
        error_container = st.empty()
        
        try:
            if st.session_state.current_test == 'email':
                status.info("Testing email connection...")
                progress.progress(25)
                
                from src.dashboard.test_flow import run_test_email_connection
                result = run_test_email_connection()
                
                if result:
                    status.success("✓ Email connection test completed successfully")
                else:
                    status.error("× Email connection test failed")
                    error_container.error("Check the logs for detailed error information")
                
            elif st.session_state.current_test == 'ai':
                status.info("Testing AI service...")
                progress.progress(25)
                
                from src.dashboard.test_flow import test_ai_service
                result = test_ai_service()
                
                if result:
                    status.success("✓ AI service test completed successfully")
                else:
                    status.error("× AI service test failed")
                    error_container.error("Check the logs for detailed error information")
                
            elif st.session_state.current_test == 'full':
                steps = [
                    "Initializing test environment...",
                    "Testing email connection...",
                    "Testing AI service...",
                    "Running full flow test..."
                ]
                
                for i, step in enumerate(steps):
                    status.info(f"Step {i+1}/4: {step}")
                    progress.progress(i * 25)
                    
                    if i == 1:  # Email test
                        from src.dashboard.test_flow import run_test_email_connection
                        if not run_test_email_connection():
                            raise Exception("Email connection test failed")
                            
                    elif i == 2:  # AI test
                        from src.dashboard.test_flow import test_ai_service
                        if not test_ai_service():
                            raise Exception("AI service test failed")
                            
                    elif i == 3:  # Full flow
                        from src.dashboard.test_flow import test_full_flow
                        if not test_full_flow():
                            raise Exception("Full flow test failed")
                            
                    time.sleep(1)  # Small delay for visual feedback
                
                progress.progress(100)
                status.success("✓ Full system test completed successfully")
            
        except Exception as e:
            status.error("× Test failed")
            error_container.error(f"Error: {str(e)}")
            logger.error(f"Test error: {e}")
        finally:
            progress.progress(100)
            st.session_state.test_running = False
            st.session_state.current_test = None
    
    # Test Logs section with improved filtering
    st.subheader("Test Logs")
    
    col1, col2 = st.columns([3, 1])
    with col1:
        log_level = st.selectbox(
            "Filter by level",
            ["All", "INFO", "WARNING", "ERROR"],
            index=0
        )
    with col2:
        if st.button("Clear Logs"):
            # Implement log clearing functionality
            pass
    
    # Add log viewer with filtering
    log_viewer = st.empty()
    with log_viewer:
        try:
            import logging
            logger = logging.getLogger(__name__)
            
            # Get test logs from the logger
            log_records = logger.handlers[0].records if logger.handlers else []
            
            if log_records:
                log_df = pd.DataFrame([
                    {
                        'Time': record.created,
                        'Level': record.levelname,
                        'Message': record.getMessage()
                    }
                    for record in log_records
                    if log_level == "All" or record.levelname == log_level
                ])
                
                if not log_df.empty:
                    log_df['Time'] = pd.to_datetime(log_df['Time'], unit='s')
                    st.dataframe(
                        log_df.style.apply(lambda x: [
                            'background-color: #ffcccc' if level == 'ERROR'
                            else 'background-color: #fff3cd' if level == 'WARNING'
                            else '' for level in x
                        ], subset=['Level']
                        ),
                        use_container_width=True
                    )
                else:
                    st.info("No logs matching the selected filter")
            else:
                st.info("No test logs available")
        except Exception as e:
            st.error(f"Error displaying test logs: {e}")

def show_component_details(component_name, info):
    """Show detailed information about a system component"""
    st.markdown(f"### {info['icon']} {info['name']}")
    
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Status", "Online", "✓")
    with col2:
        if component_name == 'email_server':
            st.metric("Messages/hour", f"{random.randint(10, 50)}")
        elif component_name == 'ai_service':
            st.metric("Response Time", f"{random.randint(1, 5)}s")
        elif component_name == 'database':
            st.metric("Query Time", f"{random.randint(50, 200)}ms")

def display_service_health(health_data):
    """Display health status of all services"""
    try:
        if not health_data or "status" not in health_data:
            st.error("Unable to fetch health data from the API")
            return

        overall_status = health_data.get("status", "error")
        if overall_status == "healthy":
            st.success("🟢 All Systems Operational")
        else:
            st.error("🔴 System Issues Detected")

        st.subheader("Service Status")
        services = health_data.get("services", {})
        
        for service_name, service_data in services.items():
            with st.expander(service_name.replace("_", " ").title(), expanded=True):
                status = service_data.get("status", "error")
                if status == "healthy":
                    st.success(f"✅ {service_name}: Operational")
                else:
                    st.error(f"❌ {service_name}: Issues Detected")
                
                cols = st.columns(2)
                for i, (metric, value) in enumerate(service_data.items()):
                    if metric not in ["status", "error"]:
                        with cols[i % 2]:
                            st.metric(
                                metric.replace("_", " ").title(),
                                value if not isinstance(value, bool) else "Yes" if value else "No"
                            )

    except Exception as e:
        st.error(f"Error displaying health data: {str(e)}")
        st.error("Please check if the API server is running and accessible.")

def display_metrics(metrics_data):
    """Display service metrics"""
    st.subheader("Service Metrics")
    
    # Email Service Metrics
    st.markdown("### Email Service Metrics")
    email_metrics = metrics_data["email_service"]
    cols = st.columns(4)
    
    metrics_mapping = [
        ("Total Fetched", "total_fetched"),
        ("Total Sent", "total_sent"),
        ("Failed Fetches", "failed_fetches"),
        ("Failed Sends", "failed_sends")
    ]
    
    for i, (label, key) in enumerate(metrics_mapping):
        with cols[i]:
            st.metric(label, email_metrics[key])
    
    # Performance Metrics
    st.markdown("### Performance Metrics")
    cols = st.columns(3)
    
    # Create gauge charts
    gauge_configs = [
        ("Average Fetch Time (s)", "avg_fetch_time", 5),
        ("Average Send Time (s)", "avg_send_time", 5),
        ("Average AI Response Time (s)", "avg_response_time", 10)
    ]
    
    for i, (title, metric_key, max_value) in enumerate(gauge_configs):
        with cols[i]:
            fig = go.Figure()
            value = email_metrics.get(metric_key, 0) if i < 2 else metrics_data.get("ai_service", {}).get(metric_key, 0)
            
            fig.add_trace(go.Indicator(
                mode="gauge+number",
                value=value,
                title={"text": title},
                gauge={
                    "axis": {"range": [0, max_value]},
                    "steps": [
                        {"range": [0, max_value/3], "color": "lightgreen"},
                        {"range": [max_value/3, 2*max_value/3], "color": "yellow"},
                        {"range": [2*max_value/3, max_value], "color": "red"}
                    ]
                }
            ))
            st.plotly_chart(fig)

def display_ai_insights(metrics_data):
    """Display AI service insights with improved visualization"""
    st.subheader("AI Service Insights")
    
    ai_metrics = metrics_data.get("ai_service", {})
    
    # Response Quality Distribution
    st.markdown("### Response Quality Distribution")
    quality_data = pd.DataFrame({
        'Quality': ["Excellent (>0.9)", "Good (0.7-0.9)", "Fair (0.5-0.7)", "Poor (<0.5)"],
        'Count': [
            ai_metrics.get("quality_excellent", 0),
            ai_metrics.get("quality_good", 0),
            ai_metrics.get("quality_fair", 0),
            ai_metrics.get("quality_poor", 0)
        ]
    })
    
    fig = px.pie(
        quality_data,
        values='Count',
        names='Quality',
        title="Response Quality Distribution",
        color_discrete_sequence=px.colors.qualitative.Set3
    )
    fig.update_traces(textposition='inside', textinfo='percent+label')
    st.plotly_chart(fig, use_container_width=True)
    
    # Common Issues
    st.markdown("### Common Response Issues")
    issues_data = ai_metrics.get("common_issues", {})
    if issues_data:
        issues_df = pd.DataFrame({
            'Issue': list(issues_data.keys()),
            'Count': list(issues_data.values())
        }).sort_values('Count', ascending=True)
        
        fig = px.bar(
            issues_df,
            x='Count',
            y='Issue',
            orientation='h',
            title="Common Response Issues",
            color='Count',
            color_continuous_scale='Viridis'
        )
        fig.update_layout(showlegend=False)
        st.plotly_chart(fig, use_container_width=True)

def display_message_stats(stats_data):
    """Display message statistics with enhanced visualization"""
    st.subheader("Message Statistics")
    
    # Create metrics cards with improved styling
    cols = st.columns(3)
    metrics = [
        ("Total Messages", "total_messages", "📬"),
        ("Messages Today", "messages_today", "📅"),
        ("Response Rate", "response_rate", "📊")
    ]
    
    for i, (label, key, icon) in enumerate(metrics):
        with cols[i]:
            value = stats_data[key]
            if key == "response_rate":
                value = f"{value:.1f}%"
            st.metric(
                label=f"{icon} {label}",
                value=value,
                delta=stats_data.get(f"{key}_delta", None)
            )
    
    # Message Flow Chart with improved visualization
    st.markdown("### Message Flow")
    flow_data = pd.DataFrame({
        "Type": ["Incoming", "Outgoing"],
        "Count": [stats_data["incoming_today"], stats_data["outgoing_today"]]
    })
    
    fig = px.bar(
        flow_data,
        x="Type",
        y="Count",
        color="Type",
        title="Today's Message Flow",
        color_discrete_map={
            "Incoming": "#2ecc71",
            "Outgoing": "#3498db"
        }
    )
    
    fig.update_layout(
        showlegend=True,
        legend_title=None,
        xaxis_title=None,
        yaxis_title="Number of Messages",
        plot_bgcolor='rgba(0,0,0,0)',
        bargap=0.3
    )
    
    fig.update_traces(
        textposition='auto',
        texttemplate='%{y}',
        hovertemplate='%{y} messages'
    )
    
    st.plotly_chart(fig, use_container_width=True)
    
    # Add historical trend
    if "hourly_stats" in stats_data:
        st.markdown("### Message Activity (Last 24 Hours)")
        hourly_data = pd.DataFrame(stats_data["hourly_stats"])
        hourly_data['hour'] = pd.to_datetime(hourly_data['timestamp']).dt.strftime('%H:00')
        
        fig = px.line(
            hourly_data,
            x='hour',
            y=['incoming', 'outgoing'],
            title="Message Activity Trend",
            labels={'value': 'Number of Messages', 'variable': 'Type'},
            color_discrete_map={
                'incoming': '#2ecc71',
                'outgoing': '#3498db'
            }
        )
        
        fig.update_layout(
            xaxis_title="Hour",
            yaxis_title="Number of Messages",
            hovermode='x unified',
            plot_bgcolor='rgba(0,0,0,0)'
        )
        
        st.plotly_chart(fig, use_container_width=True)

def send_api_command(command: str, action: str) -> bool:
    """Send command to API with improved error handling and retries"""
    session = requests.Session()
    session.verify = False  # For development only
    
    for attempt in range(MAX_RETRIES):
        try:
            response = session.post(
                f"{API_BASE_URL}/control/{action}",
                timeout=API_TIMEOUT,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                }
            )
            response.raise_for_status()
            return True
        except requests.exceptions.RequestException as e:
            if attempt < MAX_RETRIES - 1:
                logger.warning(f"Command attempt {attempt + 1} failed: {e}")
                time.sleep(RETRY_DELAY * (attempt + 1))
                continue
            logger.error(f"Error sending {command}: {e}")
            st.error(f"Error: {str(e)}")
    return False

def create_timeline_chart(data: pd.DataFrame) -> go.Figure:
    """Create timeline chart with proper date handling"""
    try:
        if data.empty:
            return go.Figure()
            
        # Ensure we have the required columns
        if 'timestamp' not in data.columns:
            logger.error("Timeline data missing timestamp column")
            return go.Figure()
            
        # Convert timestamps safely
        data = data.copy()  # Create a copy to avoid modifying the original
        data['timestamp'] = data['timestamp'].apply(parse_iso_timestamp)
        
        # Sort by timestamp to ensure proper line plotting
        data = data.sort_values('timestamp')
        
        fig = px.line(data, 
                     x='timestamp',
                     y='value',
                     color='metric',
                     title='System Metrics Timeline')
        
        fig.update_layout(
            xaxis_title="Time",
            yaxis_title="Value",
            hovermode='x unified'
        )
        return fig
    except Exception as e:
        logger.error(f"Error creating timeline chart: {e}")
        return go.Figure()

def show_metrics_dashboard():
    """Display metrics dashboard with proper date handling"""
    try:
        metrics_data = fetch_api_data("metrics")
        if not metrics_data:
            st.error("Failed to fetch metrics data")
            return
        
        # Process timestamps with the updated parser
        email_metrics = metrics_data.get('email_service', {})
        if not email_metrics:
            st.warning("No email metrics available")
            return
            
        try:
            # Create metrics DataFrame with safer timestamp handling
            df = pd.DataFrame({
                'timestamp': [
                    email_metrics.get('last_fetch', ''),
                    email_metrics.get('last_send', '')
                ],
                'metric': ['Fetched', 'Sent'],
                'value': [
                    email_metrics.get('total_fetched', 0),
                    email_metrics.get('total_sent', 0)
                ]
            })
            
            # Remove any rows with empty timestamps
            df = df[df['timestamp'].astype(bool)]
            
            if not df.empty:
                # Display timeline
                st.plotly_chart(create_timeline_chart(df), use_container_width=True)
            else:
                st.warning("No timeline data available")
            
        except Exception as e:
            logger.error(f"Error processing metrics data: {e}")
            st.error("Error processing metrics data")
            
    except Exception as e:
        logger.error(f"Error in metrics dashboard: {e}")
        st.error("Failed to display metrics dashboard")

def main():
    # Initialize session state
    init_session_state()
    
    # Initialize logging
    logging.basicConfig(level=logging.INFO)
    logger = logging.getLogger(__name__)
    
    # Initialize AI Service using a default configuration
    # Update the parameters as needed for your environment.
    ai_manager = AIServiceManager()
    
    st.title("📧 AiMail Monitor")
    
    # Display connection status
    if st.session_state.connection_status is None:
        with st.spinner("Checking connection to backend..."):
            st.session_state.connection_status = check_api_availability()
    
    if not st.session_state.connection_status:
        st.error("⚠️ Cannot connect to backend server")
        col1, col2 = st.columns(2)
        with col1:
            if st.button("Retry Connection"):
                st.session_state.connection_status = None
                st.session_state.error_count = 0
                st.rerun()
        with col2:
            if st.button("Show Connection Details"):
                st.info(f"""
                Backend URL: {API_BASE_URL}
                Timeout: {API_TIMEOUT}s
                Max Retries: {MAX_RETRIES}
                """)
        return
    
    # Display control panel in sidebar
    with st.sidebar:
        st.subheader("Control Panel")
        
        # Connection status indicator
        st.markdown("""
            <style>
            .connection-status { padding: 0.5rem; border-radius: 0.3rem; margin-bottom: 1rem; }
            .connection-status.connected { background-color: #d4edda; color: #155724; }
            .connection-status.error { background-color: #f8d7da; color: #721c24; }
            </style>
        """, unsafe_allow_html=True)
        
        st.markdown(
            '<div class="connection-status connected">✅ Connected to Backend</div>' 
            if st.session_state.connection_status 
            else '<div class="connection-status error">❌ Backend Disconnected</div>',
            unsafe_allow_html=True
        )
        
        # Start/Stop Processor buttons
        col1, col2 = st.columns(2)
        with col1:
            if st.button("Start Processor", disabled=not st.session_state.connection_status):
                if send_api_command("Start Processor", "start"):
                    st.success("Processor started")
        
        with col2:
            if st.button("Stop Processor", disabled=not st.session_state.connection_status):
                if send_api_command("Stop Processor", "stop"):
                    st.success("Processor stopped")
        
        # Trigger Processing button
        if st.button("Trigger Processing", disabled=not st.session_state.connection_status):
            if send_api_command("Trigger Processing", "process"):
                st.success("Processing triggered")
        
        # Refresh interval slider
        st.session_state.refresh_interval = st.slider(
            "Refresh Interval (seconds)",
            min_value=5,
            max_value=60,
            value=st.session_state.refresh_interval
        )
        
        if st.button("Refresh Now"):
            st.session_state.last_refresh = time.sleep(0)
            st.rerun()
    
    try:
        # Show loading spinner while fetching data
        with st.spinner("Fetching data..."):
            # Fetch all data at once
            health_data = fetch_api_data("health")
            metrics_data = fetch_api_data("metrics")
            stats_data = fetch_api_data("stats")
            messages_data = fetch_api_data(f"messages?page={st.session_state.get('page', 1)}&per_page=10")
            
            # Reset error count on successful fetch
            st.session_state.error_count = 0
        
        # Create tabs
        tabs = st.tabs([
            "Overview",
            "System Flow",
            "Component Details",
            "Testing",
            "Messages"
        ])
        
        with tabs[0]:
            display_service_health(health_data)
            display_metrics(metrics_data)
            display_ai_insights(metrics_data)
        
        with tabs[1]:
            st.header("System Flow")
            col1, col2 = st.columns([3, 1])
            with col1:
                fig = create_animated_system_diagram(st.session_state.active_flows)
                st.plotly_chart(fig, use_container_width=True)
            with col2:
                if st.button("Simulate Flow", disabled=not st.session_state.components_loaded):
                    simulate_message_flow()
        
        with tabs[2]:
            st.header("Component Details")
            component = st.selectbox(
            "Select Component",
            options=list(SYSTEM_LAYOUT.keys()),
            format_func=lambda x: SYSTEM_LAYOUT[x]['name']
        )
            if component:
                show_component_details(component, SYSTEM_LAYOUT[component])
        
        with tabs[3]:
            show_test_section()
        
        with tabs[4]:
            display_message_stats(stats_data)
            display_message_list(messages_data)
            
    except Exception as e:
        st.session_state.error_count += 1
        st.error(f"Error loading dashboard: {str(e)}")
        logger.error(f"Dashboard error: {e}")
        
        if st.session_state.error_count >= 3:
            st.warning("Multiple errors occurred. Backend connection might be unstable.")
            if st.button("Reset Connection"):
                st.session_state.connection_status = None
                st.session_state.error_count = 0
                st.rerun()
        elif st.button("Retry"):
            st.rerun()

if __name__ == "__main__":
    # Instead of checking for an available port, simply start the app.
    # Previous multi-port logic removed:
    # if find_available_port():
    #     start_streamlit()
    # else:
    #     print("Error: Port 8501 is already in use")
    #     sys.exit(1)
    main() 