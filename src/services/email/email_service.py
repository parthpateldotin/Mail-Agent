import asyncio
from typing import List, Optional, Dict, Any
from datetime import datetime
import logging
import imaplib
import email
from email.mime.text import MIMEText
import smtplib
import ssl
from bs4 import BeautifulSoup
from sqlalchemy import select, func, and_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from tenacity import retry, stop_after_attempt, wait_exponential

from src.utils import event_loop
from src.core.config import get_app_settings
from src.models.email import Email
from src.models.user import User
from src.schemas.email import (
    EmailCreate,
    EmailUpdate,
    EmailListResponse,
    EmailResponse
)
from src.core.exceptions import (
    EmailNotFoundError,
    DatabaseError,
    ValidationError,
    OperationError
)

class EmailService:
    """Email service for handling email operations."""

    def __init__(self, session: AsyncSession):
        self.session = session
        self.settings = get_app_settings()
        self.logger = logging.getLogger(__name__)
        self.imap = None
        self.smtp = None
        self.context = ssl.create_default_context()
        self.is_connected = False
        self.connection_lock = asyncio.Lock()
        self.last_connection_attempt = None
        self.connection_retry_delay = 5  # seconds
        self.metrics = {
            "total_fetched": 0,
            "total_sent": 0,
            "failed_fetches": 0,
            "failed_sends": 0,
            "fetch_times": [],
            "send_times": [],
            "last_fetch": None,
            "last_send": None
        }
    
    async def connect(self):
        """Connect to both IMAP and SMTP servers with proper error handling"""
        async with self.connection_lock:
            try:
                # Check if we need to wait before retrying
                if self.last_connection_attempt:
                    time_since_last_attempt = (datetime.now() - self.last_connection_attempt).total_seconds()
                    if time_since_last_attempt < self.connection_retry_delay:
                        await asyncio.sleep(self.connection_retry_delay - time_since_last_attempt)
                
                self.last_connection_attempt = datetime.now()
                
                # Connect to IMAP with timeout
                self.logger.info("Connecting to IMAP server...")
                try:
                    self.imap = imaplib.IMAP4_SSL(
                        self.settings.IMAP_SERVER, 
                        port=self.settings.IMAP_PORT,
                        ssl_context=self.context
                    )
                    self.imap.login(
                        self.settings.EMAIL_SERVICE_USERNAME, 
                        self.settings.EMAIL_SERVICE_PASSWORD
                    )
                    self.logger.info("IMAP connection successful")
                except Exception as e:
                    self.logger.error(f"IMAP connection failed: {e}")
                    self.imap = None
                
                # Connect to SMTP with timeout and retries
                max_retries = 3
                retry_delay = 2
                
                for attempt in range(max_retries):
                    self.logger.info(f"Connecting to SMTP server (attempt {attempt + 1}/{max_retries})...")
                    try:
                        self.smtp = smtplib.SMTP(
                            self.settings.SMTP_SERVER, 
                            port=self.settings.SMTP_PORT,
                            timeout=30  # Increased timeout
                        )
                        await asyncio.sleep(0.1)  # Give connection time to establish
                        
                        # Start TLS if required
                        if self.settings.SMTP_USE_TLS:
                            self.smtp.starttls(context=self.context)
                            await asyncio.sleep(0.1)  # Give TLS time to establish
                        
                        self.smtp.login(
                            self.settings.EMAIL_SERVICE_USERNAME,
                            self.settings.EMAIL_SERVICE_PASSWORD
                        )
                        self.logger.info("SMTP connection successful")
                        break
                    except Exception as e:
                        self.logger.error(f"SMTP connection attempt {attempt + 1} failed: {e}")
                        if self.smtp:
                            try:
                                self.smtp.quit()
                            except:
                                pass
                        self.smtp = None
                        if attempt < max_retries - 1:
                            await asyncio.sleep(retry_delay * (attempt + 1))
                            continue
                
                self.is_connected = bool(self.imap or self.smtp)
                return self.is_connected
                
            except Exception as e:
                self.logger.error(f"Connection failed: {str(e)}")
                self.is_connected = False
                await self.disconnect()
                return False
    
    async def disconnect(self):
        """Safely disconnect from both servers"""
        try:
            if self.smtp:
                try:
                    self.smtp.quit()
                except Exception as e:
                    self.logger.error(f"Error disconnecting SMTP: {e}")
                finally:
                    self.smtp = None
            
            if self.imap:
                try:
                    self.imap.logout()
                except Exception as e:
                    self.logger.error(f"Error disconnecting IMAP: {e}")
                finally:
                    self.imap = None
            
            self.is_connected = False
        except Exception as e:
            self.logger.error(f"Error during disconnect: {e}")
    
    async def ensure_connected(self):
        """Ensure connection is active, reconnect if necessary"""
        if not self.is_connected:
            await self.connect()
        return self.is_connected
    
    async def check_health(self) -> Dict[str, Any]:
        """Check health status of email connections"""
        status = True
        error = None
        imap_connected = False
        smtp_connected = False
        
        try:
            # Quick check without full reconnection
            if self.imap:
                try:
                    self.imap.noop()
                    imap_connected = True
                except:
                    self.logger.warning("IMAP connection lost")
                    self.imap = None
            
            if self.smtp:
                try:
                    self.smtp.noop()
                    smtp_connected = True
                except:
                    self.logger.warning("SMTP connection lost")
                    self.smtp = None
            
            # Only attempt reconnection if both connections are down
            if not (imap_connected or smtp_connected):
                self.logger.info("Attempting reconnection...")
                await self.connect()
                if self.imap:
                    imap_connected = True
                if self.smtp:
                    smtp_connected = True
            
            if not (imap_connected or smtp_connected):
                status = False
                error = "Email services unavailable"
            
        except Exception as e:
            status = False
            error = str(e)
            self.logger.error(f"Health check error: {e}")
        
        return {
            "status": "healthy" if status else "unhealthy",
            "imap_connected": imap_connected,
            "smtp_connected": smtp_connected,
            "last_check": datetime.now().isoformat(),
            "error": error
        }
    
    async def fetch_unread_emails(self) -> List[Dict[str, Any]]:
        """Fetch unread emails with enhanced error handling"""
        start_time = datetime.now()
        try:
            if not self.imap:
                await self.connect()
            
            self.imap.select('INBOX')
            _, message_numbers = self.imap.search(None, 'UNSEEN')
            
            emails = []
            for num in message_numbers[0].split():
                try:
                    _, msg_data = self.imap.fetch(num, '(RFC822)')
                    email_body = msg_data[0][1]
                    email_message = email.message_from_bytes(email_body)
                    
                    # Process email content
                    content = self._get_email_content(email_message)
                    
                    # Create email data dictionary
                    email_data = {
                        'id': num.decode(),
                        'from': email_message['from'],
                        'to': email_message['to'],
                        'subject': email_message['subject'],
                        'date': email_message['date'],
                        'body': content,
                        'timestamp': datetime.now()
                    }
                    
                    emails.append(email_data)
                    self.metrics["total_fetched"] += 1
                except Exception as e:
                    self.logger.error(f"Error processing email {num}: {e}")
                    self.metrics["failed_fetches"] += 1
            
            # Update metrics
            fetch_time = (datetime.now() - start_time).total_seconds()
            self.metrics["fetch_times"].append(fetch_time)
            self.metrics["last_fetch"] = datetime.now()
            
            # Keep only last 100 fetch times
            if len(self.metrics["fetch_times"]) > 100:
                self.metrics["fetch_times"] = self.metrics["fetch_times"][-100:]
            
            return emails
        except Exception as e:
            self.metrics["failed_fetches"] += 1
            self.logger.error(f"Error fetching emails: {e}")
            raise
    
    async def send_email(self, to_email: str, subject: str, body: str) -> bool:
        """Send email with proper error handling and retries"""
        if not self.is_connected or not self.smtp:
            await self.connect()
            if not self.smtp:
                self.logger.error("Cannot send email: SMTP not connected")
                return False
        
        try:
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = self.settings.EMAIL_SERVICE_USERNAME
            msg['To'] = to_email
            
            max_retries = 3
            retry_delay = 2
            
            for attempt in range(max_retries):
                try:
                    self.smtp.send_message(msg)
                    self.logger.info(f"Email sent successfully to {to_email}")
                    return True
                except Exception as e:
                    self.logger.error(f"Failed to send email (attempt {attempt + 1}): {e}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(retry_delay * (attempt + 1))
                        # Try to reconnect SMTP
                        try:
                            if self.smtp:
                                self.smtp.quit()
                        except:
                            pass
                        self.smtp = None
                        await self.connect()
                        continue
            
            return False
            
        except Exception as e:
            self.logger.error(f"Error sending email: {e}")
            return False
    
    def _get_email_content(self, email_message) -> str:
        """Extract email content with enhanced handling for different content types"""
        content = ""
        
        if email_message.is_multipart():
            for part in email_message.walk():
                if part.get_content_type() == "text/plain":
                    content += part.get_payload(decode=True).decode()
                elif part.get_content_type() == "text/html":
                    soup = BeautifulSoup(part.get_payload(decode=True).decode(), 'html.parser')
                    content += soup.get_text()
        else:
            content = email_message.get_payload(decode=True).decode()
        
        return content.strip()

    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        reraise=True
    )
    async def get_user_emails(
        self, 
        user: User, 
        skip: int = 0, 
        limit: int = 50,
        folder_id: Optional[str] = None,
        is_read: Optional[bool] = None,
        is_starred: Optional[bool] = None,
    ) -> EmailListResponse:
        """Get user's emails with pagination and filters."""
        try:
            # Base query
            conditions = [Email.user_id == user.id]
            
            # Apply filters
            if folder_id:
                conditions.append(Email.folder_id == folder_id)
            if is_read is not None:
                conditions.append(Email.is_read == is_read)
            if is_starred is not None:
                conditions.append(Email.is_starred == is_starred)

            # Create query
            query = select(Email).where(and_(*conditions))

            # Get total count
            count_query = select(func.count()).select_from(query.subquery())
            total = await self.session.scalar(count_query) or 0

            # Get paginated results
            query = query.order_by(Email.created_at.desc()).offset(skip).limit(limit)
            result = await self.session.execute(query)
            emails = result.scalars().all()

            page = skip // limit + 1 if limit > 0 else 1

            return EmailListResponse(
                total=total,
                page=page,
                size=limit,
                items=[EmailResponse.from_orm(email) for email in emails]
            )
        except SQLAlchemyError as e:
            raise DatabaseError(f"Failed to fetch emails: {str(e)}")
        except Exception as e:
            raise OperationError(f"Error fetching emails: {str(e)}")

    async def get_email_by_id(self, email_id: str) -> Optional[Email]:
        """Get email by ID."""
        try:
            result = await self.session.execute(
                select(Email).where(Email.id == email_id)
            )
            email = result.scalar_one_or_none()
            if not email:
                raise EmailNotFoundError(f"Email with ID {email_id} not found")
            return email
        except SQLAlchemyError as e:
            raise DatabaseError(f"Failed to fetch email: {str(e)}")

    async def create_email(self, user: User, email_data: EmailCreate) -> Email:
        """Create a new email."""
        try:
            async with self.session.begin_nested():
                email = Email(
                    user_id=user.id,
                    **email_data.model_dump(exclude={'sender'})
                )
                self.session.add(email)
            
            await self.session.commit()
            await self.session.refresh(email)
            return email
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to create email: {str(e)}")
        except ValidationError as e:
            await self.session.rollback()
            raise ValidationError(f"Invalid email data: {str(e)}")
        except Exception as e:
            await self.session.rollback()
            raise OperationError(f"Error creating email: {str(e)}")

    async def update_email(self, email: Email, email_data: EmailUpdate) -> Email:
        """Update email data."""
        try:
            async with self.session.begin_nested():
                update_data = email_data.model_dump(exclude_unset=True)
                for key, value in update_data.items():
                    setattr(email, key, value)
                
                email.updated_at = datetime.utcnow()
            
            await self.session.commit()
            await self.session.refresh(email)
            return email
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to update email: {str(e)}")
        except Exception as e:
            await self.session.rollback()
            raise OperationError(f"Error updating email: {str(e)}")

    async def delete_email(self, email: Email) -> None:
        """Delete an email."""
        try:
            async with self.session.begin_nested():
                await self.session.delete(email)
            await self.session.commit()
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to delete email: {str(e)}")
        except Exception as e:
            await self.session.rollback()
            raise OperationError(f"Error deleting email: {str(e)}")

    async def mark_as_read(self, email: Email) -> Email:
        """Mark email as read."""
        try:
            async with self.session.begin_nested():
                email.is_read = True
                email.updated_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(email)
            return email
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to mark email as read: {str(e)}")

    async def mark_as_unread(self, email: Email) -> Email:
        """Mark email as unread."""
        try:
            async with self.session.begin_nested():
                email.is_read = False
                email.updated_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(email)
            return email
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to mark email as unread: {str(e)}")

    async def toggle_star(self, email: Email) -> Email:
        """Toggle email star status."""
        try:
            async with self.session.begin_nested():
                email.is_starred = not email.is_starred
                email.updated_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(email)
            return email
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to toggle star status: {str(e)}")

    async def move_to_folder(self, email: Email, folder_id: str) -> Email:
        """Move email to different folder."""
        try:
            async with self.session.begin_nested():
                email.folder_id = folder_id
                email.updated_at = datetime.utcnow()
            await self.session.commit()
            await self.session.refresh(email)
            return email
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to move email: {str(e)}")

    async def bulk_update_emails(
        self,
        user: User,
        email_ids: List[str],
        update_data: Dict[str, Any]
    ) -> List[Email]:
        """Bulk update emails."""
        try:
            async with self.session.begin_nested():
                query = select(Email).where(
                    and_(
                        Email.id.in_(email_ids),
                        Email.user_id == user.id
                    )
                )
                result = await self.session.execute(query)
                emails = result.scalars().all()

                for email in emails:
                    for key, value in update_data.items():
                        setattr(email, key, value)
                    email.updated_at = datetime.utcnow()

            await self.session.commit()
            return emails
        except SQLAlchemyError as e:
            await self.session.rollback()
            raise DatabaseError(f"Failed to bulk update emails: {str(e)}")
        except Exception as e:
            await self.session.rollback()
            raise OperationError(f"Error bulk updating emails: {str(e)}") 