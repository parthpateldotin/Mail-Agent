import asyncio
import logging
from functools import wraps
from typing import Any, Callable, Coroutine, Optional
import threading
import time

logger = logging.getLogger(__name__)

# Create a single event loop instance
_event_loop = None

def get_event_loop():
    global _event_loop
    if _event_loop is None:
        _event_loop = asyncio.new_event_loop()
        asyncio.set_event_loop(_event_loop)
    return _event_loop

class EventLoopManager:
    _instance = None
    _lock = threading.Lock()
    _thread_local = threading.local()
    
    def __init__(self):
        self._main_loop = None
        self._is_initialized = False
        self.logger = logging.getLogger(__name__)
        
    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = cls()
        return cls._instance
    
    def init_loop(self):
        """Initialize the event loop for the current thread"""
        if threading.current_thread() is threading.main_thread():
            if not self._is_initialized:
                with self._lock:
                    if not self._is_initialized:
                        try:
                            self._main_loop = asyncio.get_event_loop()
                        except RuntimeError:
                            self._main_loop = asyncio.new_event_loop()
                            asyncio.set_event_loop(self._main_loop)
                        self._is_initialized = True
                        self.logger.info("Event loop initialized successfully")
        else:
            # For non-main threads, always create a new loop
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            self._thread_local.loop = loop
            self.logger.debug(f"Created new event loop for thread {threading.current_thread().name}")
    
    def get_loop(self) -> asyncio.AbstractEventLoop:
        """Get the event loop for the current thread"""
        # Check if we're in the main thread
        if threading.current_thread() is threading.main_thread():
            if not self._is_initialized:
                self.init_loop()
            return self._main_loop
            
        # For other threads, use thread-local storage
        if not hasattr(self._thread_local, 'loop'):
            self.init_loop()
        return self._thread_local.loop
    
    def cleanup_loop(self):
        """Clean up the event loop for the current thread"""
        try:
            if threading.current_thread() is threading.main_thread():
                if self._main_loop is not None:
                    # Cancel all tasks
                    pending = asyncio.all_tasks(self._main_loop)
                    if pending:
                        self._main_loop.run_until_complete(
                            asyncio.gather(*pending, return_exceptions=True)
                        )
                    self._main_loop.close()
                    self._main_loop = None
                    self._is_initialized = False
            else:
                if hasattr(self._thread_local, 'loop'):
                    loop = self._thread_local.loop
                    if loop.is_running():
                        pending = asyncio.all_tasks(loop)
                        if pending:
                            loop.run_until_complete(
                                asyncio.gather(*pending, return_exceptions=True)
                            )
                    loop.close()
                    delattr(self._thread_local, 'loop')
                    asyncio.set_event_loop(None)
        except Exception as e:
            self.logger.error(f"Error during event loop cleanup: {e}")

def run_async(coro):
    """Run an async coroutine in the current thread's event loop"""
    loop = EventLoopManager.get_instance().get_loop()
    if loop.is_running():
        # If the loop is running, create a new one for this call
        new_loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(new_loop)
            return new_loop.run_until_complete(coro)
        finally:
            new_loop.close()
            asyncio.set_event_loop(loop)
    else:
        return loop.run_until_complete(coro)

async def cleanup_event_loop():
    """Cleanup the event loop and all resources"""
    try:
        EventLoopManager.get_instance().cleanup_loop()
    except Exception as e:
        logging.error(f"Error during event loop cleanup: {e}")

def async_handler(f):
    """Decorator to handle async route handlers"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        try:
            result = f(*args, **kwargs)
            if asyncio.iscoroutine(result):
                return run_async(result)
            return result
        except Exception as e:
            logging.error(f"Error in async handler: {e}")
            raise
    return wrapper 