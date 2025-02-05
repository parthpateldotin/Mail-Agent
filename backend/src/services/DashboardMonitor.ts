import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';
import { HandshakeManager } from './HandshakeManager';
import { EmailMetrics } from '../types/email';

interface ServiceMetrics {
  status: 'active' | 'inactive' | 'error';
  lastUpdate: Date;
  metrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    successRate: number;
  };
}

interface DashboardMetrics {
  email: EmailMetrics;
  services: Record<string, ServiceMetrics>;
  handshakes: {
    total: number;
    successful: number;
    failed: number;
    averageTime: number;
    recentHandshakes: Array<{
      id: string;
      type: string;
      status: string;
      timestamp: Date;
    }>;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
}

export class DashboardMonitor extends EventEmitter {
  private metrics: DashboardMetrics;
  private logger: Logger;
  private updateInterval: ReturnType<typeof setTimeout> | null = null;

  constructor(private handshakeManager: HandshakeManager) {
    super();
    this.logger = new Logger('DashboardMonitor');
    this.metrics = this.initializeMetrics();
    this.setupEventListeners();
  }

  private initializeMetrics(): DashboardMetrics {
    return {
      email: {
        totalProcessed: 0,
        successfulResponses: 0,
        failedResponses: 0,
        averageResponseTime: 0,
        responseRate: 0,
        categories: {},
        priorities: {},
        hourlyDistribution: {},
      },
      services: {},
      handshakes: {
        total: 0,
        successful: 0,
        failed: 0,
        averageTime: 0,
        recentHandshakes: [],
      },
      performance: {
        cpuUsage: 0,
        memoryUsage: 0,
        activeConnections: 0,
        requestsPerMinute: 0,
      },
    };
  }

  start(): void {
    if (this.updateInterval) {
      return;
    }

    this.updateInterval = setInterval(() => {
      this.updateMetrics();
      this.emit('metrics:updated', this.metrics);
    }, 5000); // Update every 5 seconds

    this.logger.info('Dashboard monitor started');
  }

  stop(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }

    this.logger.info('Dashboard monitor stopped');
  }

  private setupEventListeners(): void {
    this.handshakeManager.on('handshake:initiated', (handshake) => {
      this.metrics.handshakes.total++;
      this.updateHandshakeMetrics(handshake);
    });

    this.handshakeManager.on('handshake:completed', (handshake) => {
      this.metrics.handshakes.successful++;
      this.updateHandshakeMetrics(handshake);
    });

    this.handshakeManager.on('handshake:failed', (handshake) => {
      this.metrics.handshakes.failed++;
      this.updateHandshakeMetrics(handshake);
    });

    this.handshakeManager.on('service:status', (state) => {
      this.updateServiceMetrics(state);
    });
  }

  private updateHandshakeMetrics(handshake: any): void {
    this.metrics.handshakes.recentHandshakes.unshift({
      id: handshake.id,
      type: handshake.type,
      status: handshake.status,
      timestamp: handshake.timestamp,
    });

    // Keep only the most recent 100 handshakes
    if (this.metrics.handshakes.recentHandshakes.length > 100) {
      this.metrics.handshakes.recentHandshakes.pop();
    }

    // Update average time
    const completedHandshakes = this.metrics.handshakes.recentHandshakes.filter(
      (h) => h.status === 'completed'
    );
    if (completedHandshakes.length > 0) {
      const totalTime = completedHandshakes.reduce(
        (sum, h) => sum + (new Date().getTime() - h.timestamp.getTime()),
        0
      );
      this.metrics.handshakes.averageTime = totalTime / completedHandshakes.length;
    }
  }

  private updateServiceMetrics(state: any): void {
    this.metrics.services[state.id] = {
      status: state.status,
      lastUpdate: state.lastUpdate,
      metrics: {
        requestCount: state.metrics.requestCount,
        errorCount: state.metrics.errorCount,
        averageResponseTime: state.metrics.averageResponseTime,
        successRate:
          state.metrics.requestCount > 0
            ? ((state.metrics.requestCount - state.metrics.errorCount) /
                state.metrics.requestCount) *
              100
            : 0,
      },
    };
  }

  private updateMetrics(): void {
    // Update performance metrics
    const performanceMetrics = this.getPerformanceMetrics();
    this.metrics.performance = {
      ...this.metrics.performance,
      ...performanceMetrics,
    };

    this.logger.info('Metrics updated', { metrics: this.metrics });
  }

  private getPerformanceMetrics() {
    const used = process.memoryUsage();
    return {
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      memoryUsage: Math.round((used.heapUsed / used.heapTotal) * 100),
      activeConnections: 0, // This would need to be updated by your server
      requestsPerMinute: 0, // This would need to be updated by your server
    };
  }

  getMetrics(): DashboardMetrics {
    return { ...this.metrics };
  }

  updateEmailMetrics(metrics: Partial<EmailMetrics>): void {
    this.metrics.email = {
      ...this.metrics.email,
      ...metrics,
    };
  }
} 