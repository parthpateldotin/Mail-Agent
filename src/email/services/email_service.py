import imaplib
import email
from email.mime.text import MIMEText
import smtplib
import ssl
from bs4 import BeautifulSoup
import logging

class EmailService:
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        logging.basicConfig(level=logging.INFO)
    
    def _get_config(self, key, default=None):
        """Helper method to get config values supporting both attribute and dict access"""
        if hasattr(self.config, key):
            return getattr(self.config, key)
        return self.config.get(key, default)
    
    def connect_imap(self):
        """
        Establish IMAP connection based on configuration
        Supports both SSL and non-SSL connections
        """
        try:
            imap_server = self._get_config('IMAP_SERVER')
            imap_port = int(self._get_config('IMAP_PORT', 993))
            username = self._get_config('EMAIL_SERVICE_USERNAME')
            password = self._get_config('EMAIL_SERVICE_PASSWORD')
            
            if not all([imap_server, username, password]):
                raise ValueError("Missing required email configuration")
            
            # Always use SSL for Hostinger
            context = ssl.create_default_context()
            context.check_hostname = True
            context.verify_mode = ssl.CERT_REQUIRED
            
            # Connect using SSL
            mail = imaplib.IMAP4_SSL(
                host=imap_server, 
                port=imap_port,
                ssl_context=context
            )
            
            # Login to the email account
            mail.login(username, password)
            
            return mail
        except Exception as e:
            self.logger.error(f"IMAP Connection Error: {e}")
            raise
    
    def mark_email_as_read(self, mail, uid):
        """Mark an email as read using its UID"""
        try:
            mail.uid('STORE', uid, '+FLAGS', '\\Seen')
            self.logger.info(f"Marked email {uid} as read")
            return True
        except Exception as e:
            self.logger.error(f"Error marking email as read: {e}")
            return False

    def fetch_unread_emails(self):
        """Fetch unread emails and mark them as read after processing"""
        try:
            mail = self.connect_imap()
            mail.select('inbox')
            
            # Search for unread messages
            _, messages = mail.uid('SEARCH', None, 'UNSEEN')
            email_data_list = []
            
            for uid in messages[0].split():
                _, msg_data = mail.uid('FETCH', uid, '(RFC822)')
                email_body = email.message_from_bytes(msg_data[0][1])
                
                # Extract email data
                email_data = {
                    'uid': uid,
                    'from': email.utils.parseaddr(email_body['from'])[1],
                    'subject': email_body['subject'],
                    'body': self._extract_email_body(email_body),
                    'timestamp': email.utils.parsedate_to_datetime(email_body['date'])
                }
                
                email_data_list.append(email_data)
                
                # Mark as read after processing
                self.mark_email_as_read(mail, uid)
            
            mail.close()
            mail.logout()
            return email_data_list
            
        except Exception as e:
            self.logger.error(f"Error fetching unread emails: {e}")
            return []
    
    def _extract_email_body(self, email_message):
        """
        Extract email body with multiple fallback methods
        """
        body = ""
        
        # Try extracting plain text
        if email_message.is_multipart():
            for part in email_message.walk():
                content_type = part.get_content_type()
                
                if content_type == "text/plain":
                    try:
                        body = part.get_payload(decode=True).decode('utf-8')
                        break
                    except Exception:
                        try:
                            body = part.get_payload(decode=True).decode('latin-1')
                            break
                        except Exception:
                            pass
                
                # Fallback to HTML if no plain text
                elif content_type == "text/html" and not body:
                    try:
                        html_body = part.get_payload(decode=True).decode('utf-8')
                        soup = BeautifulSoup(html_body, 'html.parser')
                        body = soup.get_text()
                    except Exception:
                        pass
        else:
            # Non-multipart email
            try:
                body = email_message.get_payload(decode=True).decode('utf-8')
            except Exception:
                try:
                    body = email_message.get_payload(decode=True).decode('latin-1')
                except Exception:
                    body = email_message.get_payload()
        
        # Clean and truncate body
        body = ' '.join(body.split())[:1000]  # Limit to 1000 characters
        return body
    
    def send_email(self, to_email, subject, body):
        """
        Send email with SMTP configuration for Hostinger
        """
        try:
            smtp_server = self._get_config('SMTP_SERVER')
            smtp_port = int(self._get_config('SMTP_PORT', 587))
            username = self._get_config('EMAIL_SERVICE_USERNAME')
            password = self._get_config('EMAIL_SERVICE_PASSWORD')
            
            if not all([smtp_server, username, password]):
                raise ValueError("Missing required email configuration")
            
            # Create SSL context with appropriate settings
            context = ssl.create_default_context()
            
            # Connect to SMTP server
            server = smtplib.SMTP(smtp_server, smtp_port)
            server.starttls(context=context)
            server.login(username, password)
            
            msg = MIMEText(body)
            msg['Subject'] = subject
            msg['From'] = username
            msg['To'] = to_email
            
            server.sendmail(
                username, 
                to_email, 
                msg.as_string()
            )
            
            server.quit()
            self.logger.info(f"Email sent successfully to {to_email}")
        
        except Exception as e:
            self.logger.error(f"Email sending error: {e}")
            raise