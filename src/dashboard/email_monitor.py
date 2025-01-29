import streamlit as st
import plotly.graph_objects as go
from datetime import datetime, timedelta
import sys
import os
import json
import time
import plotly.graph_objects as go
from plotly.subplots import make_subplots
import networkx as nx
import random
import numpy as np
from src.dashboard.test_flow import test_email_connection, test_ai_service, test_full_flow
import queue
import threading
from src.dashboard.streamlit_logger import setup_streamlit_logging
from sqlalchemy.sql import func, or_
import requests
from src.database.models.conversation_messages import ConversationMessage, MessageDirection
from src.database.database_config import SessionLocal
from src.config.config import Config

def init_session_state():
    """Initialize all session state variables"""
    if not hasattr(st, 'session_state'):
        st.session_state = {}
    
    # Test-related state
    if 'test_logs' not in st.session_state:
        st.session_state.test_logs = []
    if 'test_running' not in st.session_state:
        st.session_state.test_running = False
    if 'current_test' not in st.session_state:
        st.session_state.current_test = None
    
    # Simulation state
    if 'simulate' not in st.session_state:
        st.session_state.simulate = False
    
    # Conversation management state
    if 'reply_to' not in st.session_state:
        st.session_state.reply_to = None
    if 'reply_subject' not in st.session_state:
        st.session_state.reply_subject = None
    if 'add_note_to' not in st.session_state:
        st.session_state.add_note_to = None
    if 'analyze_thread' not in st.session_state:
        st.session_state.analyze_thread = None

# Initialize session state at startup
init_session_state()

# Add parent directory to path to import from project
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Setup logging
setup_streamlit_logging()

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
    ('email_server', 'flask_app', 'Incoming Email', 'New email received', 'top'),
    ('flask_app', 'email_service', 'Forward', 'Processing email content', 'top'),
    ('email_service', 'ai_service', 'Request', 'Requesting AI response', 'top'),
    ('ai_service', 'email_service', 'Response', 'AI response ready', 'bottom'),
    ('email_service', 'email_server', 'Send Reply', 'Sending reply email', 'bottom'),
    ('email_service', 'database', 'Store', 'Storing conversation', 'side')
]

def create_animated_system_diagram(active_flows=None, highlight_component=None):
    """Create an animated system diagram using Plotly with enhanced visuals"""
    if active_flows is None:
        active_flows = []

    # Create figure with secondary y-axis for animations
    fig = make_subplots(specs=[[{"secondary_y": True}]])

    # Add nodes with enhanced styling
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
    for start, end, label, description, path_type in SYSTEM_FLOWS:
        start_pos = SYSTEM_LAYOUT[start]['pos']
        end_pos = SYSTEM_LAYOUT[end]['pos']
        is_active = (start, end) in active_flows
        
        # Calculate intermediate points based on path type
        if path_type == 'top':
            # Path curves upward
            mid_x = (start_pos[0] + end_pos[0]) / 2
            mid_y = start_pos[1] + 0.3
        elif path_type == 'bottom':
            # Path curves downward
            mid_x = (start_pos[0] + end_pos[0]) / 2
            mid_y = start_pos[1] - 0.3
        else:  # 'side' - direct connection
            mid_x = (start_pos[0] + end_pos[0]) / 2
            mid_y = (start_pos[1] + end_pos[1]) / 2
        
        # Create path
        x = [start_pos[0], mid_x, end_pos[0]]
        y = [start_pos[1], mid_y, end_pos[1]]
        
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
                if path_type in ['top', 'bottom']:
                    # Quadratic interpolation for curved paths
                    t = pos
                    interp_x = (1-t)**2 * start_pos[0] + 2*(1-t)*t*mid_x + t**2*end_pos[0]
                    interp_y = (1-t)**2 * start_pos[1] + 2*(1-t)*t*mid_y + t**2*end_pos[1]
                else:
                    # Linear interpolation for direct paths
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

    # Update layout with enhanced styling and adjusted label positions
    fig.update_layout(
        showlegend=False,
        plot_bgcolor='rgba(0,0,0,0)',
        paper_bgcolor='rgba(0,0,0,0)',
        xaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        yaxis=dict(showgrid=False, zeroline=False, showticklabels=False),
        margin=dict(l=20, r=20, t=20, b=20),
        height=500,
        hovermode='closest',
        annotations=[
            dict(
                x=(SYSTEM_LAYOUT[start]['pos'][0] + SYSTEM_LAYOUT[end]['pos'][0])/2,
                y=(SYSTEM_LAYOUT[start]['pos'][1] + SYSTEM_LAYOUT[end]['pos'][1])/2 + 
                   (0.35 if path_type == 'top' else -0.35 if path_type == 'bottom' else 0.1),
                text=label,
                showarrow=False,
                font=dict(size=10, color='rgba(0,0,0,0.6)')
            )
            for start, end, label, _, path_type in SYSTEM_FLOWS
        ]
    )

    return fig

