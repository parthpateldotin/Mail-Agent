from flask import Flask, jsonify, request
from flask_cors import CORS
from src.config import Config
from src.email.services.email_processor import EmailProcessor
from src.email.services.email_service import EmailService
from src.email.services.ai_service import AIService
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import UTC
import logging
from datetime import datetime
from src.database.models.conversation_messages import ConversationMessage, MessageDirection
from src.database.database_config import SessionLocal
import asyncio
from typing import Dict, Any
import nest_asyncio
from src.utils.event_loop import EventLoopManager, async_handler, run_async, cleanup_event_loop
import threading
import atexit
import signal
import json
from src.utils.port_utils import find_available_port

# Enable nested event loops
nest_asyncio.apply()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Global initialization lock
init_lock = threading.Lock()
services_initialized = False

def create_app():
    app = Flask(__name__)
    
    # Configure CORS properly
    CORS(app, resources={
        r"/*": {
            "origins": ["http://localhost:8501", "http://127.0.0.1:8501"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True
        }
    })
    
    # Add this for more detailed logging
    app.logger.setLevel(logging.DEBUG)
    
    # Load configuration
    config = Config()
    
    # Configure APScheduler
    scheduler = BackgroundScheduler(timezone=UTC)
    
    # Initialize services at module level with proper async handling
    email_service = EmailService(config)
    ai_service = AIService(config)
    email_processor = EmailProcessor(config)
    
    # Initialize event loop manager
    loop_manager = EventLoopManager.get_instance()
    
    def signal_handler(signum, frame):
        """Handle shutdown signals"""
        logger.info(f"Received signal {signum}")
        cleanup_services_sync()
    
    # Register signal handlers
    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)
    
    def cleanup_services_sync():
        """Synchronous cleanup of services"""
        logger.info("Starting synchronous cleanup of services...")
        try:
            if scheduler and scheduler.running:
                scheduler.shutdown(wait=False)  # Changed to non-blocking
            if email_processor:
                email_processor.stop_processing()
            logger.info("Services cleaned up successfully")
        except Exception as e:
            logger.error(f"Error during synchronous cleanup: {e}")
        finally:
            try:
                loop = loop_manager.get_loop()
                if loop and not loop.is_closed():
                    loop.call_soon_threadsafe(cleanup_event_loop)
            except Exception as e:
                logger.error(f"Error cleaning up event loop: {e}")
    
    # Register cleanup on normal exit
    atexit.register(cleanup_services_sync)
    
    async def initialize_services_async():
        """Initialize services asynchronously"""
        global services_initialized
        
        if services_initialized:
            return True
            
        try:
            # Start initialization in background tasks
            init_tasks = []
            
            # Initialize email service in background
            init_tasks.append(asyncio.create_task(
                email_service.connect(),
                name="email_service_init"
            ))
            
            # Start AI service in background
            init_tasks.append(asyncio.create_task(
                ai_service.start(),
                name="ai_service_init"
            ))
            
            # Start email processor
            email_processor.start_processing()
            
            # Wait for critical services with timeout
            try:
                done, pending = await asyncio.wait(init_tasks, timeout=10)
                for task in pending:
                    task.cancel()
                services_initialized = True
                logger.info("All services started successfully")
            except asyncio.TimeoutError:
                logger.warning("Service initialization timed out, continuing with partial initialization")
                services_initialized = True
            except Exception as e:
                logger.error(f"Error during service initialization: {e}")
                services_initialized = False
            
            return services_initialized
        except Exception as e:
            logger.error(f"Error during startup: {e}")
            await cleanup_services()
            return False
    
    @app.before_request
    def check_services():
        """Check if services are initialized before each request"""
        try:
            if not services_initialized:
                loop = loop_manager.get_loop()
                if loop and not loop.is_closed():
                    asyncio.run_coroutine_threadsafe(initialize_services_async(), loop)
                else:
                    return jsonify({
                        'status': 'error',
                        'message': 'Event loop not available'
                    }), 500
        except Exception as e:
            logger.error(f"Error checking services: {e}")
            return jsonify({
                'status': 'error',
                'message': 'Service check failed'
            }), 500
    
    @app.route('/health')
    @async_handler
    async def health():
        """Get health status of all services"""
        try:
            # Get event loop for async operations
            loop = loop_manager.get_loop()
            if not loop or loop.is_closed():
                return jsonify({
                    "status": "error",
                    "message": "Event loop not available"
                }), 500

            # Start initialization if not done
            if not services_initialized:
                asyncio.create_task(initialize_services_async())
            
            try:
                # Run health checks with timeout
                email_health = await asyncio.wait_for(
                    email_service.check_health(),
                    timeout=5
                )
                ai_health = await asyncio.wait_for(
                    ai_service.check_health(),
                    timeout=5
                )
            except asyncio.TimeoutError:
                logger.warning("Health check timed out")
                return jsonify({
                    "status": "error",
                    "message": "Health check timed out",
                    "timestamp": datetime.now().isoformat()
                }), 503
            
            processor_status = email_processor.get_queue_status()
            
            return jsonify({
                "status": "initializing" if not services_initialized else "healthy",
                "timestamp": datetime.now().isoformat(),
                "services": {
                    "email_service": {
                        "status": "healthy" if email_health.status else "error",
                        "imap_connected": email_health.imap_connected,
                        "smtp_connected": email_health.smtp_connected,
                        "last_check": email_health.last_check.isoformat(),
                        "error": email_health.error
                    },
                    "ai_service": {
                        "status": ai_health.get("status", "error"),
                        "api_status": ai_health.get("api_status", "unknown"),
                        "last_check": ai_health.get("last_check", datetime.now()).isoformat()
                    },
                    "email_processor": {
                        "status": "healthy" if processor_status.processing else "idle",
                        "queue_size": processor_status.size,
                        "processing": processor_status.processing,
                        "processed": processor_status.processed,
                        "failed": processor_status.failed,
                        "avg_processing_time": processor_status.avg_processing_time
                    }
                }
            })
        except Exception as e:
            logger.error(f"Error in health endpoint: {e}")
            return jsonify({
                "status": "error",
                "timestamp": datetime.now().isoformat(),
                "message": str(e)
            }), 500
    
    @app.route('/metrics')
    @async_handler
    async def get_metrics():
        """Get service metrics"""
        try:
            email_metrics = email_service.report_metrics()
            processor_status = email_processor.get_queue_status()
            
            return jsonify({
                "timestamp": datetime.now().isoformat(),
                "email_service": {
                    "total_fetched": email_metrics.total_fetched,
                    "total_sent": email_metrics.total_sent,
                    "failed_fetches": email_metrics.failed_fetches,
                    "failed_sends": email_metrics.failed_sends,
                    "avg_fetch_time": email_metrics.avg_fetch_time,
                    "avg_send_time": email_metrics.avg_send_time,
                    "last_fetch": email_metrics.last_fetch.isoformat(),
                    "last_send": email_metrics.last_send.isoformat()
                },
                "email_processor": {
                    "queue_size": processor_status.size,
                    "processing": processor_status.processing,
                    "processed": processor_status.processed,
                    "failed": processor_status.failed,
                    "avg_processing_time": processor_status.avg_processing_time
                }
            })
        except Exception as e:
            logger.error(f"Error getting metrics: {e}")
            return jsonify({
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            }), 500
    
    @app.route('/')
    def health_check_old():
        """Health check endpoint with basic stats"""
        try:
            db = SessionLocal()
            total_messages = db.query(ConversationMessage).count()
            last_message = db.query(ConversationMessage).order_by(
                ConversationMessage.created_at.desc()
            ).first()
            
            return jsonify({
                'status': 'healthy',
                'total_messages': total_messages,
                'last_message_time': last_message.created_at if last_message else None,
                'email_processor_status': 'running' if email_processor.is_processing else 'stopped'
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'unhealthy',
                'error': str(e)
            }), 500
        finally:
            db.close()
    
    @app.route('/process', methods=['POST'])
    def trigger_processing():
        """Manually trigger email processing"""
        try:
            process_emails()
            return jsonify({
                'status': 'success',
                'message': 'Email processing triggered successfully'
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'error': str(e)
            }), 500
    
    @app.route('/stats')
    def get_stats():
        """Get detailed system statistics"""
        try:
            db = SessionLocal()
            
            # Get time-based stats
            now = datetime.now()
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            
            # Query messages
            total_messages = db.query(ConversationMessage).count()
            messages_today = db.query(ConversationMessage).filter(
                ConversationMessage.created_at >= today_start
            ).count()
            
            incoming_today = db.query(ConversationMessage).filter(
                ConversationMessage.created_at >= today_start,
                ConversationMessage.direction == MessageDirection.INCOMING
            ).count()
            
            outgoing_today = db.query(ConversationMessage).filter(
                ConversationMessage.created_at >= today_start,
                ConversationMessage.direction == MessageDirection.OUTGOING
            ).count()
            
            # Get unique senders
            unique_senders = db.query(ConversationMessage.sender_email).distinct().count()
            
            return jsonify({
                'total_messages': total_messages,
                'messages_today': messages_today,
                'incoming_today': incoming_today,
                'outgoing_today': outgoing_today,
                'unique_senders': unique_senders,
                'response_rate': (outgoing_today/incoming_today*100 if incoming_today > 0 else 0),
                'processor_status': {
                    'is_running': email_processor.is_processing,
                    'queue_size': email_processor.processing_queue.qsize()
                }
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'error': str(e)
            }), 500
        finally:
            db.close()
    
    @app.route('/control/start', methods=['POST'])
    def start_processor():
        """Start the email processor"""
        try:
            email_processor.start_processing()
            return jsonify({
                'status': 'success',
                'message': 'Email processor started'
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'error': str(e)
            }), 500
    
    @app.route('/control/stop', methods=['POST'])
    def stop_processor():
        """Stop the email processor"""
        try:
            email_processor.stop_processing()
            return jsonify({
                'status': 'success',
                'message': 'Email processor stopped'
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'error': str(e)
            }), 500
    
    @app.route('/messages')
    def get_messages():
        """Get recent messages with pagination"""
        try:
            db = SessionLocal()
            
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            
            # Get total count
            total = db.query(ConversationMessage).count()
            
            # Get paginated messages
            messages = (
                db.query(ConversationMessage)
                .order_by(ConversationMessage.created_at.desc())
                .offset((page - 1) * per_page)
                .limit(per_page)
                .all()
            )
            
            return jsonify({
                'total': total,
                'page': page,
                'per_page': per_page,
                'messages': [{
                    'id': msg.id,
                    'sender': msg.sender_email,
                    'subject': msg.subject,
                    'direction': msg.direction.value,
                    'created_at': msg.created_at.isoformat(),
                    'thread_id': msg.thread_id
                } for msg in messages]
            }), 200
        except Exception as e:
            return jsonify({
                'status': 'error',
                'error': str(e)
            }), 500
        finally:
            db.close()
    
    @app.after_request
    def after_request(response):
        """Add headers to every response."""
        response.headers.add('Access-Control-Allow-Credentials', 'true')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
        response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
        return response

    return app

# Initialize app with services
app = create_app()

if __name__ == '__main__':
    port = find_available_port(5001)
    app.run(port=port)