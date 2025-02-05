"""AI feature endpoints."""
from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.api.deps import get_current_user, get_db
from src.core.config import settings
from src.models.user import User
from src.schemas.email import EmailBase, EmailThread
from src.services.ai.openai_service import (
    EmailAnalysis,
    ResponseSuggestion,
    analyze_email_content,
    generate_email_response,
    summarize_email_thread,
    classify_email_priority
)

router = APIRouter()


@router.post(
    "/analyze",
    response_model=EmailAnalysis,
    status_code=status.HTTP_200_OK,
    tags=["AI Features"],
    summary="Analyze email content",
    description="""
    Analyze email content using AI to extract:
    * Sentiment analysis
    * Priority level
    * Key points
    * Suggested actions
    * Category classification
    
    Rate limit: 10 requests per minute
    """
)
async def analyze_email(
    email: EmailBase,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> EmailAnalysis:
    """Analyze email content."""
    if not settings.AI_ENABLED or not settings.AI_EMAIL_ANALYSIS:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI analysis is currently disabled"
        )
    
    try:
        return await analyze_email_content(
            subject=email.subject,
            content=email.content,
            sender=email.sender,
            importance=email.importance
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing email: {str(e)}"
        )


@router.post(
    "/generate-response",
    response_model=ResponseSuggestion,
    status_code=status.HTTP_200_OK,
    tags=["AI Features"],
    summary="Generate email response",
    description="""
    Generate an AI-powered response to an email with:
    * Subject line
    * Response content
    * Appropriate tone
    * Formality level
    
    Rate limit: 10 requests per minute
    """
)
async def generate_response(
    email: Dict,
    tone: str = "professional",
    length: str = "medium",
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> ResponseSuggestion:
    """Generate email response."""
    if not settings.AI_ENABLED or not settings.AI_RESPONSE_GENERATION:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI response generation is currently disabled"
        )
    
    try:
        return await generate_email_response(
            original_email=email,
            tone=tone,
            length=length
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error generating response: {str(e)}"
        )


@router.post(
    "/summarize-thread",
    response_model=str,
    status_code=status.HTTP_200_OK,
    tags=["AI Features"],
    summary="Summarize email thread",
    description="""
    Generate a concise summary of an email thread focusing on:
    * Main discussion points
    * Decisions made
    * Action items
    * Current status
    
    Rate limit: 10 requests per minute
    """
)
async def summarize_thread(
    thread: EmailThread,
    max_length: int = 150,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> str:
    """Summarize email thread."""
    if not settings.AI_ENABLED or not settings.AI_THREAD_SUMMARIZATION:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI thread summarization is currently disabled"
        )
    
    try:
        return await summarize_email_thread(
            emails=thread.emails,
            max_length=max_length
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error summarizing thread: {str(e)}"
        )


@router.post(
    "/classify-priority",
    response_model=str,
    status_code=status.HTTP_200_OK,
    tags=["AI Features"],
    summary="Classify email priority",
    description="""
    Classify email priority as:
    * URGENT: Requires immediate attention
    * HIGH: Should be addressed within 24 hours
    * MEDIUM: Should be addressed within 48-72 hours
    * LOW: Can be addressed when convenient
    
    Rate limit: 10 requests per minute
    """
)
async def classify_priority(
    email: EmailBase,
    metadata: Dict = None,
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db)
) -> str:
    """Classify email priority."""
    if not settings.AI_ENABLED or not settings.AI_PRIORITY_CLASSIFICATION:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI priority classification is currently disabled"
        )
    
    try:
        return await classify_email_priority(
            subject=email.subject,
            content=email.content,
            sender=email.sender,
            metadata=metadata
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error classifying priority: {str(e)}"
        ) 