def simulate_message_flow(placeholder, status_placeholder):
    """Simulate message flow through the system with status updates"""
    flows = [
        ([('email_server', 'flask_app')], 'email_server', 'Receiving new email...'),
        ([('email_server', 'flask_app'), ('flask_app', 'email_service')], 'flask_app', 'Processing incoming email...'),
        ([('flask_app', 'email_service'), ('email_service', 'ai_service')], 'email_service', 'Requesting AI response...'),
        ([('email_service', 'ai_service'), ('ai_service', 'email_service')], 'ai_service', 'Generating response...'),
        ([('ai_service', 'email_service'), ('email_service', 'database')], 'email_service', 'Storing conversation...'),
        ([('email_service', 'database'), ('email_service', 'email_server')], 'database', 'Sending reply...'),
        ([], None, 'Process completed')
    ]
    
    for flow, active_component, status in flows:
        # Update diagram
        fig = create_animated_system_diagram(flow, active_component)
        placeholder.plotly_chart(fig, use_container_width=True)
        
        # Update status with animation
        with status_placeholder:
            st.info(f"Status: {status}")
            
            # Show progress for current step
            if active_component:
                progress = st.progress(0)
                for i in range(100):
                    progress.progress(i + 1)
                    time.sleep(0.01)
        
        time.sleep(0.5)

def show_component_details(component_name, info):
    """Show detailed information about a system component"""
    st.markdown(f"### {info['icon']} {info['name']}")
    
    # Create metrics
    col1, col2 = st.columns(2)
    with col1:
        st.metric("Status", "Online", "✓")
    with col2:
        # Simulate some metrics
        if component_name == 'email_server':
            st.metric("Messages/hour", random.randint(10, 50))
        elif component_name == 'ai_service':
            st.metric("Response Time", f"{random.randint(1, 5)}s")
        elif component_name == 'database':
            st.metric("Query Time", f"{random.randint(50, 200)}ms")

