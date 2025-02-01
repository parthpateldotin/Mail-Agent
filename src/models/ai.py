from typing import Optional, List
from pydantic import BaseModel, Field


class EmailAnalysisRequest(BaseModel):
    """Email analysis request model."""
    content: str = Field(..., min_length=1)


class EmailImprovementRequest(BaseModel):
    """Email improvement request model."""
    content: str = Field(..., min_length=1)
    tone: Optional[str] = Field(
        None,
        description="Target tone for improvement (e.g., professional, friendly, formal)",
    )
    style: Optional[str] = Field(
        None,
        description="Target writing style (e.g., concise, detailed, persuasive)",
    )


class EmailGenerationRequest(BaseModel):
    """Email generation request model."""
    prompt: str = Field(..., min_length=1)
    tone: Optional[str] = Field(
        None,
        description="Desired tone for generated email",
    )
    style: Optional[str] = Field(
        None,
        description="Desired writing style for generated email",
    )
    length: Optional[str] = Field(
        None,
        description="Desired length (short, medium, long)",
    )


class EmailToneRequest(BaseModel):
    """Email tone adjustment request model."""
    content: str = Field(..., min_length=1)
    target_tone: str = Field(
        ...,
        description="Target tone for adjustment",
    )


class EmailSentimentRequest(BaseModel):
    """Email sentiment analysis request model."""
    content: str = Field(..., min_length=1)


class AIResponse(BaseModel):
    """Base AI response model."""
    success: bool
    message: str
    data: dict


class EmailAnalysisResponse(AIResponse):
    """Email analysis response model."""
    data: dict = Field(
        ...,
        description="Analysis results including readability, tone, and suggestions",
    )


class EmailImprovementResponse(AIResponse):
    """Email improvement response model."""
    data: dict = Field(
        ...,
        description="Improvement suggestions and revised content",
    )


class EmailGenerationResponse(AIResponse):
    """Email generation response model."""
    data: dict = Field(
        ...,
        description="Generated email content and metadata",
    )


class EmailToneResponse(AIResponse):
    """Email tone adjustment response model."""
    data: dict = Field(
        ...,
        description="Adjusted email content and tone analysis",
    )


class EmailSentimentResponse(AIResponse):
    """Email sentiment analysis response model."""
    data: dict = Field(
        ...,
        description="Sentiment analysis results and emotional impact metrics",
    ) 