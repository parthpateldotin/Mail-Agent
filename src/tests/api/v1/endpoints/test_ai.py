"""Tests for AI endpoints."""
import pytest
from fastapi import FastAPI
from httpx import AsyncClient
from unittest.mock import patch

from src.core.config import settings
from src.tests.utils.users import create_test_user, get_test_token

# Test data
TEST_EMAIL = {
    "subject": "Project Update Meeting",
    "content": "Hi team, Let's schedule a meeting to discuss project progress.",
    "sender": "manager@example.com",
    "importance": "high"
}

TEST_THREAD = {
    "emails": [
        TEST_EMAIL,
        {
            "subject": "Re: Project Update Meeting",
            "content": "That works for me. I'll prepare the status report.",
            "sender": "developer@example.com",
            "importance": "medium"
        }
    ]
}

@pytest.fixture
async def test_user_token(test_app: FastAPI):
    """Create test user and get token."""
    user = await create_test_user()
    return await get_test_token(user)

@pytest.mark.asyncio
async def test_analyze_email(test_app: FastAPI, test_user_token: str):
    """Test email analysis endpoint."""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        with patch('src.services.ai.openai_service.analyze_email_content') as mock_analyze:
            mock_analyze.return_value = {
                "sentiment": "positive",
                "priority": "high",
                "key_points": ["Meeting request", "Project update"],
                "suggested_actions": ["Confirm attendance"],
                "category": "business"
            }

            response = await client.post(
                f"{settings.API_PREFIX}/ai/analyze",
                json=TEST_EMAIL,
                headers={"Authorization": f"Bearer {test_user_token}"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["sentiment"] == "positive"
            assert data["priority"] == "high"
            assert len(data["key_points"]) > 0
            assert len(data["suggested_actions"]) > 0
            assert data["category"] == "business"

@pytest.mark.asyncio
async def test_generate_response(test_app: FastAPI, test_user_token: str):
    """Test response generation endpoint."""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        with patch('src.services.ai.openai_service.generate_email_response') as mock_generate:
            mock_generate.return_value = {
                "subject": "Re: Project Update Meeting",
                "content": "Thank you for the invitation. I'll attend the meeting.",
                "tone": "professional",
                "formality_level": "professional"
            }

            response = await client.post(
                f"{settings.API_PREFIX}/ai/generate-response",
                json={
                    "email": TEST_EMAIL,
                    "tone": "professional",
                    "length": "medium"
                },
                headers={"Authorization": f"Bearer {test_user_token}"}
            )

            assert response.status_code == 200
            data = response.json()
            assert data["subject"].startswith("Re: ")
            assert len(data["content"]) > 0
            assert data["tone"] == "professional"

@pytest.mark.asyncio
async def test_summarize_thread(test_app: FastAPI, test_user_token: str):
    """Test thread summarization endpoint."""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        with patch('src.services.ai.openai_service.summarize_email_thread') as mock_summarize:
            mock_summarize.return_value = "Meeting scheduled for project update. Team will prepare status report."

            response = await client.post(
                f"{settings.API_PREFIX}/ai/summarize-thread",
                json=TEST_THREAD,
                headers={"Authorization": f"Bearer {test_user_token}"}
            )

            assert response.status_code == 200
            assert isinstance(response.json(), str)
            assert "meeting" in response.json().lower()

@pytest.mark.asyncio
async def test_classify_priority(test_app: FastAPI, test_user_token: str):
    """Test priority classification endpoint."""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        with patch('src.services.ai.openai_service.classify_email_priority') as mock_classify:
            mock_classify.return_value = "HIGH"

            response = await client.post(
                f"{settings.API_PREFIX}/ai/classify-priority",
                json=TEST_EMAIL,
                headers={"Authorization": f"Bearer {test_user_token}"}
            )

            assert response.status_code == 200
            assert response.json() in ["URGENT", "HIGH", "MEDIUM", "LOW"]

@pytest.mark.asyncio
async def test_analyze_email_without_auth(test_app: FastAPI):
    """Test email analysis endpoint without authentication."""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        response = await client.post(
            f"{settings.API_PREFIX}/ai/analyze",
            json=TEST_EMAIL
        )
        assert response.status_code == 401

@pytest.mark.asyncio
async def test_analyze_email_with_ai_disabled(test_app: FastAPI, test_user_token: str):
    """Test email analysis endpoint with AI disabled."""
    with patch('src.core.config.settings.AI_ENABLED', False):
        async with AsyncClient(app=test_app, base_url="http://test") as client:
            response = await client.post(
                f"{settings.API_PREFIX}/ai/analyze",
                json=TEST_EMAIL,
                headers={"Authorization": f"Bearer {test_user_token}"}
            )
            assert response.status_code == 503

@pytest.mark.asyncio
async def test_analyze_email_with_invalid_data(test_app: FastAPI, test_user_token: str):
    """Test email analysis endpoint with invalid data."""
    async with AsyncClient(app=test_app, base_url="http://test") as client:
        response = await client.post(
            f"{settings.API_PREFIX}/ai/analyze",
            json={
                "subject": "",  # Empty subject
                "content": TEST_EMAIL["content"],
                "sender": "invalid-email"  # Invalid email
            },
            headers={"Authorization": f"Bearer {test_user_token}"}
        )
        assert response.status_code == 422  # Validation error 