def show_test_section():
    """Show the test section in the dashboard"""
    st.header("System Tests")
    
    # Create columns for test buttons
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
    
    # Show progress and status
    if st.session_state.test_running:
        progress = st.progress(0)
        status = st.empty()
        
        try:
            if st.session_state.current_test == 'email':
                status.info("Testing email connection...")
                for i in range(50):
                    progress.progress(i)
                    time.sleep(0.1)
                result = test_email_connection()
                progress.progress(100)
                
            elif st.session_state.current_test == 'ai':
                status.info("Testing AI service...")
                for i in range(50):
                    progress.progress(i)
                    time.sleep(0.1)
                result = test_ai_service()
                progress.progress(100)
                
            elif st.session_state.current_test == 'full':
                steps = [
                    "Sending test email...",
                    "Waiting for processing...",
                    "Checking for response...",
                    "Verifying results..."
                ]
                
                for i, step in enumerate(steps):
                    status.info(f"Step {i+1}/4: {step}")
                    progress.progress(i * 25)
                    if i == 0:
                        time.sleep(2)
                    elif i == 1:
                        time.sleep(5)
                    else:
                        time.sleep(3)
                
                result = test_full_flow()
                progress.progress(100)
            
            if result:
                status.success("✓ Test completed successfully")
            else:
                status.error("× Test failed")
                
        except Exception as e:
            status.error(f"× Test failed: {str(e)}")
            progress.progress(100)
        
        # Reset test state
        st.session_state.test_running = False
        st.session_state.current_test = None
    
    # Add test logs section with improved styling
    st.subheader("Test Logs")
    
    # Add log filter
    log_level = st.selectbox(
        "Filter by level",
        ["All", "INFO", "WARNING", "ERROR"],
        index=0
    )
    
    # Filter logs based on selection
    filtered_logs = st.session_state.test_logs
    if log_level != "All":
        filtered_logs = [log for log in st.session_state.test_logs if log_level in log]
    
    # Create a text area for logs with custom styling
    log_container = st.container()
    with log_container:
        st.markdown("""
        <style>
        .stTextArea textarea {
            font-family: monospace;
            background-color: #f0f2f6;
        }
        </style>
        """, unsafe_allow_html=True)
        
        # Show logs in reverse chronological order with custom formatting
        logs = "\n".join(reversed(filtered_logs))
        st.text_area(
            "Recent Test Results",
            value=logs,
            height=300,
            key="log_display"
        )
    
    # Add control buttons in a row
    control_col1, control_col2 = st.columns(2)
    with control_col1:
        if st.button("Clear Logs"):
            st.session_state.test_logs = []
            st.rerun()
    with control_col2:
        if st.button("Export Logs"):
            # Create log file content
            log_content = "\n".join(st.session_state.test_logs)
            st.download_button(
                label="Download Logs",
                data=log_content,
                file_name=f"email_assistant_logs_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt",
                mime="text/plain"
            )

