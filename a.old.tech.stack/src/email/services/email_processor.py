import logging
from datetime import datetime
from src.email.services.email_service import EmailService
from src.email.services.ai_service import AIService
from src.email.services.admin_service import AdminService
from src.database.models.conversation_messages import ConversationMessage, MessageDirection
from src.database.database_config import SessionLocal
import re
import threading
from queue import Queue, Empty
import hashlib
from typing import Dict, Any, Optional
from dataclasses import dataclass
import time
import asyncio
from src.utils.event_loop import EventLoopManager, run_async

@dataclass
class QueueStatus:
    size: int
    processing: int
    processed: int
    failed: int
    avg_processing_time: float

class EmailProcessor:
    def __init__(self, config):
        self.config = config
        self.logger = logging.getLogger(__name__)
        self.email_service = EmailService(config)
        self.ai_service = AIService(config)
        self.admin_service = AdminService(config)
        self.processing_queue = Queue(maxsize=100)  # Default max size
        self.is_processing = False
        self.metrics = {
            "processed": 0,
            "failed": 0,
            "processing_times": [],
            "last_error": None,
            "start_time": None
        }
        self.services_initialized = False
        self._initialization_lock = None
        self._loop = EventLoopManager.get_instance().get_loop()
        self.is_running = False
        self.processing_lock = asyncio.Lock()
        self.last_check = datetime.now()
        self.metrics = {
            "emails_processed": 0,
            "successful_responses": 0,
            "failed_responses": 0,
            "avg_response_time": 0,
            "errors": []
        }

    @property
    def initialization_lock(self):
        """Get or create initialization lock in the current event loop"""
        if self._initialization_lock is None:
            loop = EventLoopManager.get_instance().get_loop()
            self._initialization_lock = asyncio.Lock()
        return self._initialization_lock
    
    async def initialize_services(self):
        """Initialize all required services"""
        if self.services_initialized:
            return True
            
        try:
            # Initialize email service
            await self.email_service.connect()
            self.logger.info("Email service initialized")
            
            # Initialize AI service
            await self.ai_service.start()
            self.logger.info("AI service initialized")
            
            self.services_initialized = True
            return True
        except Exception as e:
            self.logger.error(f"Failed to initialize services: {e}")
            await self.cleanup_services()
            return False

    async def cleanup_services(self):
        """Clean up services during shutdown or error"""
        try:
            await self.email_service.disconnect()
        except:
            pass
        try:
            await self.ai_service.stop()
        except:
            pass
        self.services_initialized = False

    def start_processing(self):
        """Start the email processing thread"""
        if not self.is_processing:
            self.is_processing = True
            self.metrics["start_time"] = datetime.now()
            # Start processing in a new thread
            threading.Thread(target=self._run_processing_loop, daemon=True).start()
            self.logger.info("Email processing thread started")

    def stop_processing(self):
        """Stop the email processing thread"""
        self.is_processing = False
        self.logger.info("Stopping email processing thread...")

    def _run_processing_loop(self):
        """Main processing loop running in a separate thread"""
        while self.is_processing:
            try:
                # Get the shared event loop
                loop = EventLoopManager.get_instance().get_loop()
                
                # Process emails
                loop.run_until_complete(self._process_queue())
            except Exception as e:
                self.logger.error(f"Error in processing loop: {e}")
                time.sleep(5)  # Wait before retrying

    def get_queue_status(self) -> QueueStatus:
        """Get current queue status and metrics"""
        avg_time = (
            sum(self.metrics["processing_times"]) / len(self.metrics["processing_times"])
            if self.metrics["processing_times"]
            else 0
        )
        return QueueStatus(
            size=self.processing_queue.qsize(),
            processing=self.processing_queue.unfinished_tasks,
            processed=self.metrics["processed"],
            failed=self.metrics["failed"],
            avg_processing_time=avg_time
        )
    
    def adjust_queue_size(self, size: int):
        """Adjust processing queue size"""
        if size < 1:
            raise ValueError("Queue size must be at least 1")
        
        new_queue = Queue(maxsize=size)
        # Transfer items from old queue to new queue
        while not self.processing_queue.empty():
            try:
                item = self.processing_queue.get_nowait()
                new_queue.put(item)
            except Empty:
                break
        
        self.processing_queue = new_queue
        self.logger.info(f"Queue size adjusted to {size}")
    
    async def _process_queue(self):
        """Process emails from the queue"""
        try:
            while self.is_processing:
                try:
                    email = self.processing_queue.get(timeout=1)
                    start_time = time.time()
                    
                    try:
                        await self._process_single_email(email)
                        self.metrics["processed"] += 1
                    except Exception as e:
                        self.logger.error(f"Error processing email: {e}")
                        self.metrics["failed"] += 1
                        self.metrics["last_error"] = str(e)
                    finally:
                        self.processing_queue.task_done()
                        processing_time = time.time() - start_time
                        self.metrics["processing_times"].append(processing_time)
                        
                        # Keep only last 100 processing times
                        if len(self.metrics["processing_times"]) > 100:
                            self.metrics["processing_times"] = self.metrics["processing_times"][-100:]
                except Empty:
                    continue
                except Exception as e:
                    self.logger.error(f"Error in processing loop: {e}")
                    time.sleep(1)  # Prevent tight loop on persistent errors
        except Exception as e:
            self.logger.error(f"Error in processing loop: {e}")
    
    def _generate_message_id(self, email_data):
        """Generate a unique message ID for the email"""
        components = [
            str(email_data['from']),
            str(email_data['subject']),
            str(email_data['timestamp']),
            str(email_data['body'][:100])  # Use first 100 chars of body for hash
        ]
        return hashlib.md5(''.join(components).encode()).hexdigest()
    
    async def _process_single_email(self, email_data):
        """Process a single email with enhanced error handling and retries"""
        db = None
        try:
            db = SessionLocal()
            
            # Check if email is from admin
            if email_data['from'] == self.config.ADMIN_EMAIL:
                self.admin_service.process_admin_command(email_data)
                return
            
            # Generate message ID
            message_id = self._generate_message_id(email_data)
            
            # Check for duplicate processing
            existing_message = db.query(ConversationMessage).filter_by(message_id=message_id).first()
            if existing_message:
                self.logger.info(f"Skipping duplicate message {message_id}")
                return
            
            # Store incoming message
            incoming_message = ConversationMessage(
                sender_email=email_data['from'],
                subject=email_data['subject'],
                body=email_data['body'],
                direction=MessageDirection.INCOMING,
                created_at=email_data['timestamp'],
                message_id=message_id
            )
            db.add(incoming_message)
            db.commit()
            
            # Generate AI response with retries
            max_retries = 3
            ai_response = None
            for attempt in range(max_retries):
                try:
                    prompt = self._create_prompt(email_data, db)
                    ai_response = await self.ai_service.generate_response(prompt)
                    break
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    self.logger.warning(f"Retry {attempt + 1}/{max_retries} for AI response: {e}")
                    await asyncio.sleep(2 ** attempt)  # Exponential backoff
            
            if not ai_response:
                raise Exception("Failed to generate AI response after retries")
            
            # Generate message ID for response
            response_message_id = self._generate_message_id({
                'from': self.config.EMAIL_SERVICE_USERNAME,
                'subject': f"Re: {email_data['subject']}",
                'timestamp': datetime.now(),
                'body': ai_response.content
            })
            
            # Store AI response
            outgoing_message = ConversationMessage(
                sender_email=self.config.EMAIL_SERVICE_USERNAME,
                recipient_email=email_data['from'],
                subject=f"Re: {email_data['subject']}",
                body=ai_response.content,
                direction=MessageDirection.OUTGOING,
                thread_id=incoming_message.id,
                created_at=datetime.now(),
                message_id=response_message_id
            )
            db.add(outgoing_message)
            db.commit()
            
            # Send response email with retries
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    await self.email_service.send_email(
                        to_email=email_data['from'],
                        subject=f"Re: {email_data['subject']}",
                        body=ai_response.content
                    )
                    break
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise
                    self.logger.warning(f"Retry {attempt + 1}/{max_retries} for sending email: {e}")
                    await asyncio.sleep(2 ** attempt)
            
            self.logger.info(f"Successfully processed email from {email_data['from']}")
            
        except Exception as e:
            self.logger.error(f"Error processing email: {e}")
            # Notify admin of processing error
            await self._notify_admin_of_error(email_data, str(e))
            raise
        finally:
            if db:
                db.close()
    
    async def _notify_admin_of_error(self, email_data: Dict[str, Any], error: str):
        """Notify admin of processing errors"""
        try:
            subject = f"Error Processing Email: {email_data['subject'][:50]}..."
            body = f"""
            Error processing email:
            From: {email_data['from']}
            Subject: {email_data['subject']}
            Error: {error}
            Timestamp: {datetime.now()}
            """
            await self.email_service.send_email(
                to_email=self.config.ADMIN_EMAIL,
                subject=subject,
                body=body
            )
        except Exception as e:
            self.logger.error(f"Error notifying admin: {e}")
    
    def _create_prompt(self, email_data: Dict[str, Any], db) -> str:
        """Create AI prompt with context"""
        # Get thread history if available
        thread_messages = []
        if 'thread_id' in email_data:
            thread_messages = (
                db.query(ConversationMessage)
                .filter_by(thread_id=email_data['thread_id'])
                .order_by(ConversationMessage.created_at)
                .all()
            )
        
        prompt = f"""
        Process the following email:
        
        From: {email_data['from']}
        Subject: {email_data['subject']}
        Content: {email_data['body']}
        
        Previous thread messages:
        {self._format_thread_history(thread_messages)}
        """
        return prompt
    
    def _format_thread_history(self, messages: list) -> str:
        """Format thread history for AI context"""
        if not messages:
            return "No previous messages"
        
        history = []
        for msg in messages:
            history.append(f"""
            From: {msg.sender_email}
            Time: {msg.created_at}
            Content: {msg.body}
            """)
        return "\n".join(history)
    
    async def start(self):
        """Start the email processor"""
        if not self.is_running:
            try:
                # Initialize services
                if not await self.email_service.connect():
                    raise RuntimeError("Failed to connect to email service")
                
                if not await self.ai_service.start():
                    raise RuntimeError("Failed to start AI service")
                
                self.is_running = True
                self.logger.info("Email processor started successfully")
                return True
            except Exception as e:
                self.logger.error(f"Failed to start email processor: {e}")
                return False
        return True

    async def stop(self):
        """Stop the email processor"""
        if self.is_running:
            try:
                await self.email_service.disconnect()
                await self.ai_service.stop()
                self.is_running = False
                self.logger.info("Email processor stopped")
            except Exception as e:
                self.logger.error(f"Error stopping email processor: {e}")

    async def process_emails(self):
        """Process unread emails with enhanced error handling"""
        if not self.is_running:
            await self.start()
        
        async with self.processing_lock:
            try:
                # Fetch unread emails
                emails = await self.email_service.fetch_unread_emails()
                if not emails:
                    self.logger.info("No new emails to process")
                    return
                
                self.logger.info(f"Processing {len(emails)} new emails")
                
                for email_data in emails:
                    start_time = time.time()
                    try:
                        # Analyze email
                        analysis = await self.ai_service.analyze_email(email_data['body'])
                        
                        # Generate response
                        response = await self.ai_service.generate_response(
                            email_content=email_data['body'],
                            analysis=analysis
                        )
                        
                        # Validate response
                        validation = await self.ai_service.validate_response(response)
                        
                        if validation.is_valid:
                            # Send response
                            success = await self.email_service.send_email(
                                to_email=email_data['from'],
                                subject=f"Re: {email_data['subject']}",
                                body=response['content']
                            )
                            
                            if success:
                                self.metrics["successful_responses"] += 1
                                self.logger.info(f"Successfully processed email: {email_data['subject']}")
                            else:
                                self.metrics["failed_responses"] += 1
                                self.logger.error(f"Failed to send response for email: {email_data['subject']}")
                        else:
                            self.metrics["failed_responses"] += 1
                            self.logger.warning(
                                f"Response validation failed for email: {email_data['subject']}\n"
                                f"Issues: {validation.issues}"
                            )
                        
                        # Update metrics
                        self.metrics["emails_processed"] += 1
                        processing_time = time.time() - start_time
                        self.metrics["avg_response_time"] = (
                            (self.metrics["avg_response_time"] * (self.metrics["emails_processed"] - 1) + processing_time) /
                            self.metrics["emails_processed"]
                        )
                        
                    except Exception as e:
                        self.logger.error(f"Error processing email {email_data['subject']}: {e}")
                        self.metrics["failed_responses"] += 1
                        self.metrics["errors"].append({
                            "timestamp": datetime.now(),
                            "error": str(e),
                            "email_subject": email_data['subject']
                        })
                
            except Exception as e:
                self.logger.error(f"Error in email processing loop: {e}")
                raise

    async def check_health(self) -> Dict[str, Any]:
        """Check processor health status"""
        try:
            email_health = await self.email_service.check_health()
            ai_health = await self.ai_service.check_health()
            
            return {
                "status": "healthy" if self.is_running else "stopped",
                "last_check": datetime.now().isoformat(),
                "email_service": email_health,
                "ai_service": ai_health,
                "metrics": self.metrics
            }
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            return {
                "status": "error",
                "last_check": datetime.now().isoformat(),
                "error": str(e)
            } 