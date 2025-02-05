"""Email provider detection and configuration."""
from dataclasses import dataclass
from typing import Optional


@dataclass
class EmailProvider:
    """Email provider configuration."""
    name: str
    imap_host: str
    imap_port: int
    smtp_host: str
    smtp_port: int
    requires_oauth: bool = False
    oauth_scopes: Optional[list[str]] = None


# Common email providers
GMAIL = EmailProvider(
    name="Gmail",
    imap_host="imap.gmail.com",
    imap_port=993,
    smtp_host="smtp.gmail.com",
    smtp_port=587,
    requires_oauth=True,
    oauth_scopes=[
        "https://mail.google.com/",
        "https://www.googleapis.com/auth/gmail.modify",
        "https://www.googleapis.com/auth/gmail.compose",
        "https://www.googleapis.com/auth/gmail.send"
    ]
)

OUTLOOK = EmailProvider(
    name="Outlook",
    imap_host="outlook.office365.com",
    imap_port=993,
    smtp_host="smtp.office365.com",
    smtp_port=587,
    requires_oauth=True,
    oauth_scopes=[
        "https://outlook.office.com/IMAP.AccessAsUser.All",
        "https://outlook.office.com/SMTP.Send"
    ]
)

YAHOO = EmailProvider(
    name="Yahoo",
    imap_host="imap.mail.yahoo.com",
    imap_port=993,
    smtp_host="smtp.mail.yahoo.com",
    smtp_port=587
)

AOL = EmailProvider(
    name="AOL",
    imap_host="imap.aol.com",
    imap_port=993,
    smtp_host="smtp.aol.com",
    smtp_port=587
)

ZOHO = EmailProvider(
    name="Zoho",
    imap_host="imap.zoho.com",
    imap_port=993,
    smtp_host="smtp.zoho.com",
    smtp_port=587
)

# Generic provider for custom email servers
GENERIC = EmailProvider(
    name="Generic",
    imap_host="",
    imap_port=993,
    smtp_host="",
    smtp_port=587
)

# Provider mapping
PROVIDERS = {
    "gmail.com": GMAIL,
    "googlemail.com": GMAIL,
    "outlook.com": OUTLOOK,
    "hotmail.com": OUTLOOK,
    "live.com": OUTLOOK,
    "yahoo.com": YAHOO,
    "yahoo.co.uk": YAHOO,
    "yahoo.co.in": YAHOO,
    "aol.com": AOL,
    "zoho.com": ZOHO
}


def get_provider_for_email(email: str) -> EmailProvider:
    """Get email provider configuration for an email address."""
    domain = email.split("@")[-1].lower()
    return PROVIDERS.get(domain, GENERIC) 