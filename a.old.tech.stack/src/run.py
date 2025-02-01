import asyncio
import logging
import os
from typing import Dict, Any
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv

# Import our services
from email.services.email_service import EmailServiceManager
from email.services.ai_service import AIServiceManager
from dashboard.services.monitoring import MonitoringManager

class AiMailApplication:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.email_manager = EmailServiceManager()
        self.ai_manager = AIServiceManager()
        self.monitoring_manager = MonitoringManager()
        
        # Load environment variables
        load_dotenv()
        
        # Verify required environment variables
        self._verify_environment()
        
        # Setup logging
        self._setup_logging()

    def _verify_environment(self):
        """Verify all required environment variables are set"""
        required_vars = [
            "OPENAI_API_KEY",
            # Add other required environment variables here
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            raise EnvironmentError(
                f"Missing required environment variables: {', '.join(missing_vars)}"
            )

    def _setup_logging(self):
        """Setup logging configuration"""
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.StreamHandler(),
                logging.FileHandler(
                    log_dir / f"aimail_{datetime.now().strftime('%Y%m%d_%H%M%S')}.log"
                )
            ]
        )

    async def start(self):
        """Start all services"""
        try:
            self.logger.info("Starting AiMail Application...")
            
            # Start services in parallel
            await asyncio.gather(
                self.email_manager.start_all(),
                self.ai_manager.start(),
                self.monitoring_manager.start()
            )
            
            self.logger.info("All services started successfully")
            
            # Keep the application running
            while True:
                await asyncio.sleep(1)
                
        except Exception as e:
            self.logger.error(f"Error starting application: {str(e)}")
            raise
        finally:
            await self.shutdown()

    async def shutdown(self):
        """Shutdown all services gracefully"""
        self.logger.info("Shutting down AiMail Application...")
        try:
            await self.ai_manager.stop()
            # Add other service shutdown calls here
        except Exception as e:
            self.logger.error(f"Error during shutdown: {str(e)}")

    async def process_email(self, email_content: str) -> Dict[str, Any]:
        """Process a single email through the system"""
        try:
            # Get AI analysis and response
            ai_result = await self.ai_manager.process_email(email_content)
            
            # Create processed email object
            processed_email = {
                "content": email_content,
                "analysis": ai_result["analysis"],
                "response": ai_result["response"],
                "timestamp": datetime.now().isoformat(),
                "status": "processed",
                "metadata": {
                    "ai_metadata": ai_result["metadata"],
                    "processing_time": 0.0  # Would be calculated in production
                }
            }
            
            return processed_email
            
        except Exception as e:
            self.logger.error(f"Error processing email: {str(e)}")
            raise

def main():
    """Main application entry point"""
    try:
        app = AiMailApplication()
        asyncio.run(app.start())
    except Exception as e:
        logging.error(f"Application error: {str(e)}")
        raise

if __name__ == "__main__":
    main() 