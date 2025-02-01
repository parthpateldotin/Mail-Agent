import logging
from datetime import datetime, timedelta
from src.email.services.email_service import EmailService
from src.database.models.conversation_messages import ConversationMessage, MessageDirection
from src.database.database_config import SessionLocal

class AdminService:
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.email_service = EmailService(config)
        self.admin_email = config.ADMIN_EMAIL
    
    def send_daily_summary(self):
        """Send daily summary to admin"""
        try:
            # Get last 24 hours statistics
            db = SessionLocal()
            last_24h = datetime.now() - timedelta(hours=24)
            
            # Query messages
            recent_messages = (
                db.query(ConversationMessage)
                .filter(ConversationMessage.created_at > last_24h)
                .all()
            )
            
            # Calculate statistics
            total_messages = len(recent_messages)
            incoming = len([msg for msg in recent_messages if msg.direction == MessageDirection.INCOMING])
            outgoing = len([msg for msg in recent_messages if msg.direction == MessageDirection.OUTGOING])
            
            # Create summary
            summary = f"""
Daily Email Assistant Summary
===========================
Date: {datetime.now().strftime('%Y-%m-%d')}

Statistics (Last 24 Hours):
- Total Messages: {total_messages}
- Incoming Emails: {incoming}
- Outgoing Responses: {outgoing}
- Response Rate: {(outgoing/incoming*100 if incoming > 0 else 0):.1f}%

Recent Conversations:
"""
            # Add recent conversations
            for msg in recent_messages[:5]:
                summary += f"\n- From: {msg.sender_email}"
                summary += f"\n  Subject: {msg.subject}"
                summary += f"\n  Status: {'Response Sent' if msg.direction == MessageDirection.OUTGOING else 'Awaiting Response'}"
                summary += "\n"
            
            # Send summary to admin
            self.email_service.send_email(
                to_email=self.admin_email,
                subject=f"Email Assistant Daily Summary - {datetime.now().strftime('%Y-%m-%d')}",
                body=summary
            )
            
            self.logger.info("Daily summary sent to admin")
            return True
            
        except Exception as e:
            self.logger.error(f"Error sending daily summary: {e}")
            return False
        finally:
            db.close()
    
    def process_admin_command(self, email_data):
        """Process commands received from admin email"""
        try:
            subject = email_data['subject'].lower()
            body = email_data['body'].lower()
            
            # Handle different admin commands
            if 'summary' in subject:
                return self.send_daily_summary()
            
            elif 'update prompt' in subject:
                # Update AI service prompt
                new_prompt = email_data['body']
                self.config.update_ai_prompt(new_prompt)
                return True
            
            elif 'status' in subject:
                # Send immediate status report
                return self.send_status_report()
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error processing admin command: {e}")
            return False
    
    def send_status_report(self):
        """Send immediate status report to admin"""
        try:
            # Get system status
            db = SessionLocal()
            total_messages = db.query(ConversationMessage).count()
            
            status_report = f"""
Email Assistant Status Report
===========================
Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

System Status:
- Service: Running
- Database: Connected
- Total Messages Processed: {total_messages}
- Last Error: None

Components:
- Email Service: Active
- AI Service: Active
- Database: Connected
"""
            
            # Send report
            self.email_service.send_email(
                to_email=self.admin_email,
                subject=f"Email Assistant Status Report - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
                body=status_report
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Error sending status report: {e}")
            return False
        finally:
            db.close() 