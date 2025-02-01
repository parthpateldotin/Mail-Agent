import imaplib
import email
from email.mime.text import MIMEText
import smtplib
import ssl
from bs4 import BeautifulSoup
import logging
from typing import List, Dict, Any, Optional
from datetime import datetime
from enum import Enum
import json
import asyncio
from dataclasses import dataclass
from src.utils.event_loop import get_event_loop

# Enums for state management
class EmailState(Enum):
    NEW = 'new'
    QUEUED = 'queued'
    PROCESSING = 'processing'
    ANALYZED = 'analyzed'
    RESPONDED = 'responded'
    SENT = 'sent'
    FAILED = 'failed'
    ARCHIVED = 'archived'

class ProcessState(Enum):
    STARTING = 'starting'
    RUNNING = 'running'
    PAUSED = 'paused'
    STOPPING = 'stopping'
    STOPPED = 'stopped'
    ERROR = 'error'
    RECOVERING = 'recovering'

# Data classes
@dataclass
class Email:
    id: str
    subject: str
    content: str
    sender: str
    recipients: List[str]
    timestamp: datetime
    state: EmailState
    metadata: Dict[str, Any]

@dataclass
class ProcessedEmail(Email):
    analysis_result: Dict[str, Any]
    response: Optional[str] = None
    processing_time: Optional[float] = None

@dataclass
class HealthStatus:
    status: str
    imap_connected: bool
    smtp_connected: bool
    last_check: datetime
    error: Optional[str] = None

@dataclass
class FetcherMetrics:
    total_fetched: int
    total_sent: int
    failed_fetches: int
    failed_sends: int
    avg_fetch_time: float
    avg_send_time: float
    last_fetch: datetime
    last_send: datetime

class EmailService:
    def __init__(self, config):
        self.config = config
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
                        self.config.IMAP_SERVER, 
                        port=self.config.IMAP_PORT,
                        ssl_context=self.context
                    )
                    self.imap.login(
                        self.config.EMAIL_SERVICE_USERNAME, 
                        self.config.EMAIL_SERVICE_PASSWORD
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
                            self.config.SMTP_SERVER, 
                            port=self.config.SMTP_PORT,
                            timeout=30  # Increased timeout
                        )
                        await asyncio.sleep(0.1)  # Give connection time to establish
                        
                        # Start TLS if required
                        if self.config.SMTP_USE_TLS:
                            self.smtp.starttls(context=self.context)
                            await asyncio.sleep(0.1)  # Give TLS time to establish
                        
                        self.smtp.login(
                            self.config.EMAIL_SERVICE_USERNAME,
                            self.config.EMAIL_SERVICE_PASSWORD
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
    
    async def check_health(self) -> HealthStatus:
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
        
        return HealthStatus(
            status=status,
            imap_connected=imap_connected,
            smtp_connected=smtp_connected,
            last_check=datetime.now(),
            error=error
        )
    
    def report_metrics(self) -> FetcherMetrics:
        """Report email service metrics"""
        avg_fetch_time = (
            sum(self.metrics["fetch_times"]) / len(self.metrics["fetch_times"])
            if self.metrics["fetch_times"]
            else 0
        )
        avg_send_time = (
            sum(self.metrics["send_times"]) / len(self.metrics["send_times"])
            if self.metrics["send_times"]
            else 0
        )
        
        return FetcherMetrics(
            total_fetched=self.metrics["total_fetched"],
            total_sent=self.metrics["total_sent"],
            failed_fetches=self.metrics["failed_fetches"],
            failed_sends=self.metrics["failed_sends"],
            avg_fetch_time=avg_fetch_time,
            avg_send_time=avg_send_time,
            last_fetch=self.metrics["last_fetch"] or datetime.now(),
            last_send=self.metrics["last_send"] or datetime.now()
        )
    
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
            msg['From'] = self.config.EMAIL_SERVICE_USERNAME
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

class EmailFetcherService:
    def __init__(self):
        self.state = ProcessState.STOPPED
        self.logger = logging.getLogger(__name__)

    async def start(self):
        self.state = ProcessState.STARTING
        # Initialize connections and resources
        self.state = ProcessState.RUNNING
        self.logger.info("Email Fetcher Service started")

    async def fetch_emails(self) -> List[Email]:
        if self.state != ProcessState.RUNNING:
            raise RuntimeError("Service not in RUNNING state")
        # Implement email fetching logic
        return []

    async def process_new_emails(self) -> None:
        emails = await self.fetch_emails()
        for email in emails:
            # Process each email
            self.logger.info(f"Processing email {email.id}")

    async def get_state(self) -> Dict[str, Any]:
        return {
            "state": self.state,
            "last_fetch": datetime.now().isoformat()
        }

class EmailProcessorService:
    def __init__(self):
        self.state = ProcessState.STOPPED
        self.logger = logging.getLogger(__name__)
        self.queue: List[Email] = []

    async def start(self):
        self.state = ProcessState.STARTING
        # Initialize processing resources
        self.state = ProcessState.RUNNING
        self.logger.info("Email Processor Service started")

    async def process_email(self, email: Email) -> ProcessedEmail:
        email.state = EmailState.PROCESSING
        # Implement email processing logic
        processed = ProcessedEmail(
            id=email.id,
            subject=email.subject,
            content=email.content,
            sender=email.sender,
            recipients=email.recipients,
            timestamp=email.timestamp,
            state=EmailState.ANALYZED,
            metadata=email.metadata,
            analysis_result={},
        )
        return processed

    async def batch_process(self, emails: List[Email]) -> List[ProcessedEmail]:
        return [await self.process_email(email) for email in emails]

class ResponseGeneratorService:
    def __init__(self):
        self.state = ProcessState.STOPPED
        self.logger = logging.getLogger(__name__)
        self.templates: Dict[str, str] = {}

    async def start(self):
        self.state = ProcessState.STARTING
        # Initialize templates and resources
        self.state = ProcessState.RUNNING
        self.logger.info("Response Generator Service started")

    async def generate_response(self, analysis: Dict[str, Any]) -> str:
        # Implement response generation logic
        return "Generated response based on analysis"

    async def apply_template(self, template_name: str, data: Dict[str, Any]) -> str:
        template = self.templates.get(template_name)
        if not template:
            raise ValueError(f"Template {template_name} not found")
        # Implement template application logic
        return template.format(**data)

class EmailServiceManager:
    def __init__(self):
        self.fetcher = EmailFetcherService()
        self.processor = EmailProcessorService()
        self.generator = ResponseGeneratorService()
        self.logger = logging.getLogger(__name__)

    async def start_all(self):
        self.logger.info("Starting all email services...")
        await asyncio.gather(
            self.fetcher.start(),
            self.processor.start(),
            self.generator.start()
        )
        self.logger.info("All email services started successfully")

    async def process_email_flow(self, email: Email) -> ProcessedEmail:
        # Implement complete email processing flow
        processed = await self.processor.process_email(email)
        return processed