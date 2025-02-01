from sqlalchemy.orm import Session
from sqlalchemy import desc
from database_config import SessionLocal
from models.conversation_messages import ConversationMessage, MessageDirection
from datetime import datetime, timedelta
import logging
import hashlib

class ConversationService:
    """
    Manages conversation tracking and retrieval
    
    Key Responsibilities:
    - Store conversation messages
    - Retrieve conversation history
    - Generate unique message identifiers
    """
    
    def __init__(self, db_session: Session = None):
        """
        Initialize conversation service
        
        Args:
            db_session (Session, optional): Database session. 
            Defaults to creating a new session.
        """
        self.db = db_session or SessionLocal()
        self.logger = logging.getLogger(__name__)
    
    def generate_message_id(self, email_details: dict) -> str:
        """
        Generate a unique message identifier
        
        Args:
            email_details (dict): Email metadata
        
        Returns:
            str: Unique message identifier
        """
        # Create a hash based on multiple email attributes
        id_components = [
            email_details.get('from', ''),
            email_details.get('subject', ''),
            email_details.get('timestamp', str(datetime.now())),
            email_details.get('body', '')
        ]
        return hashlib.md5(''.join(id_components).encode()).hexdigest()
    
    def add_message(
        self, 
        sender_email: str, 
        subject: str, 
        body: str, 
        direction: MessageDirection = MessageDirection.INCOMING,
        message_id: str = None
    ) -> ConversationMessage:
        """
        Add a new message to conversation history
        
        Args:
            sender_email (str): Sender's email address
            subject (str): Email subject
            body (str): Email body
            direction (MessageDirection): Message direction
            message_id (str, optional): Custom message ID
        
        Returns:
            ConversationMessage: Stored message instance
        """
        try:
            # Generate message ID if not provided
            message_id = message_id or self.generate_message_id({
                'from': sender_email,
                'subject': subject,
                'body': body
            })
            
            # Create message instance
            message = ConversationMessage(
                sender_email=sender_email,
                message_id=message_id,
                subject=subject,
                body=body,
                direction=direction
            )
            
            # Persist to database
            self.db.add(message)
            self.db.commit()
            
            return message
        
        except Exception as e:
            self.logger.error(f"Error adding message: {e}")
            self.db.rollback()
            raise
    
    def get_conversation_history(
        self, 
        sender_email: str, 
        hours: int = 168  # 1 week default
    ) -> list:
        """
        Retrieve conversation history for a sender
        
        Args:
            sender_email (str): Sender's email address
            hours (int): Hours of history to retrieve
        
        Returns:
            list: Conversation history messages
        """
        cutoff_time = datetime.now() - timedelta(hours=hours)
        
        return (
            self.db.query(ConversationMessage)
            .filter(
                ConversationMessage.sender_email == sender_email,
                ConversationMessage.created_at >= cutoff_time
            )
            .order_by(desc(ConversationMessage.created_at))
            .limit(50)  # Limit to prevent excessive context
            .all()
        )
    
    def format_conversation_context(
        self, 
        sender_email: str, 
        hours: int = 168
    ) -> str:
        """
        Format conversation history for AI context
        
        Args:
            sender_email (str): Sender's email address
            hours (int): Hours of history to retrieve
        
        Returns:
            str: Formatted conversation context
        """
        conversations = self.get_conversation_history(sender_email, hours)
        
        if not conversations:
            return "No previous conversation history available."
        
        context = "Conversation History:\n"
        for msg in conversations:
            direction = "AI" if msg.direction == MessageDirection.OUTGOING else "Sender"
            context += (
                f"{direction} [{msg.created_at}] - "
                f"Subject: {msg.subject}\n"
                f"Message: {msg.body[:500]}...\n\n"
            )
        
        return context