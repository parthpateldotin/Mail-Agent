"""Script to create test data for development."""
import asyncio
import uuid
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.database.base import async_session_maker
from src.core.security import get_password_hash
from src.models.user import User
from src.models.folder import Folder
from src.models.email import Email
from src.models.label import Label
from src.models.thread import Thread


async def create_test_data():
    """Create test data for development."""
    async with async_session_maker() as session:
        # Create test user
        test_user = User(
            id=uuid.uuid4(),
            email="test@example.com",
            hashed_password=get_password_hash("password123"),
            full_name="Test User",
            is_active=True,
            is_superuser=False,
        )
        session.add(test_user)
        await session.flush()

        # Create default folders
        folders = [
            Folder(
                id=uuid.uuid4(),
                name="Inbox",
                type="inbox",
                user_id=test_user.id,
                order=0,
            ),
            Folder(
                id=uuid.uuid4(),
                name="Sent",
                type="sent",
                user_id=test_user.id,
                order=1,
            ),
            Folder(
                id=uuid.uuid4(),
                name="Drafts",
                type="drafts",
                user_id=test_user.id,
                order=2,
            ),
            Folder(
                id=uuid.uuid4(),
                name="Trash",
                type="trash",
                user_id=test_user.id,
                order=3,
            ),
        ]
        for folder in folders:
            session.add(folder)
        await session.flush()

        # Create some labels
        labels = [
            Label(
                id=uuid.uuid4(),
                name="Important",
                color="#FF0000",
                user_id=test_user.id,
                order=0,
            ),
            Label(
                id=uuid.uuid4(),
                name="Work",
                color="#00FF00",
                user_id=test_user.id,
                order=1,
            ),
            Label(
                id=uuid.uuid4(),
                name="Personal",
                color="#0000FF",
                user_id=test_user.id,
                order=2,
            ),
        ]
        for label in labels:
            session.add(label)
        await session.flush()

        # Create some test threads
        threads = [
            Thread(
                id=uuid.uuid4(),
                user_id=test_user.id,
                subject="Welcome to AiMail",
                is_read=False,
                message_count=1,
                last_message_at=datetime.now(timezone.utc),
            ),
            Thread(
                id=uuid.uuid4(),
                user_id=test_user.id,
                subject="Test Email",
                is_read=True,
                message_count=1,
                last_message_at=datetime.now(timezone.utc),
            ),
        ]
        for thread in threads:
            session.add(thread)
        await session.flush()

        # Create some test emails
        emails = [
            Email(
                id=uuid.uuid4(),
                subject="Welcome to AiMail",
                body="Welcome to AiMail! We're excited to have you here.",
                from_address="system@aimail.com",
                to_address="test@example.com",
                user_id=test_user.id,
                thread_id=threads[0].id,
                is_read=False,
                is_sent=True,
                is_draft=False,
                sent_at=datetime.now(timezone.utc),
            ),
            Email(
                id=uuid.uuid4(),
                subject="Test Email",
                body="This is a test email sent from your account.",
                from_address="test@example.com",
                to_address="recipient@example.com",
                user_id=test_user.id,
                thread_id=threads[1].id,
                is_read=True,
                is_sent=True,
                is_draft=False,
                sent_at=datetime.now(timezone.utc),
            ),
        ]
        for email in emails:
            session.add(email)

        # Add some labels to emails
        emails[0].labels.append(labels[0])  # Important
        emails[1].labels.append(labels[1])  # Work

        await session.commit()


if __name__ == "__main__":
    asyncio.run(create_test_data()) 