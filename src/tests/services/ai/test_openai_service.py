"""Tests for OpenAI service."""
import pytest
from unittest.mock import AsyncMock, patch

from src.services.ai.openai_service import (
    EmailAnalysis,
    ResponseSuggestion,
    analyze_email_content,
    generate_email_response,
    summarize_email_thread,
    classify_email_priority
)

# Test data
TEST_EMAIL = {
    "subject": "Project Update Meeting",
    "content": "Hi team, Let's schedule a meeting to discuss project progress. How about tomorrow at 2 PM?",
    "sender": "manager@example.com",
    "importance": "high"
}

TEST_THREAD = [
    TEST_EMAIL,
    {
        "subject": "Re: Project Update Meeting",
        "content": "That works for me. I'll prepare the status report.",
        "sender": "developer@example.com",
        "importance": "medium"
    }
]

@pytest.fixture
def mock_openai_response():
    """Mock OpenAI API response."""
    return AsyncMock(
        choices=[
            AsyncMock(
                message=AsyncMock(
                    content="""
                    Analysis:
                    Sentiment: positive
                    Priority: high
                    Key points:
                    - Meeting request for project update
                    - Proposed time: tomorrow 2 PM
                    - Team collaboration needed
                    Suggested actions:
                    - Confirm meeting time
                    - Prepare project status
                    Category: business
                    """
                )
            )
        ]
    )

@pytest.mark.asyncio
async def test_analyze_email_content(mock_openai_response):
    """Test email content analysis."""
    with patch('src.services.ai.openai_service.client.chat.completions.create', 
               return_value=mock_openai_response):
        result = await analyze_email_content(
            subject=TEST_EMAIL["subject"],
            content=TEST_EMAIL["content"],
            sender=TEST_EMAIL["sender"],
            importance=TEST_EMAIL["importance"]
        )
        
        assert isinstance(result, EmailAnalysis)
        assert result.sentiment in ["positive", "negative", "neutral"]
        assert result.priority in ["high", "medium", "low"]
        assert isinstance(result.key_points, list)
        assert isinstance(result.suggested_actions, list)
        assert result.category in ["business", "personal", "marketing"]

@pytest.mark.asyncio
async def test_generate_email_response(mock_openai_response):
    """Test email response generation."""
    with patch('src.services.ai.openai_service.client.chat.completions.create',
               return_value=mock_openai_response):
        result = await generate_email_response(
            original_email=TEST_EMAIL,
            tone="professional",
            length="medium"
        )
        
        assert isinstance(result, ResponseSuggestion)
        assert result.subject.startswith("Re: ")
        assert len(result.content) > 0
        assert result.tone in ["professional", "casual", "formal"]
        assert result.formality_level in ["professional", "casual", "formal"]

@pytest.mark.asyncio
async def test_summarize_email_thread(mock_openai_response):
    """Test email thread summarization."""
    with patch('src.services.ai.openai_service.client.chat.completions.create',
               return_value=mock_openai_response):
        result = await summarize_email_thread(
            emails=TEST_THREAD,
            max_length=150
        )
        
        assert isinstance(result, str)
        assert len(result.split()) <= 150
        assert "meeting" in result.lower()

@pytest.mark.asyncio
async def test_classify_email_priority(mock_openai_response):
    """Test email priority classification."""
    with patch('src.services.ai.openai_service.client.chat.completions.create',
               return_value=mock_openai_response):
        result = await classify_email_priority(
            subject=TEST_EMAIL["subject"],
            content=TEST_EMAIL["content"],
            sender=TEST_EMAIL["sender"]
        )
        
        assert isinstance(result, str)
        assert result.upper() in ["URGENT", "HIGH", "MEDIUM", "LOW"]

@pytest.mark.asyncio
async def test_analyze_email_with_empty_content():
    """Test email analysis with empty content."""
    with pytest.raises(ValueError):
        await analyze_email_content(
            subject="Test",
            content="",
            sender="test@example.com"
        )

@pytest.mark.asyncio
async def test_generate_response_with_invalid_tone():
    """Test response generation with invalid tone."""
    with pytest.raises(ValueError):
        await generate_email_response(
            original_email=TEST_EMAIL,
            tone="invalid_tone"
        )

@pytest.mark.asyncio
async def test_summarize_thread_with_empty_thread():
    """Test thread summarization with empty thread."""
    with pytest.raises(ValueError):
        await summarize_email_thread(emails=[])

@pytest.mark.asyncio
async def test_classify_priority_with_missing_subject():
    """Test priority classification with missing subject."""
    with pytest.raises(ValueError):
        await classify_email_priority(
            subject="",
            content=TEST_EMAIL["content"],
            sender=TEST_EMAIL["sender"]
        ) 