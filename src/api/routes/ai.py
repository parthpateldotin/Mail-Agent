from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, List

from src.api.dependencies.auth import get_current_user
from src.models.user import User
from src.models.ai import (
    EmailAnalysisRequest,
    EmailImprovementRequest,
    EmailGenerationRequest,
    EmailToneRequest,
    EmailSentimentRequest,
)
from src.services.ai import AIService
from src.core.logging import get_logger

router = APIRouter()
logger = get_logger(__name__)


@router.post("/analyze", response_model=Dict)
async def analyze_text(
    request: EmailAnalysisRequest,
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Analyze email text for various metrics."""
    try:
        analysis = await AIService.analyze_email(request.content)
        return analysis
    except Exception as e:
        logger.error(f"Email analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email analysis failed",
        )


@router.post("/improve", response_model=Dict)
async def improve_text(
    request: EmailImprovementRequest,
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Get suggestions to improve email content."""
    try:
        suggestions = await AIService.improve_email(
            content=request.content,
            tone=request.tone,
            style=request.style,
        )
        return suggestions
    except Exception as e:
        logger.error(f"Email improvement failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email improvement failed",
        )


@router.post("/generate", response_model=Dict)
async def generate_email(
    request: EmailGenerationRequest,
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Generate email content based on prompts."""
    try:
        content = await AIService.generate_email(
            prompt=request.prompt,
            tone=request.tone,
            style=request.style,
            length=request.length,
        )
        return {"content": content}
    except Exception as e:
        logger.error(f"Email generation failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email generation failed",
        )


@router.post("/tone", response_model=Dict)
async def adjust_tone(
    request: EmailToneRequest,
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Adjust email tone while preserving content."""
    try:
        adjusted_content = await AIService.adjust_tone(
            content=request.content,
            target_tone=request.target_tone,
        )
        return {"content": adjusted_content}
    except Exception as e:
        logger.error(f"Tone adjustment failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Tone adjustment failed",
        )


@router.post("/sentiment", response_model=Dict)
async def analyze_sentiment(
    request: EmailSentimentRequest,
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Analyze email sentiment and emotional impact."""
    try:
        sentiment = await AIService.analyze_sentiment(request.content)
        return sentiment
    except Exception as e:
        logger.error(f"Sentiment analysis failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sentiment analysis failed",
        )


@router.post("/summarize", response_model=Dict)
async def summarize_email(
    request: EmailAnalysisRequest,
    current_user: User = Depends(get_current_user),
) -> Dict:
    """Generate a concise summary of email content."""
    try:
        summary = await AIService.summarize_email(request.content)
        return {"summary": summary}
    except Exception as e:
        logger.error(f"Email summarization failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email summarization failed",
        ) 