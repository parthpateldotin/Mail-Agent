"""Tests for email templates."""
import pytest
from pathlib import Path

from src.services.email.templates import EmailTemplate
from src.core.config import settings


@pytest.fixture
def template_dir():
    """Get template directory."""
    return Path(__file__).parent.parent.parent.parent / "services" / "email" / "templates"


def test_template_directory_exists(template_dir):
    """Test that template directory exists."""
    assert template_dir.exists()
    assert template_dir.is_dir()


def test_base_template_exists(template_dir):
    """Test that base template exists."""
    assert (template_dir / "base.html").exists()
    assert (template_dir / "base.html").is_file()


@pytest.mark.parametrize("template_name", [
    "verification.html",
    "password_reset.html",
    "welcome.html",
    "login_alert.html",
    "security_alert.html"
])
def test_email_templates_exist(template_dir, template_name):
    """Test that all email templates exist."""
    assert (template_dir / template_name).exists()
    assert (template_dir / template_name).is_file()


def test_verification_email():
    """Test verification email generation."""
    email = EmailTemplate.get_verification_email(
        user_email="test@example.com",
        verification_url="http://example.com/verify",
        full_name="Test User"
    )
    
    assert isinstance(email, dict)
    assert "subject" in email
    assert "html_content" in email
    assert settings.PROJECT_NAME in email["subject"]
    assert "Verify" in email["subject"]
    assert "http://example.com/verify" in email["html_content"]
    assert "Test User" in email["html_content"]


def test_password_reset_email():
    """Test password reset email generation."""
    email = EmailTemplate.get_password_reset_email(
        user_email="test@example.com",
        reset_url="http://example.com/reset",
        full_name="Test User"
    )
    
    assert isinstance(email, dict)
    assert "subject" in email
    assert "html_content" in email
    assert settings.PROJECT_NAME in email["subject"]
    assert "Reset" in email["subject"]
    assert "http://example.com/reset" in email["html_content"]
    assert "Test User" in email["html_content"]
    assert str(settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS) in email["html_content"]


def test_welcome_email():
    """Test welcome email generation."""
    email = EmailTemplate.get_welcome_email(
        user_email="test@example.com",
        full_name="Test User"
    )
    
    assert isinstance(email, dict)
    assert "subject" in email
    assert "html_content" in email
    assert settings.PROJECT_NAME in email["subject"]
    assert "Welcome" in email["subject"]
    assert "Test User" in email["html_content"]
    assert settings.FRONTEND_URL in email["html_content"]


def test_login_alert_email():
    """Test login alert email generation."""
    email = EmailTemplate.get_login_alert_email(
        user_email="test@example.com",
        login_location="New York, USA",
        device_info="Chrome on Windows",
        full_name="Test User"
    )
    
    assert isinstance(email, dict)
    assert "subject" in email
    assert "html_content" in email
    assert settings.PROJECT_NAME in email["subject"]
    assert "login" in email["subject"].lower()
    assert "New York, USA" in email["html_content"]
    assert "Chrome on Windows" in email["html_content"]
    assert "Test User" in email["html_content"]


def test_security_alert_email():
    """Test security alert email generation."""
    alert_details = {
        "type": "Password Changed",
        "time": "2024-03-14 15:30:00 UTC",
        "location": "New York, USA"
    }
    
    email = EmailTemplate.get_security_alert_email(
        user_email="test@example.com",
        alert_type="Password Change",
        alert_details=alert_details,
        full_name="Test User"
    )
    
    assert isinstance(email, dict)
    assert "subject" in email
    assert "html_content" in email
    assert settings.PROJECT_NAME in email["subject"]
    assert "Security Alert" in email["subject"]
    assert "Password Change" in email["html_content"]
    assert "Test User" in email["html_content"]
    assert "New York, USA" in email["html_content"]


def test_email_template_with_missing_template():
    """Test error handling for missing template."""
    with pytest.raises(Exception):
        EmailTemplate.render_template("non_existent_template", {})


def test_email_template_with_invalid_context():
    """Test error handling for invalid context."""
    with pytest.raises(Exception):
        EmailTemplate.render_template("verification", {"invalid_key": "value"})


def test_fallback_to_email_username():
    """Test fallback to email username when full_name is not provided."""
    email = EmailTemplate.get_welcome_email(
        user_email="testuser@example.com"
    )
    
    assert "testuser" in email["html_content"] 