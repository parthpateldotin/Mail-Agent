import asyncio
import threading
from typing import Optional, Any, Callable
from functools import wraps
import logging

logger = logging.getLogger(__name__)

class EventLoopManager:
    """Singleton class to manage event loops across threads."""
    _instance = None
    _lock = threading.Lock()
    _loop: Optional[asyncio.AbstractEventLoop] = None
    _thread_id: Optional[int] = None

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(EventLoopManager, cls).__new__(cls)
            return cls._instance

    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def get_loop(self) -> asyncio.AbstractEventLoop:
        """Get the event loop for the current thread."""
        current_thread_id = threading.get_ident()
        
        # If we're in the same thread and have a loop, return it
        if (self._thread_id == current_thread_id and 
            self._loop is not None and 
            not self._loop.is_closed()):
            return self._loop
        
        # Get the current event loop or create a new one
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        # Update instance variables
        self._loop = loop
        self._thread_id = current_thread_id
        
        return loop

    def set_loop(self, loop: asyncio.AbstractEventLoop):
        """Set the event loop for the current thread."""
        self._loop = loop
        self._thread_id = threading.get_ident()

    def close_loop(self):
        """Close the current event loop."""
        if self._loop is not None and not self._loop.is_closed():
            self._loop.close()
            self._loop = None
            self._thread_id = None

def run_async(func: Callable) -> Callable:
    """Decorator to run async functions in sync context."""
    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        loop = EventLoopManager().get_loop()
        
        if loop.is_running():
            # If we're already in an event loop, create a new one for this call
            new_loop = asyncio.new_event_loop()
            try:
                return new_loop.run_until_complete(func(*args, **kwargs))
            finally:
                new_loop.close()
        else:
            # Use the existing loop
            return loop.run_until_complete(func(*args, **kwargs))
    
    return wrapper

async def run_in_threadpool(func: Callable, *args, **kwargs) -> Any:
    """Run a synchronous function in a thread pool."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, lambda: func(*args, **kwargs))

def get_event_loop() -> asyncio.AbstractEventLoop:
    """Get the current event loop or create a new one."""
    return EventLoopManager().get_loop()

def set_event_loop(loop: asyncio.AbstractEventLoop):
    """Set the current event loop."""
    EventLoopManager().set_loop(loop)

def close_event_loop():
    """Close the current event loop."""
    EventLoopManager().close_loop() 