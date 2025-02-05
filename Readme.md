# AiMail - AI-Powered Email Client

AiMail is a modern email client that leverages artificial intelligence to enhance your email experience. Built with React, TypeScript, and Material-UI for the frontend, and Python FastAPI for the backend.

## Features

- 📧 Smart email composition with AI suggestions
- 📊 Email analytics and sentiment analysis
- 🗂️ Intelligent email categorization
- ⭐ Priority inbox with smart filtering
- 📅 Email scheduling and reminders
- 🤖 AI-powered auto-responses
- 📎 File attachment support
- 🔍 Advanced search capabilities
- 🎨 Modern and responsive UI

## Tech Stack

### Frontend
- React 18
- TypeScript
- Material-UI (MUI)
- React Router
- Axios
- React Query

### Backend
- Python 3.9+
- FastAPI
- SQLAlchemy
- PostgreSQL
- Redis
- OpenAI API

## Getting Started

### Prerequisites
- Node.js 16+
- Python 3.9+
- PostgreSQL
- Redis

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/aimail.git
cd aimail
```

2. Install frontend dependencies:
```bash
cd frontend
npm install
```

3. Install backend dependencies:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
```

4. Set up environment variables:
```bash
# Backend (.env)
cp .env.example .env
# Edit .env with your configuration

# Frontend (.env)
cp .env.example .env
# Edit .env with your configuration
```

5. Initialize the database:
```bash
cd backend
python -m src.scripts.init-db
```

### Running the Application

1. Start the backend server:
```bash
cd backend
uvicorn src.main:app --reload
```

2. Start the frontend development server:
```bash
cd frontend
npm start
```

The application will be available at http://localhost:3000

## Project Structure

```
aimail/
├── frontend/           # React frontend application
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── pages/      # Page components
│   │   ├── services/   # API services
│   │   ├── hooks/      # Custom React hooks
│   │   └── utils/      # Utility functions
│   └── public/         # Static assets
├── backend/           # FastAPI backend application
│   ├── src/
│   │   ├── api/       # API routes and endpoints
│   │   ├── core/      # Core functionality
│   │   ├── models/    # Database models
│   │   ├── services/  # Business logic
│   │   └── utils/     # Utility functions
│   └── tests/         # Backend tests
└── docs/             # Documentation
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the AI capabilities
- Material-UI for the beautiful components
- FastAPI for the efficient backend framework