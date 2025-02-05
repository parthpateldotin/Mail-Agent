"""AI service for smart email features."""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple

import openai
from redis.asyncio import Redis
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.email import Email

logger = logging.getLogger(__name__)


class AIService:
    """AI service for smart email features."""

    def __init__(self, session: AsyncSession, redis: Redis):
        """Initialize service."""
        self.session = session
        self.redis = redis
        self.openai = openai
        self.openai.api_key = settings.OPENAI_API_KEY
        self.cache_ttl = 3600  # 1 hour

    async def _get_cached_response(self, cache_key: str) -> Optional[str]:
        """Get cached response."""
        try:
            cached = await self.redis.get(cache_key)
            if cached:
                return cached.decode()
            return None
        except Exception as e:
            logger.error(f"Error getting cached response: {e}")
            return None

    async def _cache_response(
        self,
        cache_key: str,
        response: str,
        ttl: Optional[int] = None
    ) -> None:
        """Cache response."""
        try:
            await self.redis.set(
                cache_key,
                response,
                ex=ttl or self.cache_ttl
            )
        except Exception as e:
            logger.error(f"Error caching response: {e}")

    async def categorize_email(self, email: Email) -> List[str]:
        """Categorize email content."""
        cache_key = f"category:{email.id}"
        
        # Check cache
        cached = await self._get_cached_response(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Prepare email content
            content = f"Subject: {email.subject}\n\nBody: {email.body}"
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an email categorization assistant. "
                        "Analyze the email and provide relevant categories. "
                        "Return only a JSON array of category names."
                    },
                    {"role": "user", "content": content}
                ],
                temperature=0.3,
                max_tokens=100
            )
            
            categories = json.loads(response.choices[0].message.content)
            
            # Cache the result
            await self._cache_response(cache_key, json.dumps(categories))
            
            return categories
        except Exception as e:
            logger.error(f"Error categorizing email: {e}")
            return ["Uncategorized"]

    async def generate_smart_reply(
        self,
        email: Email,
        style: Optional[str] = None
    ) -> str:
        """Generate smart reply for email."""
        cache_key = f"reply:{email.id}:{style or 'default'}"
        
        # Check cache
        cached = await self._get_cached_response(cache_key)
        if cached:
            return cached
        
        try:
            # Prepare email content and conversation history
            content = f"Subject: {email.subject}\n\nBody: {email.body}"
            
            style_prompt = ""
            if style:
                style_prompt = f"\nGenerate a {style} response."
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an email assistant. "
                        "Generate a professional and contextually appropriate "
                        f"reply to the email.{style_prompt}"
                    },
                    {"role": "user", "content": content}
                ],
                temperature=0.7,
                max_tokens=300
            )
            
            reply = response.choices[0].message.content
            
            # Cache the result
            await self._cache_response(cache_key, reply)
            
            return reply
        except Exception as e:
            logger.error(f"Error generating smart reply: {e}")
            return ""

    async def analyze_sentiment(self, email: Email) -> Dict[str, float]:
        """Analyze email sentiment."""
        cache_key = f"sentiment:{email.id}"
        
        # Check cache
        cached = await self._get_cached_response(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Prepare email content
            content = f"Subject: {email.subject}\n\nBody: {email.body}"
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a sentiment analysis assistant. "
                        "Analyze the email and provide sentiment scores. "
                        "Return a JSON object with 'positive', 'negative', and "
                        "'neutral' scores that sum to 1.0."
                    },
                    {"role": "user", "content": content}
                ],
                temperature=0.3,
                max_tokens=100
            )
            
            sentiment = json.loads(response.choices[0].message.content)
            
            # Cache the result
            await self._cache_response(cache_key, json.dumps(sentiment))
            
            return sentiment
        except Exception as e:
            logger.error(f"Error analyzing sentiment: {e}")
            return {"positive": 0.0, "negative": 0.0, "neutral": 1.0}

    async def extract_action_items(self, email: Email) -> List[str]:
        """Extract action items from email."""
        cache_key = f"actions:{email.id}"
        
        # Check cache
        cached = await self._get_cached_response(cache_key)
        if cached:
            return json.loads(cached)
        
        try:
            # Prepare email content
            content = f"Subject: {email.subject}\n\nBody: {email.body}"
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an action item extraction assistant. "
                        "Analyze the email and extract action items or tasks. "
                        "Return a JSON array of action items."
                    },
                    {"role": "user", "content": content}
                ],
                temperature=0.3,
                max_tokens=200
            )
            
            actions = json.loads(response.choices[0].message.content)
            
            # Cache the result
            await self._cache_response(cache_key, json.dumps(actions))
            
            return actions
        except Exception as e:
            logger.error(f"Error extracting action items: {e}")
            return []

    async def summarize_thread(
        self,
        emails: List[Email]
    ) -> Tuple[str, List[str]]:
        """Summarize email thread and extract key points."""
        if not emails:
            return "", []
        
        thread_id = emails[0].thread_id
        cache_key = f"summary:{thread_id}"
        
        # Check cache
        cached = await self._get_cached_response(cache_key)
        if cached:
            cached_data = json.loads(cached)
            return cached_data["summary"], cached_data["key_points"]
        
        try:
            # Prepare thread content
            thread_content = []
            for email in emails:
                thread_content.append(
                    f"From: {email.sender}\n"
                    f"Date: {email.received_at}\n"
                    f"Subject: {email.subject}\n"
                    f"Body: {email.body}\n"
                    "---"
                )
            
            content = "\n".join(thread_content)
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are an email thread summarization assistant. "
                        "Analyze the email thread and provide a concise summary "
                        "and key points. Return a JSON object with 'summary' and "
                        "'key_points' fields."
                    },
                    {"role": "user", "content": content}
                ],
                temperature=0.3,
                max_tokens=400
            )
            
            result = json.loads(response.choices[0].message.content)
            
            # Cache the result
            await self._cache_response(cache_key, json.dumps(result))
            
            return result["summary"], result["key_points"]
        except Exception as e:
            logger.error(f"Error summarizing thread: {e}")
            return "", []

    async def detect_language(self, email: Email) -> str:
        """Detect email language."""
        cache_key = f"language:{email.id}"
        
        # Check cache
        cached = await self._get_cached_response(cache_key)
        if cached:
            return cached
        
        try:
            # Prepare email content
            content = f"Subject: {email.subject}\n\nBody: {email.body}"
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a language detection assistant. "
                        "Detect the primary language of the email. "
                        "Return only the ISO 639-1 language code."
                    },
                    {"role": "user", "content": content}
                ],
                temperature=0.3,
                max_tokens=10
            )
            
            language = response.choices[0].message.content.strip()
            
            # Cache the result
            await self._cache_response(cache_key, language)
            
            return language
        except Exception as e:
            logger.error(f"Error detecting language: {e}")
            return "en"  # Default to English

    async def detect_spam(self, email: Email) -> float:
        """Detect spam probability."""
        cache_key = f"spam:{email.id}"
        
        # Check cache
        cached = await self._get_cached_response(cache_key)
        if cached:
            return float(cached)
        
        try:
            # Prepare email content
            content = f"From: {email.sender}\n"
            f"Subject: {email.subject}\n\n"
            f"Body: {email.body}"
            
            response = await openai.ChatCompletion.acreate(
                model="gpt-4",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a spam detection assistant. "
                        "Analyze the email and provide a spam probability score "
                        "between 0.0 and 1.0. Return only the number."
                    },
                    {"role": "user", "content": content}
                ],
                temperature=0.3,
                max_tokens=10
            )
            
            spam_score = float(response.choices[0].message.content.strip())
            
            # Cache the result
            await self._cache_response(cache_key, str(spam_score))
            
            return spam_score
        except Exception as e:
            logger.error(f"Error detecting spam: {e}")
            return 0.0  # Default to non-spam 