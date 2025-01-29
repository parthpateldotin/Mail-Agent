import os
import time
import logging
from datetime import datetime
import sys

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config.config import Config
from src.email.services.email_service import EmailService
from src.email.services.ai_service import AIService
import smtplib
import imaplib
import email
from email.mime.text import MIMEText

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_email_connection():
    """Test basic email server connectivity"""
    logger.info("Testing email server connectivity...")
    
    config = Config()
    email_service = EmailService(config)
    
    try:
        # Test IMAP connection
        logger.info("Testing IMAP connection...")
        imap = email_service.connect_imap()
        imap.select('inbox')
        imap.close()
        imap.logout()
        logger.info("✓ IMAP connection successful")
        
        # Test SMTP connection
        logger.info("Testing SMTP connection...")
        test_subject = f"Test Email - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        email_service.send_email(
            to_email=config.EMAIL_SERVICE_USERNAME,  # Send to self
            subject=test_subject,
            body="This is a test email to verify SMTP functionality."
        )
        logger.info("✓ SMTP connection successful")
        
        return True
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return False

def test_ai_service():
    """Test AI service response generation"""
    logger.info("Testing AI service...")
    
    config = Config()
    ai_service = AIService(config)
    
    try:
        test_prompt = "From: test@example.com, Subject: Test Email, Body: Can you help me with Python programming?"
        response = ai_service.generate_response(test_prompt)
        
        if response and len(response) > 0:
            logger.info("✓ AI service response generated successfully")
            logger.info(f"Sample response: {response[:100]}...")
            return True
        else:
            logger.error("AI service returned empty response")
            return False
    except Exception as e:
        logger.error(f"AI service test failed: {str(e)}")
        return False

def test_full_flow():
    """Test the complete email processing flow"""
    logger.info("Testing complete email processing flow...")
    
    config = Config()
    email_service = EmailService(config)
    
    try:
        # Step 1: Send a test email
        test_subject = f"Test Flow - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        test_body = "Please help me understand how to use Python's datetime module."
        
        logger.info("1. Sending test email...")
        email_service.send_email(
            to_email=config.EMAIL_SERVICE_USERNAME,
            subject=test_subject,
            body=test_body
        )
        logger.info("✓ Test email sent")
        
        # Step 2: Wait for processing
        logger.info("2. Waiting for email processing (30 seconds)...")
        time.sleep(30)  # Give time for email to be received and processed
        
        # Step 3: Check for response
        logger.info("3. Checking for AI response...")
        response_found = False
        max_attempts = 5
        
        for attempt in range(max_attempts):
            try:
                mail = email_service.connect_imap()
                mail.select('inbox')
                
                # Search for response email
                _, search_data = mail.search(None, f'SUBJECT "Re: {test_subject}"')
                
                if search_data[0]:
                    response_found = True
                    logger.info("✓ Response email found")
                    
                    # Get the latest response
                    latest_email_id = search_data[0].split()[-1]
                    _, data = mail.fetch(latest_email_id, '(RFC822)')
                    email_body = email.message_from_bytes(data[0][1])
                    
                    logger.info("=== Response Details ===")
                    logger.info(f"Subject: {email_body['subject']}")
                    logger.info(f"From: {email_body['from']}")
                    logger.info("======================")
                    break
                
                if not response_found:
                    logger.info(f"No response yet, attempt {attempt + 1}/{max_attempts}")
                    time.sleep(10)
                
                mail.close()
                mail.logout()
                
            except Exception as e:
                logger.error(f"Error checking for response: {str(e)}")
        
        if response_found:
            logger.info("✓ Full flow test completed successfully")
            return True
        else:
            logger.error("× No response received after maximum attempts")
            return False
            
    except Exception as e:
        logger.error(f"Full flow test failed: {str(e)}")
        return False

def main():
    """Run all tests"""
    logger.info("=== Starting Email Assistant Flow Tests ===")
    
    # Test email connectivity
    if not test_email_connection():
        logger.error("Email connection test failed. Stopping tests.")
        return
    
    # Test AI service
    if not test_ai_service():
        logger.error("AI service test failed. Stopping tests.")
        return
    
    # Test full flow
    test_full_flow()
    
    logger.info("=== Test Suite Completed ===")

if __name__ == "__main__":
    main() 