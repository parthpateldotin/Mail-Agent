"""Email service module."""
import logging
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import List, Optional

import aiosmtplib
from jinja2 import Environment, PackageLoader, select_autoescape

from src.core.config import settings

logger = logging.getLogger(__name__)

# Set up Jinja2 environment for email templates
env = Environment(
    loader=PackageLoader("src.services.email", "templates"),
    autoescape=select_autoescape(["html", "xml"])
)


class EmailService:
    """Email service."""

    def __init__(self):
        """Initialize service."""
        self.host = settings.SMTP_HOST
        self.port = settings.SMTP_PORT
        self.username = settings.SMTP_USER
        self.password = settings.SMTP_PASS
        self.use_tls = settings.SMTP_SECURE
        self.from_email = settings.MAIL_FROM
        self.from_name = settings.MAIL_FROM_NAME

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None,
        cc: Optional[List[str]] = None,
        bcc: Optional[List[str]] = None,
    ) -> bool:
        """Send email."""
        message = MIMEMultipart("alternative")
        message["Subject"] = subject
        message["From"] = f"{self.from_name} <{self.from_email}>"
        message["To"] = to_email

        if cc:
            message["Cc"] = ", ".join(cc)
        if bcc:
            message["Bcc"] = ", ".join(bcc)

        # Add text part
        if text_content:
            message.attach(MIMEText(text_content, "plain"))

        # Add HTML part
        message.attach(MIMEText(html_content, "html"))

        try:
            async with aiosmtplib.SMTP(
                hostname=self.host,
                port=self.port,
                use_tls=self.use_tls
            ) as smtp:
                await smtp.login(self.username, self.password)
                await smtp.send_message(message)
            return True
        except Exception as e:
            logger.error(f"Error sending email: {e}")
            return False

    async def send_password_reset_email(
        self,
        to_email: str,
        user_name: str,
        token: str,
        expires_at: datetime
    ) -> bool:
        """Send password reset email."""
        template = env.get_template("password_reset.html")
        html_content = template.render(
            user_name=user_name,
            reset_url=f"{settings.FRONTEND_URL}/reset-password?token={token}",
            expires_at=expires_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        )

        text_template = env.get_template("password_reset.txt")
        text_content = text_template.render(
            user_name=user_name,
            reset_url=f"{settings.FRONTEND_URL}/reset-password?token={token}",
            expires_at=expires_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        )

        return await self.send_email(
            to_email=to_email,
            subject="Reset Your Password",
            html_content=html_content,
            text_content=text_content
        )

    async def send_verification_email(
        self,
        to_email: str,
        user_name: str,
        token: str,
        expires_at: datetime
    ) -> bool:
        """Send email verification email."""
        template = env.get_template("email_verification.html")
        html_content = template.render(
            user_name=user_name,
            verify_url=f"{settings.FRONTEND_URL}/verify-email?token={token}",
            expires_at=expires_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        )

        text_template = env.get_template("email_verification.txt")
        text_content = text_template.render(
            user_name=user_name,
            verify_url=f"{settings.FRONTEND_URL}/verify-email?token={token}",
            expires_at=expires_at.strftime("%Y-%m-%d %H:%M:%S UTC")
        )

        return await self.send_email(
            to_email=to_email,
            subject="Verify Your Email",
            html_content=html_content,
            text_content=text_content
        )

    async def send_welcome_email(
        self,
        to_email: str,
        user_name: str
    ) -> bool:
        """Send welcome email."""
        template = env.get_template("welcome.html")
        html_content = template.render(
            user_name=user_name,
            login_url=f"{settings.FRONTEND_URL}/login"
        )

        text_template = env.get_template("welcome.txt")
        text_content = text_template.render(
            user_name=user_name,
            login_url=f"{settings.FRONTEND_URL}/login"
        )

        return await self.send_email(
            to_email=to_email,
            subject=f"Welcome to {settings.PROJECT_NAME}!",
            html_content=html_content,
            text_content=text_content
        ) 