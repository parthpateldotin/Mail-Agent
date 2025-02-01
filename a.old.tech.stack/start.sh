#!/bin/bash

# Kill any existing Flask and Streamlit processes
pkill -f "flask run" || true
pkill -f "streamlit run" || true

# Wait a moment to ensure ports are freed
sleep 2

# Activate virtual environment
source .venv/bin/activate

# Export Python path to include src directory
export PYTHONPATH="${PYTHONPATH:+${PYTHONPATH}:}$(pwd)"

# Start Flask server in background
FLASK_DEBUG=1 FLASK_APP=src/api/app.py flask run --port=5001 &

# Start Streamlit app in background
streamlit run src/dashboard/email_monitor.py &

# Wait for both processes
wait 