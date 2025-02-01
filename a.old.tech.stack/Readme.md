# AiMail

AiMail is an intelligent email management system that automates email processing and responses using AI. It features a Flask API backend, Streamlit dashboard, and integrates with OpenAI's GPT models for smart email handling.

## Features

- 📧 Automated email processing and response generation
- 🤖 AI-powered email analysis and categorization
- 📊 Real-time dashboard for email monitoring
- 🔄 Scheduled email processing with background jobs
- 🔒 Secure email handling with IMAP/SMTP support
- 📝 Conversation history tracking
- 📈 Email statistics and analytics

## Prerequisites

- Docker and Docker Compose
- Python 3.12 or higher (for local development)
- PostgreSQL 14 or higher (for local development)
- Email account with IMAP/SMTP access
- OpenAI API key

## Quick Start with Docker

1. Clone the repository:
```bash
git clone https://github.com/parthpateldotin/AiMail.git
cd AiMail
```

2. Create environment file:
```bash
cp .env.example .env
```

3. Update the `.env` file with your credentials:
- Email service configuration (IMAP/SMTP)
- OpenAI API key
- Database credentials
- Other configuration parameters

4. Start the services using Docker Compose:
```bash
docker-compose up -d
```

The services will be available at:
- API: http://localhost:5001
- Dashboard: http://localhost:8501

## Local Development Setup

1. Create and activate a virtual environment:
```bash
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Set up the database:
```bash
# Start PostgreSQL service
createdb email_assistant
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. Start the services:
```bash
chmod +x start.sh
./start.sh
```

## Project Structure

```
AiMail/
├── src/
│   ├── api/            # Flask API server
│   ├── dashboard/      # Streamlit dashboard
│   ├── email/          # Email processing logic
│   ├── database/       # Database models and migrations
│   └── utils/          # Utility functions
├── docker/             # Docker configuration files
├── tests/              # Test cases
├── .env.example        # Environment variables template
├── docker-compose.yml  # Docker services configuration
├── requirements.txt    # Python dependencies
└── start.sh           # Local development startup script
```

## API Endpoints

- `GET /stats` - Get email processing statistics
- `POST /process` - Trigger email processing
- `POST /control/start` - Start email processing service
- `POST /control/stop` - Stop email processing service

## Contributing

Please refer to [CONTRIBUTING.md](CONTRIBUTING.md) for detailed information about:
- Development environment setup
- Coding standards
- Pull request process
- Testing guidelines

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

For support, please:
1. Check the [CONTRIBUTING.md](CONTRIBUTING.md) for common issues
2. Open an issue on GitHub
3. Contact the maintainers