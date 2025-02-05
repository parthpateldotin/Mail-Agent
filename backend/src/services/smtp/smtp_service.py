"""SMTP service for sending emails."""
import asyncio
import logging
from datetime import datetime
from email.mime.application import MIMEApplication
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Dict, List, Optional, Union

import aiosmtplib
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import settings
from src.models.email import Email, EmailAttachment
from src.services.imap.providers import EmailProvider, get_provider_for_email

logger = logging.getLogger(__name__)


class SMTPService:
    """SMTP service for sending emails."""

    def __init__(self, session: AsyncSession):
        """Initialize service."""
        self.session = session
        self._connections: Dict[str, aiosmtplib.SMTP] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self.max_retries = 3
        self.retry_delay = 1  # seconds

    async def get_connection(
        self,
        email: str,
        password: str,
        provider: Optional[EmailProvider] = None
    ) -> aiosmtplib.SMTP:
        """Get or create an SMTP connection."""
        if email not in self._connections:
            if not provider:
                provider = get_provider_for_email(email)
            
            self._locks[email] = asyncio.Lock()
            
            try:
                smtp = aiosmtplib.SMTP(
                    hostname=provider.smtp_host,
                    port=provider.smtp_port,
                    use_tls=False
                )
                await smtp.connect()
                await smtp.starttls()
                await smtp.login(email, password)
                self._connections[email] = smtp
            except Exception as e:
                logger.error(f"Failed to create SMTP connection for {email}: {e}")
                raise

        return self._connections[email]

    async def close_connection(self, email: str) -> None:
        """Close SMTP connection."""
        if email in self._connections:
            try:
                await self._connections[email].quit()
            except Exception as e:
                logger.error(f"Error closing SMTP connection for {email}: {e}")
            finally:
                del self._connections[email]
                del self._locks[email]

    async def send_email(
        self,
        from_email: str,
        password: str,
        to_email: Union[str, List[str]],
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
        attachments: Optional[List[EmailAttachment]] = None,
        provider: Optional[EmailProvider] = None
    ) -> bool:
        """Send an email."""
        if isinstance(to_email, str):
            to_email = [to_email]
        
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = from_email
        message["To"] = ", ".join(to_email)
        
        if cc:
            message["Cc"] = ", ".join(cc)
        if bcc:
            message["Bcc"] = ", ".join(bcc)
        
        # Add text body
        message.attach(MIMEText(body, "plain"))
        
        # Add HTML body if provided
        if html_body:
            message.attach(MIMEText(html_body, "html"))
        
        # Add attachments
        if attachments:
            for attachment in attachments:
                part = MIMEApplication(
                    attachment.content,
                    _subtype=attachment.content_type.split("/")[1]
                )
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=attachment.filename
                )
                message.attach(part)
        
        # Get all recipients
        recipients = to_email.copy()
        if cc:
            recipients.extend(cc)
        if bcc:
            recipients.extend(bcc)
        
        # Send email with retry logic
        for attempt in range(self.max_retries):
            try:
                smtp = await self.get_connection(from_email, password, provider)
                async with self._locks[from_email]:
                    await smtp.send_message(message)
                return True
            except aiosmtplib.SMTPServerDisconnected:
                # Connection lost, remove it and try again
                await self.close_connection(from_email)
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                continue
            except Exception as e:
                logger.error(f"Failed to send email (attempt {attempt + 1}): {e}")
                if attempt < self.max_retries - 1:
                    await asyncio.sleep(self.retry_delay)
                continue
        
        return False

    async def send_bulk_emails(
        self,
        from_email: str,
        password: str,
        emails: List[Email],
        provider: Optional[EmailProvider] = None
    ) -> Dict[str, bool]:
        """Send multiple emails in bulk."""
        results = {}
        
        for email in emails:
            success = await self.send_email(
                from_email=from_email,
                password=password,
                to_email=email.recipient,
                subject=email.subject,
                body=email.body,
                html_body=email.html_body if hasattr(email, "html_body") else None,
                attachments=email.attachments if hasattr(email, "attachments") else None,
                provider=provider
            )
            results[email.id] = success
        
        return results

    async def save_draft(
        self,
        from_email: str,
        password: str,
        draft: Email,
        provider: Optional[EmailProvider] = None
    ) -> bool:
        """Save email as draft."""
        message = MIMEMultipart("alternative")
        message["Subject"] = draft.subject
        message["From"] = from_email
        message["To"] = draft.recipient
        
        # Add text body
        message.attach(MIMEText(draft.body, "plain"))
        
        # Add HTML body if provided
        if hasattr(draft, "html_body") and draft.html_body:
            message.attach(MIMEText(draft.html_body, "html"))
        
        # Add attachments
        if hasattr(draft, "attachments") and draft.attachments:
            for attachment in draft.attachments:
                part = MIMEApplication(
                    attachment.content,
                    _subtype=attachment.content_type.split("/")[1]
                )
                part.add_header(
                    "Content-Disposition",
                    "attachment",
                    filename=attachment.filename
                )
                message.attach(part)
        
        try:
            smtp = await self.get_connection(from_email, password, provider)
            async with self._locks[from_email]:
                # Save to drafts folder
                await smtp.send_message(
                    message,
                    from_email,
                    [from_email],
                    mail_options=["DRAFT"]
                )
            return True
        except Exception as e:
            logger.error(f"Failed to save draft: {e}")
            return False 