def show_email_monitor():
    """Show email monitoring section with enhanced statistics"""
    st.header("Email Activity Monitor")
    
    try:
        db = SessionLocal()
        
        # Top Stats Row
        col1, col2, col3, col4 = st.columns(4)
        
        # Get time-based stats
        now = datetime.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        
        # Query messages
        total_messages = db.query(ConversationMessage).count()
        messages_today = db.query(ConversationMessage).filter(
            ConversationMessage.created_at >= today_start
        ).count()
        
        # Use the enum values directly from MessageDirection
        incoming_today = db.query(ConversationMessage).filter(
            ConversationMessage.created_at >= today_start,
            ConversationMessage.direction == MessageDirection.INCOMING
        ).count()
        
        outgoing_today = db.query(ConversationMessage).filter(
            ConversationMessage.created_at >= today_start,
            ConversationMessage.direction == MessageDirection.OUTGOING
        ).count()
        
        unique_senders = db.query(ConversationMessage.sender_email).distinct().count()
        response_rate = (outgoing_today/incoming_today*100 if incoming_today > 0 else 0)
        
        with col1:
            st.metric("Total Messages", total_messages)
        with col2:
            st.metric("Today's Messages", messages_today)
        with col3:
            st.metric("Unique Senders", unique_senders)
        with col4:
            st.metric("Response Rate", f"{response_rate:.1f}%")
        
        # Today's Activity
        st.subheader("Today's Activity")
        activity_col1, activity_col2 = st.columns(2)
        
        with activity_col1:
            # Create a pie chart for today's messages
            fig = go.Figure(data=[
                go.Pie(
                    labels=['Incoming', 'Outgoing'],
                    values=[incoming_today, outgoing_today],
                    hole=.3,
                    marker_colors=['#2196f3', '#4caf50']
                )
            ])
            fig.update_layout(title="Message Distribution")
            st.plotly_chart(fig, use_container_width=True)
        
        with activity_col2:
            # Create hourly activity chart
            hourly_messages = (
                db.query(
                    func.date_trunc('hour', ConversationMessage.created_at).label('hour'),
                    func.count().label('count')
                )
                .filter(ConversationMessage.created_at >= today_start)
                .group_by('hour')
                .order_by('hour')
                .all()
            )
            
            hours = [msg[0] for msg in hourly_messages]
            counts = [msg[1] for msg in hourly_messages]
            
            fig = go.Figure(data=[
                go.Bar(
                    x=hours,
                    y=counts,
                    marker_color='#2196f3'
                )
            ])
            fig.update_layout(
                title="Hourly Activity",
                xaxis_title="Hour",
                yaxis_title="Messages"
            )
            st.plotly_chart(fig, use_container_width=True)
        
        # Recent Messages
        st.subheader("Recent Messages")
        
        # Add filters
        filter_col1, filter_col2, filter_col3 = st.columns(3)
        with filter_col1:
            direction_filter = st.selectbox(
                "Direction",
                ["All", "Incoming", "Outgoing"]
            )
        with filter_col2:
            search_term = st.text_input("Search", placeholder="Search in messages...")
        with filter_col3:
            date_range = st.date_input(
                "Date Range",
                value=(datetime.now() - timedelta(days=7), datetime.now())
            )
        
        # Build query with filters
        query = db.query(ConversationMessage)
        
        if direction_filter != "All":
            # Map the filter selection to the correct enum value
            direction_enum = MessageDirection.INCOMING if direction_filter == "Incoming" else MessageDirection.OUTGOING
            query = query.filter(ConversationMessage.direction == direction_enum)
        
        if search_term:
            query = query.filter(
                or_(
                    ConversationMessage.subject.ilike(f"%{search_term}%"),
                    ConversationMessage.body.ilike(f"%{search_term}%"),
                    ConversationMessage.sender_email.ilike(f"%{search_term}%")
                )
            )
        
        if len(date_range) == 2:
            start_date, end_date = date_range
            query = query.filter(
                ConversationMessage.created_at.between(
                    start_date,
                    end_date + timedelta(days=1)
                )
            )
        
        # Execute query
        messages = query.order_by(ConversationMessage.created_at.desc()).limit(50).all()
        
        # Display messages in a modern way
        for msg in messages:
            with st.expander(
                f"{'📥' if msg.direction == MessageDirection.INCOMING else '📤'} "
                f"{msg.subject} - From: {msg.sender_email}"
            ):
                col1, col2 = st.columns([1, 4])
                with col1:
                    st.write(f"Time: {msg.created_at.strftime('%H:%M:%S')}")
                    st.write(f"Thread ID: {msg.thread_id or 'N/A'}")
                with col2:
                    st.markdown(
                        f"""
                        <div style="
                            background-color: {'#e3f2fd' if msg.direction == MessageDirection.INCOMING else '#f1f8e9'};
                            padding: 10px;
                            border-radius: 5px;
                            margin: 5px 0;
                        ">
                            {msg.body}
                        </div>
                        """,
                        unsafe_allow_html=True
                    )
    except Exception as e:
        st.error(f"Error loading email monitor: {e}")
    finally:
        db.close()

