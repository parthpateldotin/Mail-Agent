import enum
from sqlalchemy import Column, Integer, String, DateTime, Text, Enum, ForeignKey
from sqlalchemy.sql import func
from src.database.database_config import Base

class MessageDirection(str, enum.Enum):
    """
    Enum to represent message direction 
    for type-safe message tracking
    """
    INCOMING = 'incoming'
    OUTGOING = 'outgoing'

    def __str__(self):
        return self.value.lower()

    def _missing_(cls, value):
        if isinstance(value, str):
            value = value.lower()
            for member in cls:
                if member.value == value:
                    return member
        return None

class ConversationMessage(Base):
    """
    SQLAlchemy model for tracking conversation messages
    
    Responsibilities:
    - Store detailed message information
    - Support comprehensive conversation history
    - Provide efficient querying capabilities
    """
    __tablename__ = 'conversation_messages'
    
    id = Column(Integer, primary_key=True, index=True)
    sender_email = Column(String(255), nullable=False, index=True)
    recipient_email = Column(String(255), nullable=True, index=True)
    message_id = Column(String(255), unique=True, nullable=False)
    thread_id = Column(String(255), nullable=True, index=True)
    subject = Column(String(500), nullable=True)
    body = Column(Text, nullable=False)
    direction = Column(Enum(MessageDirection), nullable=False)
    
    # Automatic timestamp tracking
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    def __repr__(self):
        return f"<ConversationMessage(sender={self.sender_email}, subject={self.subject})>"