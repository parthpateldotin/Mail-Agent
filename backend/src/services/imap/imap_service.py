"""IMAP service for email fetching and syncing."""
import asyncio
import email
import logging
from datetime import datetime
from email.message import Message
from typing import Dict, List, Optional, Tuple, Union

import aioimaplib
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.email import Email, EmailFolder
from src.services.imap.providers import EmailProvider, get_provider_for_email

logger = logging.getLogger(__name__)


class IMAPService:
    """IMAP service for email operations."""

    def __init__(self, session: AsyncSession):
        """Initialize service."""
        self.session = session
        self._connections: Dict[str, aioimaplib.IMAP4_SSL] = {}
        self._locks: Dict[str, asyncio.Lock] = {}

    async def get_connection(
        self,
        email: str,
        password: str,
        provider: Optional[EmailProvider] = None
    ) -> aioimaplib.IMAP4_SSL:
        """Get or create an IMAP connection."""
        if email not in self._connections:
            if not provider:
                provider = get_provider_for_email(email)
            
            self._locks[email] = asyncio.Lock()
            
            try:
                imap = aioimaplib.IMAP4_SSL(provider.imap_host)
                await imap.wait_hello_from_server()
                await imap.login(email, password)
                self._connections[email] = imap
            except Exception as e:
                logger.error(f"Failed to create IMAP connection for {email}: {e}")
                raise

        return self._connections[email]

    async def close_connection(self, email: str) -> None:
        """Close IMAP connection."""
        if email in self._connections:
            try:
                await self._connections[email].logout()
                await self._connections[email].wait_logout()
            except Exception as e:
                logger.error(f"Error closing IMAP connection for {email}: {e}")
            finally:
                del self._connections[email]
                del self._locks[email]

    async def list_folders(
        self,
        email: str,
        password: str
    ) -> List[Tuple[str, str]]:
        """List all folders in the mailbox."""
        imap = await self.get_connection(email, password)
        async with self._locks[email]:
            response = await imap.list()
            if response.result != "OK":
                raise Exception(f"Failed to list folders: {response}")
            
            folders = []
            for folder_data in response.lines:
                # Parse folder data
                parts = folder_data.decode().split(' "/" ')
                if len(parts) == 2:
                    flags = parts[0].strip('()')
                    name = parts[1].strip('"')
                    folders.append((name, flags))
            
            return folders

    async def sync_folder(
        self,
        email: str,
        password: str,
        folder: str,
        last_sync: Optional[datetime] = None
    ) -> List[Email]:
        """Sync emails from a folder."""
        imap = await self.get_connection(email, password)
        async with self._locks[email]:
            # Select folder
            response = await imap.select(folder)
            if response.result != "OK":
                raise Exception(f"Failed to select folder {folder}: {response}")
            
            # Build search criteria
            criteria = ["ALL"]
            if last_sync:
                date_str = last_sync.strftime("%d-%b-%Y")
                criteria = [f"SINCE {date_str}"]
            
            # Search for messages
            response = await imap.search(*criteria)
            if response.result != "OK":
                raise Exception(f"Failed to search messages: {response}")
            
            message_numbers = response.lines[0].decode().split()
            emails = []
            
            for num in message_numbers:
                response = await imap.fetch(num, "(RFC822)")
                if response.result != "OK":
                    logger.error(f"Failed to fetch message {num}: {response}")
                    continue
                
                email_data = self._parse_email(response.lines[0])
                if email_data:
                    emails.append(email_data)
            
            return emails

    def _parse_email(self, raw_email: bytes) -> Optional[Email]:
        """Parse raw email data into Email model."""
        try:
            msg: Message = email.message_from_bytes(raw_email)
            
            # Extract basic headers
            subject = msg.get("subject", "")
            from_addr = msg.get("from", "")
            to_addr = msg.get("to", "")
            date_str = msg.get("date", "")
            
            # Parse date
            try:
                date = email.utils.parsedate_to_datetime(date_str)
            except Exception:
                date = datetime.utcnow()
            
            # Get body
            body = ""
            if msg.is_multipart():
                for part in msg.walk():
                    if part.get_content_type() == "text/plain":
                        body = part.get_payload(decode=True).decode()
                        break
            else:
                body = msg.get_payload(decode=True).decode()
            
            # Create Email model
            email_obj = Email(
                subject=subject,
                sender=from_addr,
                recipient=to_addr,
                body=body,
                received_at=date
            )
            
            return email_obj
        except Exception as e:
            logger.error(f"Failed to parse email: {e}")
            return None

    async def create_folder(
        self,
        email: str,
        password: str,
        folder_name: str
    ) -> bool:
        """Create a new folder."""
        imap = await self.get_connection(email, password)
        async with self._locks[email]:
            response = await imap.create(folder_name)
            return response.result == "OK"

    async def move_email(
        self,
        email: str,
        password: str,
        message_id: str,
        from_folder: str,
        to_folder: str
    ) -> bool:
        """Move an email from one folder to another."""
        imap = await self.get_connection(email, password)
        async with self._locks[email]:
            # Select source folder
            response = await imap.select(from_folder)
            if response.result != "OK":
                raise Exception(f"Failed to select folder {from_folder}: {response}")
            
            # Search for message
            response = await imap.search(f"HEADER Message-ID {message_id}")
            if response.result != "OK":
                raise Exception(f"Failed to find message: {response}")
            
            message_numbers = response.lines[0].decode().split()
            if not message_numbers:
                return False
            
            # Copy to destination
            response = await imap.copy(message_numbers[0], to_folder)
            if response.result != "OK":
                return False
            
            # Delete from source
            response = await imap.store(message_numbers[0], "+FLAGS", "(\\Deleted)")
            if response.result != "OK":
                return False
            
            response = await imap.expunge()
            return response.result == "OK"

    async def search_emails(
        self,
        email: str,
        password: str,
        query: str,
        folder: Optional[str] = None
    ) -> List[Email]:
        """Search for emails matching the query."""
        imap = await self.get_connection(email, password)
        async with self._locks[email]:
            if folder:
                response = await imap.select(folder)
                if response.result != "OK":
                    raise Exception(f"Failed to select folder {folder}: {response}")
            
            # Search in subject and body
            response = await imap.search(f'OR SUBJECT "{query}" BODY "{query}"')
            if response.result != "OK":
                raise Exception(f"Failed to search messages: {response}")
            
            message_numbers = response.lines[0].decode().split()
            emails = []
            
            for num in message_numbers:
                response = await imap.fetch(num, "(RFC822)")
                if response.result != "OK":
                    logger.error(f"Failed to fetch message {num}: {response}")
                    continue
                
                email_data = self._parse_email(response.lines[0])
                if email_data:
                    emails.append(email_data)
            
            return emails 