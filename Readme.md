# AiMail

AiMail is an intelligent email management system that uses AI to help users manage their emails more efficiently.

## Features

- 📧 Smart email processing and auto-responses
- 🤖 AI-powered email analysis and categorization
- 📅 Automated calendar integration for meeting scheduling
- 🏷️ Intelligent email labeling and organization
- 📊 Email analytics and insights
- 🔒 Secure authentication and authorization

## Tech Stack

### Backend
- FastAPI (Python)
- PostgreSQL
- Redis
- SQLAlchemy
- Alembic for migrations
- OpenAI API integration

### Frontend
- React
- TypeScript
- Material-UI
- Redux Toolkit
- React Router

## Getting Started

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL
- Redis

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/aimail.git
cd aimail
```

2. Set up the backend:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: .\venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env  # Configure your environment variables
```

3. Set up the database:
```bash
alembic upgrade head
python src/scripts/seed.py
```

4. Set up the frontend:
```bash
cd ../frontend
npm install
cp .env.example .env  # Configure your environment variables
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
├── backend/
│   ├── src/
│   │   ├── api/
│   │   ├── core/
│   │   ├── models/
│   │   ├── services/
│   │   └── utils/
│   ├── tests/
│   └── alembic/
└── frontend/
    ├── src/
    │   ├── components/
    │   ├── pages/
    │   ├── services/
    │   └── utils/
    └── public/
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- OpenAI for providing the AI capabilities
- All contributors who have helped shape this project