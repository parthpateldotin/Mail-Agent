import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
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