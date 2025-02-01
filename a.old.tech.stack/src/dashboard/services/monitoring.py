from typing import Dict, Any, List
from datetime import datetime, timedelta
import asyncio
import logging
from dataclasses import dataclass
import json
import psutil
import os
from pathlib import Path

@dataclass
class ServiceMetrics:
    service_name: str
    status: str
    uptime: float
    error_rate: float
    latency: float
    queue_size: int
    last_updated: datetime

@dataclass
class SystemMetrics:
    cpu_usage: float
    memory_usage: float
    disk_usage: float
    network_io: Dict[str, float]

class MonitoringService:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.service_metrics: Dict[str, ServiceMetrics] = {}
        self.system_metrics: SystemMetrics = None
        self.update_interval = 60  # seconds
        self.dashboard_dir = Path(__file__).parent.parent / 'data'
        self.dashboard_dir.mkdir(exist_ok=True)

    async def start_monitoring(self):
        """Start the monitoring service"""
        self.logger.info("Starting monitoring service")
        while True:
            try:
                await self.update_metrics()
                await self.generate_dashboard()
                await asyncio.sleep(self.update_interval)
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {str(e)}")
                await asyncio.sleep(5)  # Brief pause before retry

    async def update_metrics(self):
        """Update all service and system metrics"""
        await self.update_service_metrics()
        await self.update_system_metrics()

    async def update_service_metrics(self):
        """Update metrics for all services"""
        services = ['email_fetcher', 'email_processor', 'ai_analysis', 'response_generator']
        for service in services:
            try:
                metrics = await self.fetch_service_metrics(service)
                self.service_metrics[service] = metrics
            except Exception as e:
                self.logger.error(f"Error updating metrics for {service}: {str(e)}")

    async def fetch_service_metrics(self, service_name: str) -> ServiceMetrics:
        """Fetch metrics for a specific service"""
        # This would typically make API calls to the service
        # For now, return dummy data
        return ServiceMetrics(
            service_name=service_name,
            status="running",
            uptime=3600.0,
            error_rate=0.01,
            latency=100.0,
            queue_size=10,
            last_updated=datetime.now()
        )

    async def update_system_metrics(self):
        """Update system-wide metrics"""
        try:
            cpu_usage = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            net_io = psutil.net_io_counters()
            
            self.system_metrics = SystemMetrics(
                cpu_usage=cpu_usage,
                memory_usage=memory.percent,
                disk_usage=disk.percent,
                network_io={
                    "in": net_io.bytes_recv / 1024,  # KB
                    "out": net_io.bytes_sent / 1024  # KB
                }
            )
        except Exception as e:
            self.logger.error(f"Error updating system metrics: {str(e)}")

    async def generate_dashboard(self):
        """Generate the dashboard files"""
        try:
            # Generate main status file
            await self.generate_status_file()
            
            # Generate metrics file
            await self.generate_metrics_file()
            
            # Generate alerts file
            await self.generate_alerts_file()
            
            self.logger.info("Dashboard files updated successfully")
        except Exception as e:
            self.logger.error(f"Error generating dashboard: {str(e)}")

    async def generate_status_file(self):
        """Generate the main status dashboard file"""
        status_file = self.dashboard_dir / 'status.md'
        content = [
            "# System Dashboard",
            f"\nLast Updated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n",
            "## Service Status\n",
            self.generate_service_status_table(),
            "\n## System Metrics\n",
            self.generate_system_metrics_section(),
            "\n## Recent Activity\n",
            self.generate_activity_section(),
            "\n## Alerts\n",
            self.generate_alerts_section()
        ]
        
        status_file.write_text("\n".join(content))

    async def generate_metrics_file(self):
        """Generate detailed metrics file"""
        metrics_file = self.dashboard_dir / 'metrics.json'
        metrics_data = {
            "timestamp": datetime.now().isoformat(),
            "services": {
                name: {
                    "status": metrics.status,
                    "uptime": metrics.uptime,
                    "error_rate": metrics.error_rate,
                    "latency": metrics.latency,
                    "queue_size": metrics.queue_size,
                    "last_updated": metrics.last_updated.isoformat()
                }
                for name, metrics in self.service_metrics.items()
            },
            "system": {
                "cpu_usage": self.system_metrics.cpu_usage,
                "memory_usage": self.system_metrics.memory_usage,
                "disk_usage": self.system_metrics.disk_usage,
                "network_io": self.system_metrics.network_io
            } if self.system_metrics else {}
        }
        
        metrics_file.write_text(json.dumps(metrics_data, indent=2))

    async def generate_alerts_file(self):
        """Generate alerts file"""
        alerts_file = self.dashboard_dir / 'alerts.md'
        alerts = self.generate_alerts_section()
        alerts_file.write_text(alerts)

    def generate_service_status_table(self) -> str:
        """Generate the service status table in markdown"""
        headers = ["Service", "Status", "Uptime", "Error Rate", "Latency", "Queue Size"]
        separator = ["-" * len(h) for h in headers]
        
        rows = [
            headers,
            separator
        ]
        
        for metrics in self.service_metrics.values():
            rows.append([
                metrics.service_name,
                metrics.status,
                f"{metrics.uptime/3600:.1f}h",
                f"{metrics.error_rate*100:.2f}%",
                f"{metrics.latency:.0f}ms",
                str(metrics.queue_size)
            ])
        
        return "\n".join(["|".join(row) for row in rows])

    def generate_system_metrics_section(self) -> str:
        """Generate the system metrics section"""
        if not self.system_metrics:
            return "No system metrics available"
        
        return f"""
### Resource Usage
- CPU: {self.system_metrics.cpu_usage:.1f}%
- Memory: {self.system_metrics.memory_usage:.1f}%
- Disk: {self.system_metrics.disk_usage:.1f}%
- Network I/O:
  - In: {self.system_metrics.network_io['in']:.0f} KB/s
  - Out: {self.system_metrics.network_io['out']:.0f} KB/s
"""

    def generate_activity_section(self) -> str:
        """Generate the recent activity section"""
        # This would typically come from a log or activity database
        return """
- Email Processor processed 100 emails in the last hour
- AI Service completed 50 analysis requests
- Response Generator created 75 responses
- Email Fetcher retrieved 150 new emails
"""

    def generate_alerts_section(self) -> str:
        """Generate the alerts section"""
        alerts = []
        
        # Check system metrics
        if self.system_metrics:
            if self.system_metrics.cpu_usage > 80:
                alerts.append("⚠️ High CPU usage detected")
            if self.system_metrics.memory_usage > 80:
                alerts.append("⚠️ High memory usage detected")
            if self.system_metrics.disk_usage > 80:
                alerts.append("⚠️ High disk usage detected")
        
        # Check service metrics
        for service_name, metrics in self.service_metrics.items():
            if metrics.error_rate > 0.05:
                alerts.append(f"⚠️ High error rate in {service_name}")
            if metrics.latency > 200:
                alerts.append(f"⚠️ High latency in {service_name}")
            if metrics.queue_size > 100:
                alerts.append(f"⚠️ Large queue size in {service_name}")
        
        if not alerts:
            alerts.append("✅ All systems operating normally")
        
        return "\n".join(alerts)

class MonitoringManager:
    def __init__(self):
        self.monitoring = MonitoringService()
        self.logger = logging.getLogger(__name__)

    async def start(self):
        """Start the monitoring manager"""
        self.logger.info("Starting Monitoring Manager")
        await self.monitoring.start_monitoring()

if __name__ == "__main__":
    # Setup logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    # Create and run monitoring manager
    async def main():
        manager = MonitoringManager()
        await manager.start()
    
    asyncio.run(main()) 