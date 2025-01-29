import logging
from datetime import datetime
from src.email.services.email_service import EmailService
from src.email.services.ai_service import AIService
from src.email.services.admin_service import AdminService
from src.database.models.conversation_messages import ConversationMessage, MessageDirection
from src.database.database_config import SessionLocal
import re
import threading
from queue import Queue
import hashlib

class EmailProcessor:
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.email_service = EmailService(config)
        self.ai_service = AIService(config)
        self.admin_service = AdminService(config)
        self.processing_queue = Queue()
        self.is_processing = False
    
    def start_processing(self):
        """Start the email processing thread"""
        if not self.is_processing:
            self.is_processing = True
            processing_thread = threading.Thread(target=self._process_queue)
            processing_thread.daemon = True
            processing_thread.start()
    
    def stop_processing(self):
        """Stop the email processing thread"""
        self.is_processing = False
    
    def _process_queue(self):
        """Process emails from the queue"""
        while self.is_processing:
            try:
                if not self.processing_queue.empty():
                    email_data = self.processing_queue.get()
                    self._process_single_email(email_data)
                    self.processing_queue.task_done()
            except Exception as e:
                self.logger.error(f"Error processing email queue: {e}")
    
    def _generate_message_id(self, email_data):
        """Generate a unique message ID for the email"""
        components = [
            str(email_data['from']),
            str(email_data['subject']),
            str(email_data['timestamp']),
            str(email_data['body'][:100])  # Use first 100 chars of body for hash
        ]
        return hashlib.md5(''.join(components).encode()).hexdigest()

    def _process_single_email(self, email_data):
        """Process a single email with error handling and retries"""
        try:
            db = SessionLocal()
            
            # Check if email is from admin
            if email_data['from'] == self.config.ADMIN_EMAIL:
                self.admin_service.process_admin_command(email_data)
                return
            
            # Generate message ID
            message_id = self._generate_message_id(email_data)
            
            # Store incoming message
            incoming_message = ConversationMessage(
                sender_email=email_data['from'],
                subject=email_data['subject'],
                body=email_data['body'],
                direction=MessageDirection.INCOMING,
                created_at=email_data['timestamp'],
                message_id=message_id
            )
            db.add(incoming_message)
            db.commit()
            
            # Generate AI response
            prompt = self._create_prompt(email_data, db)
            ai_response = self.ai_service.generate_response(prompt)
            
            # Generate message ID for response
            response_message_id = self._generate_message_id({
                'from': self.config.EMAIL_SERVICE_USERNAME,
                'subject': f"Re: {email_data['subject']}",
                'timestamp': datetime.now(),
                'body': ai_response
            })
            
            # Store AI response
            outgoing_message = ConversationMessage(
                sender_email=self.config.EMAIL_SERVICE_USERNAME,
                recipient_email=email_data['from'],
                subject=f"Re: {email_data['subject']}",
                body=ai_response,
                direction=MessageDirection.OUTGOING,
                thread_id=incoming_message.id,
                created_at=datetime.now(),
                message_id=response_message_id
            )
            db.add(outgoing_message)
            db.commit()
            
            # Send response email
            self.email_service.send_email(
                to_email=email_data['from'],
                subject=f"Re: {email_data['subject']}",
                body=ai_response
            )
            
            self.logger.info(f"Successfully processed email from {email_data['from']}")
            
        except Exception as e:
            self.logger.error(f"Error processing email: {e}")
            # Notify admin of processing error
            self._notify_admin_of_error(email_data, str(e))
        finally:
            db.close()
    
    def _create_prompt(self, email_data, db):
        """Create a context-aware prompt for the AI"""
        # Get conversation history
        history = (
            db.query(ConversationMessage)
            .filter(
                (ConversationMessage.sender_email == email_data['from']) |
                (ConversationMessage.recipient_email == email_data['from'])
            )
            .order_by(ConversationMessage.created_at.desc())
            .limit(5)
            .all()
        )
        
        # Build prompt with context
        prompt = f"""From: {email_data['from']}
Subject: {email_data['subject']}
Body: {email_data['body']}

Previous Conversation:
"""
        
        for msg in reversed(history):
            prompt += f"{'User' if msg.direction == MessageDirection.INCOMING else 'Assistant'}: {msg.body}\n"
        
        return prompt
    
    def _notify_admin_of_error(self, email_data, error_message):
        """Notify admin of processing errors"""
        try:
            error_report = f"""
Email Processing Error
=====================
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

Failed Email Details:
- From: {email_data['from']}
- Subject: {email_data['subject']}
- Timestamp: {email_data['timestamp']}

Error:
{error_message}
"""
            self.email_service.send_email(
                to_email=self.config.ADMIN_EMAIL,
                subject=f"Email Processing Error - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                body=error_report
            )
        except Exception as e:
            self.logger.error(f"Error notifying admin: {e}")
    
    def process_emails(self):
        """Main method to fetch and queue emails for processing"""
        try:
            # Ensure processing thread is running
            self.start_processing()
            
            # Fetch new emails
            unread_emails = self.email_service.fetch_unread_emails()
            
            # Queue emails for processing
            for email_data in unread_emails:
                self.processing_queue.put(email_data)
            
            if unread_emails:
                self.logger.info(f"Queued {len(unread_emails)} emails for processing")
            
            return True
        except Exception as e:
            self.logger.error(f"Error in email processing main loop: {e}")
            return False 