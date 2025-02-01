import socket
from typing import Optional

def find_available_port(start_port: int, max_attempts: int = 10) -> Optional[int]:
    """Find an available port starting from start_port"""
    for port in range(start_port, start_port + max_attempts):
        try:
            with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
                s.bind(('', port))
                return port
        except OSError:
            continue
    return None

def get_available_port(start_port: int, max_attempts: int = 10) -> int:
    """Get an available port with fallback to random port"""
    port = find_available_port(start_port, max_attempts)
    if port is not None:
        return port
    
    # If no port found in range, get a random available port
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(('', 0))
        return s.getsockname()[1] 