def show_processor_control():
    """Show email processor control section"""
    st.header("Processor Control")
    
    col1, col2, col3 = st.columns(3)
    
    with col1:
        if st.button("🚀 Start Processor"):
            try:
                response = requests.post("http://localhost:5001/control/start")
                if response.status_code == 200:
                    st.success("Processor started successfully")
                else:
                    st.error("Failed to start processor")
            except Exception as e:
                st.error(f"Error: {e}")
    
    with col2:
        if st.button("🛑 Stop Processor"):
            try:
                response = requests.post("http://localhost:5001/control/stop")
                if response.status_code == 200:
                    st.success("Processor stopped successfully")
                else:
                    st.error("Failed to stop processor")
            except Exception as e:
                st.error(f"Error: {e}")
    
    with col3:
        if st.button("🔄 Process Now"):
            try:
                response = requests.post("http://localhost:5001/process")
                if response.status_code == 200:
                    st.success("Processing triggered successfully")
                else:
                    st.error("Failed to trigger processing")
            except Exception as e:
                st.error(f"Error: {e}")
    
    # Show processor status
    try:
        response = requests.get("http://localhost:5001/stats")
        if response.status_code == 200:
            data = response.json()
            
            status_col1, status_col2 = st.columns(2)
            with status_col1:
                st.metric(
                    "Processor Status",
                    "Running" if data['processor_status']['is_running'] else "Stopped"
                )
            with status_col2:
                st.metric("Queue Size", data['processor_status']['queue_size'])
    except Exception as e:
        st.error(f"Error fetching processor status: {e}")

def main():
    st.set_page_config(page_title="Email Assistant Monitor", layout="wide")
    
    # Initialize session state
    init_session_state()
    
    # Add CSS for better styling
    st.markdown("""
        <style>
        .stMetric {
            background-color: #f8f9fa;
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.12);
        }
        .stProgress > div > div > div {
            background-color: #2196f3;
        }
        </style>
    """, unsafe_allow_html=True)
    
    # Title and description
    st.title("📧 Email Assistant Dashboard")
    st.markdown("""
        Monitor and control your AI-powered email assistant. View statistics, 
        manage conversations, and control the email processor.
    """)
    
    # Create tabs
    tab1, tab2, tab3, tab4, tab5 = st.tabs([
        "📊 Email Monitor",
        "🔄 System Flow",
        "🔧 Component Details",
        "🧪 Testing",
        "💬 Conversation Manager"
    ])
    
    with tab1:
        show_email_monitor()
    
    with tab2:
        st.header("System Flow")
        show_processor_control()
        
        # Add system flow visualization
        st.subheader("System Flow Visualization")
        
        # Create placeholders for diagram and status
        diagram_placeholder = st.empty()
        status_placeholder = st.empty()
        
        # Add simulation control
        if st.button("▶️ Simulate Message Flow", disabled=st.session_state.simulate):
            st.session_state.simulate = True
            simulate_message_flow(diagram_placeholder, status_placeholder)
            st.session_state.simulate = False
        else:
            # Show static diagram when not simulating
            fig = create_animated_system_diagram()
            diagram_placeholder.plotly_chart(fig, use_container_width=True)
            status_placeholder.info("Click 'Simulate Message Flow' to see the system in action")
        
        # Add system description
        st.markdown("""
        ### How it works
        1. **Email Server** receives incoming emails
        2. **Flask App** processes and routes the messages
        3. **Email Service** handles email operations
        4. **AI Service** generates intelligent responses
        5. **Database** stores all conversations and metadata
        
        The green arrows and particles show active message flow during simulation.
        """)
    
    with tab3:
        st.header("Component Details")
        st.markdown("View detailed information about each system component.")
        
        # Select component to view details
        component_name = st.selectbox(
            "Select Component",
            options=list(SYSTEM_LAYOUT.keys()),
            format_func=lambda x: SYSTEM_LAYOUT[x]['name']
        )
        
        # Show component details
        if component_name:
            info = SYSTEM_LAYOUT[component_name]
            st.subheader(f"{info['icon']} {info['name']}")
            
            # Display component info in columns
            col1, col2 = st.columns(2)
            with col1:
                st.markdown("**Status:** 🟢 Active")
                st.markdown("**Type:** System Component") 
            with col2:
                st.markdown(f"**Color:** {info['color']}")
                st.markdown(f"**Position:** {info['pos']}")
    
    with tab4:
        show_test_section()
    
    with tab5:
        st.header("Conversation Manager")
        st.markdown("Coming soon...")

if __name__ == "__main__":
    main() 