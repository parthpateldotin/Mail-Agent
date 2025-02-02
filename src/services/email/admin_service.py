import asyncio
from typing import Dict, Any, Optional, List
from datetime import datetime
import logging
import re
from dataclasses import dataclass

from src.core.config import get_app_settings
from src.utils import event_loop

@dataclass
class AdminCommand:
    command: str
    args: Dict[str, Any]
    timestamp: datetime
    sender: str

class AdminService:
    def __init__(self):
        self.settings = get_app_settings()
        self.logger = logging.getLogger(__name__)
        self.is_running = False
        self.last_command = None
        self.metrics = {
            "total_commands": 0,
            "successful_commands": 0,
            "failed_commands": 0,
            "last_command_time": None,
            "command_history": []
        }
        self.command_handlers = {
            "status": self._handle_status_command,
            "stop": self._handle_stop_command,
            "start": self._handle_start_command,
            "restart": self._handle_restart_command,
            "config": self._handle_config_command,
            "help": self._handle_help_command
        }
    
    async def start(self) -> bool:
        """Start the admin service"""
        try:
            self.is_running = True
            self.logger.info("Admin service started successfully")
            return True
        except Exception as e:
            self.logger.error(f"Failed to start admin service: {e}")
            return False
    
    async def stop(self):
        """Stop the admin service"""
        try:
            self.is_running = False
            self.logger.info("Admin service stopped")
        except Exception as e:
            self.logger.error(f"Error stopping admin service: {e}")
    
    def process_admin_command(self, email_data: Dict[str, Any]) -> Optional[str]:
        """Process admin commands from email"""
        try:
            # Extract command from email subject or body
            command_match = re.search(r'!(\w+)(?:\s+(.+))?', email_data['subject'])
            if not command_match:
                command_match = re.search(r'!(\w+)(?:\s+(.+))?', email_data['body'])
            
            if not command_match:
                return "No valid command found in email"
            
            command = command_match.group(1).lower()
            args_str = command_match.group(2) or ""
            
            # Parse arguments
            args = {}
            if args_str:
                for arg in args_str.split():
                    if '=' in arg:
                        key, value = arg.split('=', 1)
                        args[key] = value
            
            # Create command object
            admin_command = AdminCommand(
                command=command,
                args=args,
                timestamp=datetime.now(),
                sender=email_data['from']
            )
            
            # Update metrics
            self.metrics["total_commands"] += 1
            self.metrics["last_command_time"] = admin_command.timestamp
            self.last_command = admin_command
            
            # Add to command history (keep last 100)
            self.metrics["command_history"].append({
                "command": command,
                "args": args,
                "timestamp": admin_command.timestamp.isoformat(),
                "sender": admin_command.sender
            })
            if len(self.metrics["command_history"]) > 100:
                self.metrics["command_history"] = self.metrics["command_history"][-100:]
            
            # Execute command
            if command in self.command_handlers:
                try:
                    result = self.command_handlers[command](args)
                    self.metrics["successful_commands"] += 1
                    return result
                except Exception as e:
                    self.metrics["failed_commands"] += 1
                    error_msg = f"Error executing command {command}: {str(e)}"
                    self.logger.error(error_msg)
                    return error_msg
            else:
                self.metrics["failed_commands"] += 1
                return f"Unknown command: {command}"
            
        except Exception as e:
            self.metrics["failed_commands"] += 1
            error_msg = f"Error processing admin command: {str(e)}"
            self.logger.error(error_msg)
            return error_msg
    
    def _handle_status_command(self, args: Dict[str, Any]) -> str:
        """Handle status command"""
        return f"""
        Service Status:
        Running: {self.is_running}
        Total Commands: {self.metrics['total_commands']}
        Successful Commands: {self.metrics['successful_commands']}
        Failed Commands: {self.metrics['failed_commands']}
        Last Command: {self.last_command.command if self.last_command else 'None'}
        Last Command Time: {self.metrics['last_command_time'].isoformat() if self.metrics['last_command_time'] else 'None'}
        """
    
    def _handle_stop_command(self, args: Dict[str, Any]) -> str:
        """Handle stop command"""
        if not self.is_running:
            return "Service is already stopped"
        self.is_running = False
        return "Service stopped successfully"
    
    def _handle_start_command(self, args: Dict[str, Any]) -> str:
        """Handle start command"""
        if self.is_running:
            return "Service is already running"
        self.is_running = True
        return "Service started successfully"
    
    def _handle_restart_command(self, args: Dict[str, Any]) -> str:
        """Handle restart command"""
        self.is_running = False
        self.is_running = True
        return "Service restarted successfully"
    
    def _handle_config_command(self, args: Dict[str, Any]) -> str:
        """Handle config command"""
        if not args:
            return "Current configuration settings"
        # Implement configuration update logic here
        return f"Configuration updated: {args}"
    
    def _handle_help_command(self, args: Dict[str, Any]) -> str:
        """Handle help command"""
        return """
        Available Commands:
        !status - Get service status
        !stop - Stop the service
        !start - Start the service
        !restart - Restart the service
        !config [key=value] - View or update configuration
        !help - Show this help message
        """
    
    async def check_health(self) -> Dict[str, Any]:
        """Check admin service health status"""
        try:
            return {
                "status": "healthy" if self.is_running else "stopped",
                "last_command": self.last_command.command if self.last_command else None,
                "last_command_time": self.metrics["last_command_time"].isoformat() if self.metrics["last_command_time"] else None,
                "metrics": {
                    "total_commands": self.metrics["total_commands"],
                    "successful_commands": self.metrics["successful_commands"],
                    "failed_commands": self.metrics["failed_commands"]
                }
            }
        except Exception as e:
            self.logger.error(f"Health check failed: {e}")
            return {
                "status": "error",
                "error": str(e)
            } 