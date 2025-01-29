# Contributing to AiMail

This guide will help you set up AiMail for development and understand the project structure.

## Development Environment Setup

### Prerequisites
1. Python 3.8 or higher
2. PostgreSQL 14 or higher
3. Docker and Docker Compose (optional, for containerized development)
4. Git
5. Gmail account with App Password
6. OpenAI API key

### Step 1: Clone and Configure Repository
```bash
# Clone the repository
git clone https://github.com/yourusername/AiMail.git
cd AiMail

# Create a new branch for your feature
git checkout -b feature/your-feature-name
```

### Step 2: Local Development Setup

#### Option A: Traditional Setup
1. Create and activate virtual environment:
   ```bash
   python3 -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials:
   # - Gmail credentials (use App Password)
   # - OpenAI API key
   # - Database settings
   # - Admin email
   ```

4. Set up PostgreSQL:
   ```bash
   # Create database
   createdb aimail

   # The tables will be automatically created when you first run the application
   ```

5. Start the application:
   ```bash
   ./start.sh
   ```

#### Option B: Docker Setup
1. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your credentials
   ```

2. Start development containers:
   ```bash
   docker-compose -f docker-compose.dev.yml up --build
   ```

### Step 3: Verify Setup
1. Check API server:
   ```bash
   curl http://localhost:5001/stats
   ```

2. Access dashboard:
   - Open browser: http://localhost:8501

## Project Structure Explained

### Core Components

1. **API Server** (`src/api/`)
   - `app.py`: Main Flask application
   - Handles email processing and background jobs
   - REST endpoints for control and monitoring

2. **Dashboard** (`src/dashboard/`)
   - `email_monitor.py`: Streamlit dashboard
   - Real-time monitoring and controls
   - Statistics and conversation history

3. **Email Services** (`src/email/services/`)
   - `email_service.py`: IMAP/SMTP operations
   - `email_processor.py`: Processing pipeline
   - `ai_service.py`: OpenAI integration
   - `admin_service.py`: Admin functions

4. **Database** (`src/database/`)
   - `models/`: SQLAlchemy models
   - `database_config.py`: Database configuration
   - Uses PostgreSQL for storage

### Key Files
- `start.sh`: Application startup script
- `setup.sh`: Development environment setup
- `docker-compose.yml`: Production container config
- `docker-compose.dev.yml`: Development container config
- `requirements.txt`: Python dependencies

## Development Workflow

### 1. Making Changes
1. Create a feature branch:
   ```bash
   git checkout -b feature/your-feature
   ```

2. Make your changes following these guidelines:
   - Follow PEP 8 style guide
   - Add docstrings to functions and classes
   - Update tests for new functionality
   - Keep commits focused and atomic

### 2. Testing
1. Run tests:
   ```bash
   # Local
   python -m pytest tests/

   # Docker
   docker-compose exec api python -m pytest tests/
   ```

2. Manual testing:
   - Test email processing
   - Verify dashboard updates
   - Check database operations

### 3. Submitting Changes
1. Push your changes:
   ```bash
   git push origin feature/your-feature
   ```

2. Create a Pull Request:
   - Provide clear description
   - Reference any related issues
   - Include test results
   - List any new dependencies

## Common Development Tasks

### Database Operations
1. Access PostgreSQL:
   ```bash
   # Local
   psql aimail

   # Docker
   docker-compose exec db psql -U postgres aimail
   ```

2. Reset database:
   ```bash
   dropdb aimail && createdb aimail
   ```

### Debugging
1. API logs:
   ```bash
   # Local
   tail -f logs/api.log

   # Docker
   docker-compose logs -f api
   ```

2. Dashboard logs:
   ```bash
   # Local
   tail -f logs/dashboard.log

   # Docker
   docker-compose logs -f dashboard
   ```

### Adding Dependencies
1. Add to `requirements.txt`
2. Rebuild containers if using Docker:
   ```bash
   docker-compose build --no-cache
   ```

## Troubleshooting

### Common Issues

1. Import Errors
   - Verify PYTHONPATH includes project root
   - Check for circular imports
   - Ensure using correct import paths (from src.*)

2. Database Errors
   - Check PostgreSQL is running
   - Verify credentials in .env
   - Ensure tables are created

3. Email Connection Issues
   - Verify Gmail App Password
   - Check IMAP is enabled
   - Test connection with test_flow.py

4. Docker Issues
   - Clean old containers: `docker-compose down -v`
   - Rebuild: `docker-compose build --no-cache`
   - Check logs: `docker-compose logs [service]`

### Getting Help
1. Check existing issues on GitHub
2. Review documentation in /docs
3. Ask in team chat/discussion
4. Create a new issue with:
   - Error message
   - Steps to reproduce
   - Environment details

## Code Style Guide

1. Python Style
   - Follow PEP 8
   - Use type hints
   - Maximum line length: 100
   - Use docstrings (Google style)

2. Commit Messages
   - Use present tense
   - Be descriptive but concise
   - Reference issues when relevant

3. Documentation
   - Update README for new features
   - Add docstrings to functions
   - Comment complex logic
   - Keep docs in sync with code

## Additional Resources
- [Flask Documentation](https://flask.palletsprojects.com/)
- [Streamlit Documentation](https://docs.streamlit.io/)
- [SQLAlchemy Documentation](https://docs.sqlalchemy.org/)
- [OpenAI API Documentation](https://platform.openai.com/docs/) 