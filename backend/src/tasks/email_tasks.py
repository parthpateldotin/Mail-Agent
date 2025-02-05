"""Email-related Celery tasks."""
import logging
from datetime import datetime, timedelta
from typing import List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db import get_session
from src.models.email import Email, EmailFolder
from src.models.user import User
from src.services.imap.imap_service import IMAPService
from src.services.smtp.smtp_service import SMTPService
from src.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(
    name="src.tasks.email_tasks.send_email",
    bind=True,
    max_retries=3,
    default_retry_delay=300  # 5 minutes
)
async def send_email(
    self,
    email_id: str,
    user_id: str,
    retry: bool = True
) -> bool:
    """Send email task."""
    try:
        async with get_session() as session:
            # Get email and user
            email = await session.get(Email, email_id)
            user = await session.get(User, user_id)
            
            if not email or not user:
                logger.error(f"Email {email_id} or user {user_id} not found")
                return False
            
            # Send email
            smtp_service = SMTPService(session)
            success = await smtp_service.send_email(
                from_email=user.email,
                password=user.email_password,
                to_email=email.recipient,
                subject=email.subject,
                body=email.body,
                html_body=email.html_body if hasattr(email, "html_body") else None,
                attachments=email.attachments if hasattr(email, "attachments") else None
            )
            
            if success:
                # Update email status
                email.sent_at = datetime.utcnow()
                email.status = "sent"
                session.add(email)
                await session.commit()
                return True
            
            if retry:
                raise self.retry(countdown=300)  # Retry in 5 minutes
            return False
            
    except Exception as e:
        logger.error(f"Error sending email {email_id}: {e}")
        if retry:
            raise self.retry(exc=e, countdown=300)
        return False


@celery_app.task(
    name="src.tasks.email_tasks.sync_mailbox",
    bind=True,
    max_retries=3,
    default_retry_delay=300
)
async def sync_mailbox(
    self,
    user_id: str,
    folder: Optional[str] = None,
    retry: bool = True
) -> bool:
    """Sync mailbox task."""
    try:
        async with get_session() as session:
            # Get user
            user = await session.get(User, user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return False
            
            # Get last sync time
            result = await session.execute(
                select(EmailFolder)
                .where(
                    EmailFolder.user_id == user_id,
                    EmailFolder.name == folder if folder else True
                )
            )
            folders = result.scalars().all()
            
            # Initialize IMAP service
            imap_service = IMAPService(session)
            
            for folder_obj in folders:
                try:
                    # Sync folder
                    emails = await imap_service.sync_folder(
                        email=user.email,
                        password=user.email_password,
                        folder=folder_obj.name,
                        last_sync=folder_obj.last_sync
                    )
                    
                    # Save emails
                    for email in emails:
                        email.folder_id = folder_obj.id
                        email.user_id = user_id
                        session.add(email)
                    
                    # Update last sync time
                    folder_obj.last_sync = datetime.utcnow()
                    session.add(folder_obj)
                    
                except Exception as e:
                    logger.error(f"Error syncing folder {folder_obj.name}: {e}")
                    continue
            
            await session.commit()
            return True
            
    except Exception as e:
        logger.error(f"Error syncing mailbox for user {user_id}: {e}")
        if retry:
            raise self.retry(exc=e, countdown=300)
        return False


@celery_app.task(name="src.tasks.email_tasks.cleanup_old_emails")
async def cleanup_old_emails() -> bool:
    """Clean up old emails task."""
    try:
        async with get_session() as session:
            # Get emails older than 30 days in trash folder
            thirty_days_ago = datetime.utcnow() - timedelta(days=30)
            
            result = await session.execute(
                select(Email)
                .join(EmailFolder)
                .where(
                    EmailFolder.name == "Trash",
                    Email.received_at < thirty_days_ago
                )
            )
            old_emails = result.scalars().all()
            
            # Delete old emails
            for email in old_emails:
                await session.delete(email)
            
            await session.commit()
            return True
            
    except Exception as e:
        logger.error(f"Error cleaning up old emails: {e}")
        return False


@celery_app.task(
    name="src.tasks.email_tasks.move_email",
    bind=True,
    max_retries=3,
    default_retry_delay=300
)
async def move_email(
    self,
    email_id: str,
    user_id: str,
    to_folder: str,
    retry: bool = True
) -> bool:
    """Move email task."""
    try:
        async with get_session() as session:
            # Get email and user
            email = await session.get(Email, email_id)
            user = await session.get(User, user_id)
            
            if not email or not user:
                logger.error(f"Email {email_id} or user {user_id} not found")
                return False
            
            # Get current folder
            result = await session.execute(
                select(EmailFolder).where(EmailFolder.id == email.folder_id)
            )
            from_folder = result.scalar_one_or_none()
            
            if not from_folder:
                logger.error(f"Source folder not found for email {email_id}")
                return False
            
            # Get destination folder
            result = await session.execute(
                select(EmailFolder)
                .where(
                    EmailFolder.user_id == user_id,
                    EmailFolder.name == to_folder
                )
            )
            to_folder_obj = result.scalar_one_or_none()
            
            if not to_folder_obj:
                logger.error(f"Destination folder {to_folder} not found")
                return False
            
            # Move email on IMAP server
            imap_service = IMAPService(session)
            success = await imap_service.move_email(
                email=user.email,
                password=user.email_password,
                message_id=email.message_id,
                from_folder=from_folder.name,
                to_folder=to_folder
            )
            
            if success:
                # Update email folder
                email.folder_id = to_folder_obj.id
                session.add(email)
                await session.commit()
                return True
            
            if retry:
                raise self.retry(countdown=300)
            return False
            
    except Exception as e:
        logger.error(f"Error moving email {email_id}: {e}")
        if retry:
            raise self.retry(exc=e, countdown=300)
        return False 