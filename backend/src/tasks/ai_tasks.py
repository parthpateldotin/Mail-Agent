"""AI-related Celery tasks."""
import logging
from typing import Dict, List, Optional, Tuple

from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db import get_session
from src.core.redis import get_redis
from src.models.email import Email
from src.services.ai.ai_service import AIService
from src.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="src.tasks.ai_tasks.analyze_email",
    bind=True,
    max_retries=3,
    default_retry_delay=60  # 1 minute
)
async def analyze_email(
    self,
    email_id: str,
    retry: bool = True
) -> Dict[str, any]:
    """Analyze email content using AI."""
    try:
        async with get_session() as session:
            # Get email
            email = await session.get(Email, email_id)
            if not email:
                logger.error(f"Email {email_id} not found")
                return {}
            
            # Initialize AI service
            redis = await get_redis()
            ai_service = AIService(session, redis)
            
            # Run analysis tasks
            categories = await ai_service.categorize_email(email)
            sentiment = await ai_service.analyze_sentiment(email)
            actions = await ai_service.extract_action_items(email)
            language = await ai_service.detect_language(email)
            spam_score = await ai_service.detect_spam(email)
            
            # Update email metadata
            email.categories = categories
            email.sentiment = sentiment
            email.action_items = actions
            email.language = language
            email.spam_score = spam_score
            
            session.add(email)
            await session.commit()
            
            return {
                "categories": categories,
                "sentiment": sentiment,
                "action_items": actions,
                "language": language,
                "spam_score": spam_score
            }
            
    except Exception as e:
        logger.error(f"Error analyzing email {email_id}: {e}")
        if retry:
            raise self.retry(exc=e, countdown=60)
        return {}


@celery_app.task(
    name="src.tasks.ai_tasks.generate_reply",
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
async def generate_reply(
    self,
    email_id: str,
    style: Optional[str] = None,
    retry: bool = True
) -> str:
    """Generate smart reply for email."""
    try:
        async with get_session() as session:
            # Get email
            email = await session.get(Email, email_id)
            if not email:
                logger.error(f"Email {email_id} not found")
                return ""
            
            # Initialize AI service
            redis = await get_redis()
            ai_service = AIService(session, redis)
            
            # Generate reply
            reply = await ai_service.generate_smart_reply(email, style)
            
            # Save generated reply
            email.generated_reply = reply
            session.add(email)
            await session.commit()
            
            return reply
            
    except Exception as e:
        logger.error(f"Error generating reply for email {email_id}: {e}")
        if retry:
            raise self.retry(exc=e, countdown=60)
        return ""


@celery_app.task(
    name="src.tasks.ai_tasks.summarize_thread",
    bind=True,
    max_retries=3,
    default_retry_delay=60
)
async def summarize_thread(
    self,
    thread_id: str,
    retry: bool = True
) -> Tuple[str, List[str]]:
    """Summarize email thread."""
    try:
        async with get_session() as session:
            # Get emails in thread
            result = await session.execute(
                select(Email)
                .where(Email.thread_id == thread_id)
                .order_by(Email.received_at)
            )
            emails = result.scalars().all()
            
            if not emails:
                logger.error(f"No emails found for thread {thread_id}")
                return "", []
            
            # Initialize AI service
            redis = await get_redis()
            ai_service = AIService(session, redis)
            
            # Generate summary
            summary, key_points = await ai_service.summarize_thread(emails)
            
            # Save summary to thread
            for email in emails:
                email.thread_summary = summary
                email.thread_key_points = key_points
                session.add(email)
            
            await session.commit()
            
            return summary, key_points
            
    except Exception as e:
        logger.error(f"Error summarizing thread {thread_id}: {e}")
        if retry:
            raise self.retry(exc=e, countdown=60)
        return "", []


@celery_app.task(
    name="src.tasks.ai_tasks.batch_analyze_emails",
    bind=True,
    max_retries=3,
    default_retry_delay=300
)
async def batch_analyze_emails(
    self,
    email_ids: List[str],
    retry: bool = True
) -> Dict[str, Dict[str, any]]:
    """Analyze multiple emails in batch."""
    results = {}
    
    for email_id in email_ids:
        try:
            result = await analyze_email.apply_async(
                args=[email_id],
                kwargs={"retry": False}
            )
            results[email_id] = result.get()
        except Exception as e:
            logger.error(f"Error analyzing email {email_id} in batch: {e}")
            results[email_id] = {}
    
    return results


@celery_app.task(name="src.tasks.ai_tasks.cleanup_ai_cache")
async def cleanup_ai_cache() -> bool:
    """Clean up old AI cache entries."""
    try:
        redis = await get_redis()
        
        # Get all cache keys
        keys = await redis.keys("category:*")
        keys.extend(await redis.keys("reply:*"))
        keys.extend(await redis.keys("sentiment:*"))
        keys.extend(await redis.keys("actions:*"))
        keys.extend(await redis.keys("summary:*"))
        keys.extend(await redis.keys("language:*"))
        keys.extend(await redis.keys("spam:*"))
        
        # Delete expired keys
        for key in keys:
            if not await redis.ttl(key):
                await redis.delete(key)
        
        return True
        
    except Exception as e:
        logger.error(f"Error cleaning up AI cache: {e}")
        return False 