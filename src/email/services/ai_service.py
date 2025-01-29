from openai import OpenAI
import logging
from src.config.config import Config

class AIService:
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Get API key from config
        api_key = getattr(config, 'OPENAI_API_KEY', None)
        if not api_key:
            api_key = config.get('OPENAI_API_KEY')
        
        if not api_key:
            raise ValueError("OpenAI API key not found in configuration")
            
        self.client = OpenAI(api_key=api_key)
    
    def generate_response(self, email_context):
        """
        Generate an AI response to an email
        
        Args:
            email_context (str): Context about the email including sender, subject, and body
            
        Returns:
            str: Generated response
            
        Raises:
            Exception: If there's an error generating the response
        """
        try:
            self.logger.info("Generating AI response...")
            
            # Create system prompt
            system_prompt = """
            You are a helpful email assistant designed to provide concise and professional responses.
            Follow these guidelines:
            1. Keep responses clear and professional
            2. Address the main points of the email
            3. Be helpful but concise
            4. Maintain a friendly tone
            5. Sign off professionally
            """
            
            # Generate response
            response = self.client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Craft a professional email response to this email: {email_context}"}
                ],
                temperature=0.7,
                max_tokens=500
            )
            
            generated_response = response.choices[0].message.content
            
            # Log success (truncated response for logging)
            self.logger.info(f"Response generated successfully. First 100 chars: {generated_response[:100]}...")
            
            return generated_response
            
        except Exception as e:
            self.logger.error(f"Error generating AI response: {str(e)}")
            raise