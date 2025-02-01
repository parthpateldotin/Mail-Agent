"""Email service for sending system emails."""
from typing import Optional
from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import EmailStr

from src.core.config import settings

# Email configuration
email_conf = ConnectionConfig(
    MAIL_USERNAME=settings.MAIL_USERNAME,
    MAIL_PASSWORD=settings.MAIL_PASSWORD,
    MAIL_FROM=settings.MAIL_FROM,
    MAIL_PORT=settings.MAIL_PORT,
    MAIL_SERVER=settings.MAIL_SERVER,
    MAIL_FROM_NAME=settings.MAIL_FROM_NAME,
    MAIL_TLS=True,
    MAIL_SSL=False,
    USE_CREDENTIALS=True
)

# FastMail instance
fastmail = FastMail(email_conf)


async def send_password_reset_email(email: EmailStr, token: str) -> None:
    """Send password reset email."""
    # Create reset link
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token}"
    
    # Create message
    message = MessageSchema(
        subject="Password Reset Request",
        recipients=[email],
        body=f"""
        Hello,
        
        You have requested to reset your password. Please click the link below to proceed:
        
        {reset_link}
        
        This link will expire in 1 hour.
        
        If you did not request this password reset, please ignore this email.
        
        Best regards,
        AiMail Team
        """,
        subtype="plain"
    )
    
    # Send email
    await fastmail.send_message(message)

async def send_verification_email(email: EmailStr, token: str) -> None:
    """Send email verification email."""
    # Create verification link
    verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token}"
    
    # Create message
    message = MessageSchema(
        subject="Email Verification",
        recipients=[email],
        body=f"""
        Hello,
        
        Thank you for registering with AiMail. Please click the link below to verify your email address:
        
        {verification_link}
        
        This link will expire in 24 hours.
        
        If you did not create an account with us, please ignore this email.
        
        Best regards,
        AiMail Team
        """,
        subtype="plain"
    )
    
    # Send email
    await fastmail.send_message(message) 