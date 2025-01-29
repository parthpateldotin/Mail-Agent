#!/bin/bash

echo "Setting up AiMail development environment..."

# Check if Python 3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python 3 first."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d ".venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv .venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source .venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Set up environment variables if .env doesn't exist
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOL
# Email Configuration
EMAIL_SERVICE_USERNAME=your_email@gmail.com
EMAIL_SERVICE_PASSWORD=your_app_specific_password
EMAIL_SERVICE_IMAP_SERVER=imap.gmail.com
EMAIL_SERVICE_SMTP_SERVER=smtp.gmail.com
EMAIL_SERVICE_SMTP_PORT=587

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aimail
DB_USER=postgres
DB_PASSWORD=postgres

# Admin Configuration
ADMIN_EMAIL=admin@example.com

# Flask Configuration
FLASK_APP=src/api/app.py
FLASK_DEBUG=1
FLASK_RUN_PORT=5001

# Streamlit Configuration
STREAMLIT_SERVER_PORT=8501
EOL
    echo "Please update the .env file with your credentials"
fi

# Make start script executable
chmod +x start.sh

echo "Setup complete! You can now:"
echo "1. Update the .env file with your credentials"
echo "2. Run './start.sh' to start the application" 