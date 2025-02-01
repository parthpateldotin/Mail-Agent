from typing import Optional
import uuid

from sqlalchemy import String, Boolean, ForeignKey, Text, Integer, Float, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.database.base import Base

class AIModel(Base):
    """AI model configuration and versioning."""
    __tablename__ = "ai_models"

    name: Mapped[str] = mapped_column(String(100))
    provider: Mapped[str] = mapped_column(String(50))  # e.g., "openai", "anthropic"
    model_id: Mapped[str] = mapped_column(String(100))  # e.g., "gpt-4", "gpt-3.5-turbo"
    version: Mapped[str] = mapped_column(String(50))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    config: Mapped[dict] = mapped_column(JSON)  # Model-specific configuration
    usage_count: Mapped[int] = mapped_column(Integer, default=0)
    average_latency: Mapped[float] = mapped_column(Float, default=0.0)

class AITemplate(Base):
    """Templates for AI-generated responses."""
    __tablename__ = "ai_templates"

    name: Mapped[str] = mapped_column(String(100))
    description: Mapped[str] = mapped_column(Text)
    prompt_template: Mapped[str] = mapped_column(Text)
    model_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_models.id"))
    category: Mapped[str] = mapped_column(String(50))  # e.g., "email_reply", "summary"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    parameters: Mapped[dict] = mapped_column(JSON)  # Template parameters
    version: Mapped[int] = mapped_column(Integer, default=1)

    # Relationships
    model: Mapped["AIModel"] = relationship()

class AIAnalysis(Base):
    """AI analysis results for emails."""
    __tablename__ = "ai_analysis"

    email_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"))
    model_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_models.id"))
    analysis_type: Mapped[str] = mapped_column(String(50))  # e.g., "sentiment", "priority"
    result: Mapped[dict] = mapped_column(JSON)
    confidence_score: Mapped[float] = mapped_column(Float)
    processing_time: Mapped[float]  # in seconds
    token_count: Mapped[int]
    is_cached: Mapped[bool] = mapped_column(Boolean, default=False)

    # Relationships
    email: Mapped["Email"] = relationship()
    model: Mapped["AIModel"] = relationship()

class AIResponseSuggestion(Base):
    """AI-generated response suggestions."""
    __tablename__ = "ai_response_suggestions"

    email_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("emails.id", ondelete="CASCADE"))
    model_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_models.id"))
    template_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("ai_templates.id"))
    content: Mapped[str] = mapped_column(Text)
    tone: Mapped[str] = mapped_column(String(50))  # e.g., "professional", "casual"
    language: Mapped[str] = mapped_column(String(10))
    confidence_score: Mapped[float] = mapped_column(Float)
    is_selected: Mapped[bool] = mapped_column(Boolean, default=False)
    feedback_score: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    
    # Relationships
    email: Mapped["Email"] = relationship()
    model: Mapped["AIModel"] = relationship()
    template: Mapped["AITemplate"] = relationship() 