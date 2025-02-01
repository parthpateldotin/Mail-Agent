import os
import time
import logging
from datetime import datetime
import sys
import asyncio

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config.config import Config
from src.email.services.email_service import EmailService
from src.email.services.ai_service import AIService
from src.utils.event_loop import EventLoopManager
import smtplib
import imaplib
import email
from email.mime.text import MIMEText

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

async def test_email_connection():
    """Test basic email server connectivity"""
    logger.info("Testing email server connectivity...")
    
    config = Config()
    email_service = EmailService(config)
    
    try:
        # Test connection (includes both IMAP and SMTP)
        logger.info("Testing email service connection...")
        connected = await email_service.connect()
        
        if not connected:
            logger.error("Failed to connect to email servers")
            return False
            
        # Check health status
        health = await email_service.check_health()
        if not health.status:
            logger.error(f"Health check failed: {health.error}")
            return False
            
        logger.info("✓ IMAP connection successful") if health.imap_connected else logger.warning("× IMAP connection failed")
        logger.info("✓ SMTP connection successful") if health.smtp_connected else logger.warning("× SMTP connection failed")
        
        # Test sending email if SMTP is connected
        if health.smtp_connected:
            try:
                test_subject = f"Test Email - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
                await email_service.send_email(
                    to_email=config.EMAIL_SERVICE_USERNAME,  # Send to self
                    subject=test_subject,
                    body="This is a test email to verify SMTP functionality."
                )
                logger.info("✓ Test email sent successfully")
            except Exception as e:
                logger.error(f"Failed to send test email: {e}")
                return False
        
        # Cleanup
        await email_service.disconnect()
        return True
        
    except Exception as e:
        logger.error(f"Connection test failed: {str(e)}")
        return False

def run_test_email_connection():
    """Synchronous wrapper for test_email_connection"""
    loop = EventLoopManager.get_instance().get_loop()
    return loop.run_until_complete(test_email_connection())

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

async def test_full_flow():
    """Test the complete email processing flow"""
    logger.info("Testing complete email processing flow...")
    
    config = Config()
    email_service = EmailService(config)
    ai_service = AIService(config)
    
    try:
        # Step 1: Initialize services
        logger.info("1. Initializing services...")
        
        # Start AI service
        if not await ai_service.start():
            raise Exception("Failed to start AI service")
        logger.info("✓ AI service initialized")
        
        # Connect email service
        if not await email_service.connect():
            raise Exception("Failed to connect email service")
        logger.info("✓ Email service connected")
        
        # Step 2: Send test email
        test_subject = f"Test Flow - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}"
        test_body = "Please help me understand how to use Python's datetime module."
        
        logger.info("2. Sending test email...")
        if not await email_service.send_email(
            to_email=config.EMAIL_SERVICE_USERNAME,
            subject=test_subject,
            body=test_body
        ):
            raise Exception("Failed to send test email")
        logger.info("✓ Test email sent")
        
        # Step 3: Wait for processing
        logger.info("3. Waiting for email processing (30 seconds)...")
        await asyncio.sleep(30)  # Give time for email to be received and processed
        
        # Step 4: Check for response
        logger.info("4. Checking for AI response...")
        response_found = False
        max_attempts = 5
        
        for attempt in range(max_attempts):
            try:
                if not email_service.imap:
                    await email_service.connect()
                
                email_service.imap.select('inbox')
                _, search_data = email_service.imap.search(None, f'SUBJECT "Re: {test_subject}"')
                
                if search_data[0]:
                    response_found = True
                    logger.info("✓ Response email found")
                    
                    # Get the latest response
                    latest_email_id = search_data[0].split()[-1]
                    _, data = email_service.imap.fetch(latest_email_id, '(RFC822)')
                    email_body = email.message_from_bytes(data[0][1])
                    
                    logger.info("=== Response Details ===")
                    logger.info(f"Subject: {email_body['subject']}")
                    logger.info(f"From: {email_body['from']}")
                    logger.info("======================")
                    break
                
                if not response_found:
                    logger.info(f"No response yet, attempt {attempt + 1}/{max_attempts}")
                    await asyncio.sleep(10)
                
            except Exception as e:
                logger.error(f"Error checking for response: {str(e)}")
                if attempt < max_attempts - 1:
                    await asyncio.sleep(5)
                    continue
                else:
                    raise
        
        # Cleanup
        await email_service.disconnect()
        await ai_service.stop()
        
        if response_found:
            logger.info("✓ Full flow test completed successfully")
            return True
        else:
            logger.error("× No response received after maximum attempts")
            return False
            
    except Exception as e:
        logger.error(f"Full flow test failed: {str(e)}")
        # Ensure cleanup
        try:
            await email_service.disconnect()
            await ai_service.stop()
        except:
            pass
        return False

def run_test_full_flow():
    """Synchronous wrapper for test_full_flow"""
    loop = EventLoopManager.get_instance().get_loop()
    return loop.run_until_complete(test_full_flow())

def main():
    """Run all tests"""
    logger.info("=== Starting Email Assistant Flow Tests ===")
    
    # Test email connectivity
    if not run_test_email_connection():
        logger.error("Email connection test failed. Stopping tests.")
        return
    
    # Test AI service
    if not test_ai_service():
        logger.error("AI service test failed. Stopping tests.")
        return
    
    # Test full flow
    run_test_full_flow()
    
    logger.info("=== Test Suite Completed ===")

if __name__ == "__main__":
    main() 