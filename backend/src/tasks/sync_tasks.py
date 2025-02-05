"""Synchronization-related Celery tasks."""
import logging
from datetime import datetime
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.db import get_session
from src.models.email import Email, EmailFolder
from src.models.user import User
from src.services.imap.imap_service import IMAPService
from src.tasks.ai_tasks import analyze_email
from src.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


@celery_app.task(name="src.tasks.sync_tasks.sync_all_mailboxes")
async def sync_all_mailboxes() -> Dict[str, bool]:
    """Sync all user mailboxes."""
    results = {}
    
    try:
        async with get_session() as session:
            # Get all active users
            result = await session.execute(
                select(User).where(User.is_active == True)  # noqa: E712
            )
            users = result.scalars().all()
            
            for user in users:
                try:
                    # Sync user mailbox
                    success = await sync_user_mailbox.apply_async(
                        args=[user.id],
                        kwargs={"retry": False}
                    )
                    results[user.id] = success.get()
                except Exception as e:
                    logger.error(f"Error syncing mailbox for user {user.id}: {e}")
                    results[user.id] = False
            
            return results
            
    except Exception as e:
        logger.error(f"Error syncing all mailboxes: {e}")
        return {}


@celery_app.task(
    name="src.tasks.sync_tasks.sync_user_mailbox",
    bind=True,
    max_retries=3,
    default_retry_delay=300  # 5 minutes
)
async def sync_user_mailbox(
    self,
    user_id: str,
    retry: bool = True
) -> bool:
    """Sync user mailbox."""
    try:
        async with get_session() as session:
            # Get user
            user = await session.get(User, user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return False
            
            # Initialize IMAP service
            imap_service = IMAPService(session)
            
            # List folders
            folders = await imap_service.list_folders(
                email=user.email,
                password=user.email_password
            )
            
            # Create missing folders
            for folder_name, flags in folders:
                result = await session.execute(
                    select(EmailFolder)
                    .where(
                        EmailFolder.user_id == user_id,
                        EmailFolder.name == folder_name
                    )
                )
                folder = result.scalar_one_or_none()
                
                if not folder:
                    folder = EmailFolder(
                        user_id=user_id,
                        name=folder_name,
                        flags=flags
                    )
                    session.add(folder)
            
            await session.commit()
            
            # Sync each folder
            for folder_name, _ in folders:
                try:
                    # Get folder
                    result = await session.execute(
                        select(EmailFolder)
                        .where(
                            EmailFolder.user_id == user_id,
                            EmailFolder.name == folder_name
                        )
                    )
                    folder = result.scalar_one_or_none()
                    
                    if not folder:
                        continue
                    
                    # Sync folder
                    emails = await imap_service.sync_folder(
                        email=user.email,
                        password=user.email_password,
                        folder=folder_name,
                        last_sync=folder.last_sync
                    )
                    
                    # Save emails and trigger analysis
                    for email in emails:
                        email.folder_id = folder.id
                        email.user_id = user_id
                        session.add(email)
                        
                        # Trigger AI analysis
                        await analyze_email.apply_async(
                            args=[email.id],
                            countdown=5  # Start analysis after 5 seconds
                        )
                    
                    # Update last sync time
                    folder.last_sync = datetime.utcnow()
                    session.add(folder)
                    
                except Exception as e:
                    logger.error(f"Error syncing folder {folder_name}: {e}")
                    continue
            
            await session.commit()
            return True
            
    except Exception as e:
        logger.error(f"Error syncing mailbox for user {user_id}: {e}")
        if retry:
            raise self.retry(exc=e, countdown=300)
        return False


@celery_app.task(
    name="src.tasks.sync_tasks.sync_folder",
    bind=True,
    max_retries=3,
    default_retry_delay=300
)
async def sync_folder(
    self,
    user_id: str,
    folder_name: str,
    retry: bool = True
) -> bool:
    """Sync specific folder."""
    try:
        async with get_session() as session:
            # Get user and folder
            user = await session.get(User, user_id)
            if not user:
                logger.error(f"User {user_id} not found")
                return False
            
            result = await session.execute(
                select(EmailFolder)
                .where(
                    EmailFolder.user_id == user_id,
                    EmailFolder.name == folder_name
                )
            )
            folder = result.scalar_one_or_none()
            
            if not folder:
                logger.error(f"Folder {folder_name} not found")
                return False
            
            # Initialize IMAP service
            imap_service = IMAPService(session)
            
            # Sync folder
            emails = await imap_service.sync_folder(
                email=user.email,
                password=user.email_password,
                folder=folder_name,
                last_sync=folder.last_sync
            )
            
            # Save emails and trigger analysis
            for email in emails:
                email.folder_id = folder.id
                email.user_id = user_id
                session.add(email)
                
                # Trigger AI analysis
                await analyze_email.apply_async(
                    args=[email.id],
                    countdown=5  # Start analysis after 5 seconds
                )
            
            # Update last sync time
            folder.last_sync = datetime.utcnow()
            session.add(folder)
            
            await session.commit()
            return True
            
    except Exception as e:
        logger.error(f"Error syncing folder {folder_name}: {e}")
        if retry:
            raise self.retry(exc=e, countdown=300)
        return False


@celery_app.task(name="src.tasks.sync_tasks.cleanup_sync_data")
async def cleanup_sync_data() -> bool:
    """Clean up old sync data."""
    try:
        async with get_session() as session:
            # Get inactive users
            result = await session.execute(
                select(User)
                .where(User.is_active == False)  # noqa: E712
            )
            inactive_users = result.scalars().all()
            
            # Delete their sync data
            for user in inactive_users:
                # Delete folders
                result = await session.execute(
                    select(EmailFolder)
                    .where(EmailFolder.user_id == user.id)
                )
                folders = result.scalars().all()
                
                for folder in folders:
                    # Delete emails in folder
                    result = await session.execute(
                        select(Email)
                        .where(Email.folder_id == folder.id)
                    )
                    emails = result.scalars().all()
                    
                    for email in emails:
                        await session.delete(email)
                    
                    await session.delete(folder)
            
            await session.commit()
            return True
            
    except Exception as e:
        logger.error(f"Error cleaning up sync data: {e}")
        return False 