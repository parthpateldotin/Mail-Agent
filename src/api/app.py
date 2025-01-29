from flask import Flask, jsonify, request
from flask_cors import CORS
from src.config.config import Config
from src.email.services.email_processor import EmailProcessor
from apscheduler.schedulers.background import BackgroundScheduler
from pytz import UTC
import logging
from datetime import datetime
from src.database.models.conversation_messages import ConversationMessage, MessageDirection
from src.database.database_config import SessionLocal

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

# Initialize services at module level
config = Config()
email_processor = EmailProcessor(config)

def create_app():
    app = Flask(__name__)
    CORS(app)  # Enable CORS for all routes
    
    # Add this for more detailed logging
    app.logger.setLevel(logging.DEBUG)
    
    # Load configuration
    app.config.from_object(config)
    
    # Configure APScheduler
    scheduler = BackgroundScheduler(timezone=UTC)
    
    @app.errorhandler(Exception)
    def handle_error(error):
        logger.error(f"Unhandled error: {str(error)}", exc_info=True)
        return jsonify({
            'status': 'error',
            'message': str(error)
        }), 500
    
    @app.before_request
    def log_request_info():
        logger.debug('Headers: %s', request.headers)
        logger.debug('Body: %s', request.get_data())
    
    def process_emails():
        """Background job to process emails"""
        try:
            email_processor.process_emails()
        except Exception as e:
            app.logger.error(f"Error in scheduled email processing: {e}")
    
    # Schedule email processing every 5 minutes
    scheduler.add_job(
        process_emails, 
        'interval', 
        minutes=5,
        id='process_emails'
    )
    scheduler.start()
    
    @app.route('/')
    def health_check():
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
    
    return app

# This allows running with flask run command
app = create_app()

if __name__ == '__main__':
    app.run(debug=True)