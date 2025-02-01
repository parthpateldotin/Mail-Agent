"""Email template service."""
from pathlib import Path
from typing import Any, Dict, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from pydantic import EmailStr

from src.core.config import settings

# Initialize Jinja2 environment
template_dir = Path(__file__).parent / "templates"
template_dir.mkdir(exist_ok=True)

env = Environment(
    loader=FileSystemLoader(str(template_dir)),
    autoescape=select_autoescape(['html', 'xml']),
    trim_blocks=True,
    lstrip_blocks=True
)


class EmailTemplate:
    """Email template handler."""

    @staticmethod
    def render_template(template_name: str, context: Dict[str, Any]) -> str:
        """Render a template with given context."""
        template = env.get_template(f"{template_name}.html")
        return template.render(**context)

    @staticmethod
    def get_verification_email(
        user_email: EmailStr,
        verification_url: str,
        full_name: Optional[str] = None
    ) -> Dict[str, str]:
        """Get verification email content."""
        context = {
            "verification_url": verification_url,
            "full_name": full_name or user_email.split("@")[0],
            "support_email": settings.MAIL_FROM,
            "app_name": settings.PROJECT_NAME
        }
        
        subject = f"Verify your email for {settings.PROJECT_NAME}"
        html_content = EmailTemplate.render_template("verification", context)
        
        return {
            "subject": subject,
            "html_content": html_content
        }

    @staticmethod
    def get_password_reset_email(
        user_email: EmailStr,
        reset_url: str,
        full_name: Optional[str] = None
    ) -> Dict[str, str]:
        """Get password reset email content."""
        context = {
            "reset_url": reset_url,
            "full_name": full_name or user_email.split("@")[0],
            "support_email": settings.MAIL_FROM,
            "app_name": settings.PROJECT_NAME,
            "expiry_hours": settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS
        }
        
        subject = f"Reset your password for {settings.PROJECT_NAME}"
        html_content = EmailTemplate.render_template("password_reset", context)
        
        return {
            "subject": subject,
            "html_content": html_content
        }

    @staticmethod
    def get_welcome_email(
        user_email: EmailStr,
        full_name: Optional[str] = None
    ) -> Dict[str, str]:
        """Get welcome email content."""
        context = {
            "full_name": full_name or user_email.split("@")[0],
            "support_email": settings.MAIL_FROM,
            "app_name": settings.PROJECT_NAME,
            "login_url": f"{settings.FRONTEND_URL}/login"
        }
        
        subject = f"Welcome to {settings.PROJECT_NAME}!"
        html_content = EmailTemplate.render_template("welcome", context)
        
        return {
            "subject": subject,
            "html_content": html_content
        }

    @staticmethod
    def get_login_alert_email(
        user_email: EmailStr,
        login_location: str,
        device_info: str,
        full_name: Optional[str] = None
    ) -> Dict[str, str]:
        """Get login alert email content."""
        context = {
            "full_name": full_name or user_email.split("@")[0],
            "login_location": login_location,
            "device_info": device_info,
            "support_email": settings.MAIL_FROM,
            "app_name": settings.PROJECT_NAME,
            "settings_url": f"{settings.FRONTEND_URL}/settings/security"
        }
        
        subject = f"New login to your {settings.PROJECT_NAME} account"
        html_content = EmailTemplate.render_template("login_alert", context)
        
        return {
            "subject": subject,
            "html_content": html_content
        }

    @staticmethod
    def get_security_alert_email(
        user_email: EmailStr,
        alert_type: str,
        alert_details: Dict[str, Any],
        full_name: Optional[str] = None
    ) -> Dict[str, str]:
        """Get security alert email content."""
        context = {
            "full_name": full_name or user_email.split("@")[0],
            "alert_type": alert_type,
            "alert_details": alert_details,
            "support_email": settings.MAIL_FROM,
            "app_name": settings.PROJECT_NAME,
            "settings_url": f"{settings.FRONTEND_URL}/settings/security"
        }
        
        subject = f"Security Alert - {settings.PROJECT_NAME}"
        html_content = EmailTemplate.render_template("security_alert", context)
        
        return {
            "subject": subject,
            "html_content": html_content
        } 