import os

class Config:
    def __init__(self):
        # Email Configuration
        self.IMAP_SERVER = "imap.hostinger.com"
        self.IMAP_PORT = 993
        self.SMTP_SERVER = "smtp.hostinger.com"
        self.SMTP_PORT = 465
        self.EMAIL_SERVICE_USERNAME = "ai@deployx.in"
        self.EMAIL_SERVICE_PASSWORD = "Pa55w0rd@2025"
        self.USE_SSL = True
        self.USE_TLS = False
        
        # Database Configuration
        self.SQLALCHEMY_DATABASE_URI = "postgresql://postgres:postgres@localhost:5434/email_assistant"
        self.SQLALCHEMY_TRACK_MODIFICATIONS = False
        
        # AI Configuration
        self.OPENAI_API_KEY = "sk-..."  # Replace with actual key
        self.AI_MODEL_NAME = "gpt-3.5-turbo"
        self.AI_TEMPERATURE = 0.7
        self.AI_MAX_TOKENS = 2000
        self.AI_TOP_P = 1.0
        self.AI_FREQUENCY_PENALTY = 0.0
        self.AI_PRESENCE_PENALTY = 0.0
        self.OPENAI_API_ENDPOINT = os.getenv('OPENAI_API_ENDPOINT', 'https://api.openai.com/v1')
        
        # Logging Configuration
        self.LOG_LEVEL = "DEBUG"
        self.LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
        self.LOG_FILE = "app.log"
        
        # Admin Configuration
        self.ADMIN_EMAIL = "admin@deployx.in"
        
        # Debug Configuration
        self.DEBUG = True
        self.DEBUG_SMTP = True
        self.DEBUG_IMAP = True
        self.DEBUG_AI = True 