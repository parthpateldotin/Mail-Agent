import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    def __init__(self):
        # OpenAI Configuration
        self.OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
        self.OPENAI_API_ENDPOINT = "https://api.openai.com/v1"
        self.OPENAI_MODEL = "gpt-4"
        self.AI_MODEL_NAME = "gpt-4"
        self.AI_TEMPERATURE = 0.7
        self.AI_MAX_TOKENS = 150
        self.AI_TOP_P = 1.0
        self.AI_FREQUENCY_PENALTY = 0.0
        self.AI_PRESENCE_PENALTY = 0.0

        # Email Configuration
        self.EMAIL_SERVICE_USERNAME = os.getenv('EMAIL_SERVICE_USERNAME')
        self.EMAIL_SERVICE_PASSWORD = os.getenv('EMAIL_SERVICE_PASSWORD')
        self.IMAP_SERVER = os.getenv('IMAP_SERVER', 'imap.gmail.com')
        self.IMAP_PORT = int(os.getenv('IMAP_PORT', '993'))
        self.SMTP_SERVER = os.getenv('SMTP_SERVER', 'smtp.gmail.com')
        self.SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
        self.SMTP_USE_TLS = os.getenv('SMTP_USE_TLS', 'True').lower() == 'true'

        # Admin Configuration
        self.ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
        
        # API Configuration
        self.API_HOST = os.getenv('API_HOST', '127.0.0.1')
        self.API_PORT = int(os.getenv('API_PORT', '5001'))
        self.API_DEBUG = os.getenv('API_DEBUG', 'True').lower() == 'true'
        
        # Dashboard Configuration
        self.DASHBOARD_HOST = os.getenv('DASHBOARD_HOST', '127.0.0.1')
        self.DASHBOARD_PORT = int(os.getenv('DASHBOARD_PORT', '8501'))
        
        # Logging Configuration
        self.LOG_LEVEL = os.getenv('LOG_LEVEL', 'INFO')
        self.LOG_FORMAT = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        
        # Security Configuration
        self.SSL_VERIFY = os.getenv('SSL_VERIFY', 'True').lower() == 'true'
        self.SSL_CERT_PATH = os.getenv('SSL_CERT_PATH', None)

    # Email Service Configuration
    EMAIL_SERVICE_USERNAME = os.getenv('EMAIL_SERVICE_USERNAME')
    EMAIL_SERVICE_PASSWORD = os.getenv('EMAIL_SERVICE_PASSWORD')
    
    # Server Configuration
    IMAP_SERVER = os.getenv('IMAP_SERVER')
    IMAP_PORT = int(os.getenv('IMAP_PORT', '993'))
    SMTP_SERVER = os.getenv('SMTP_SERVER')
    SMTP_PORT = int(os.getenv('SMTP_PORT', '587'))
    USE_SSL = os.getenv('USE_SSL', 'true').lower() == 'true'
    USE_TLS = os.getenv('USE_TLS', 'true').lower() == 'true'
    
    # Admin Configuration
    ADMIN_EMAIL = os.getenv('ADMIN_EMAIL')
    DAILY_SUMMARY_TIME = os.getenv('DAILY_SUMMARY_TIME', '23:00')
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
    AI_MODEL = os.getenv('AI_MODEL', 'gpt-3.5-turbo')
    AI_PROMPT = os.getenv('AI_PROMPT', 'You are a helpful email assistant.')
    
    # Flask Configuration
    FLASK_ENV = os.getenv('FLASK_ENV', 'development')
    SECRET_KEY = os.getenv('SECRET_KEY', 'secret_key')
    DEBUG = os.getenv('FLASK_DEBUG', 'False').lower() == 'true'
    
    # Database Configuration
    SQLALCHEMY_DATABASE_URI = os.getenv('SQLALCHEMY_DATABASE_URI', os.getenv('DATABASE_URL', 'sqlite:///email_assistant.db'))
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    def update_ai_prompt(self, new_prompt):
        """Update the AI prompt and save to environment"""
        self.AI_PROMPT = new_prompt
        with open('.env', 'r') as file:
            lines = file.readlines()
        
        prompt_updated = False
        with open('.env', 'w') as file:
            for line in lines:
                if line.startswith('AI_PROMPT='):
                    file.write(f'AI_PROMPT="{new_prompt}"\n')
                    prompt_updated = True
                else:
                    file.write(line)
            
            if not prompt_updated:
                file.write(f'\nAI_PROMPT="{new_prompt}"\n')