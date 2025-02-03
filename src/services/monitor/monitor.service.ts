import { Logger } from '../../utils/Logger';
import os from 'os';
import { db } from '../../database/connection';
import { AgentService } from '../agent/agent.service';

export interface SystemMetrics {
  cpu: {
    usage: number;
    loadAvg: number[];
    cores: number;
  };
  memory: {
    total: number;
    used: number;
    free: number;
    heapUsed: number;
    heapTotal: number;
  };
  disk: {
    total: number;
    free: number;
    used: number;
  };
  network: {
    connections: number;
    bytesReceived: number;
    bytesSent: number;
  };
  process: {
    uptime: number;
    pid: number;
    threadCount: number;
    handlesOpen: number;
  };
}

export interface PerformanceMetrics {
  responseTime: {
    avg: number;
    p95: number;
    p99: number;
  };
  throughput: {
    requestsPerSecond: number;
    successRate: number;
    errorRate: number;
  };
  database: {
    connectionPool: number;
    activeQueries: number;
    queryLatency: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    size: number;
  };
}

export interface ErrorStats {
  total: number;
  categories: {
    [key: string]: number;
  };
  recent: Array<{
    timestamp: Date;
    code: string;
    message: string;
    stack?: string;
  }>;
  trends: {
    hourly: number[];
    daily: number[];
  };
}

export class MonitorService {
  private static instance: MonitorService;
  private metricsHistory: SystemMetrics[] = [];
  private performanceHistory: PerformanceMetrics[] = [];
  private errorStats: ErrorStats = {
    total: 0,
    categories: {},
    recent: [],
    trends: {
      hourly: new Array(24).fill(0),
      daily: new Array(30).fill(0)
    }
  };

  private constructor() {
    this.initializeMetricsCollection();
  }

  public static getInstance(): MonitorService {
    if (!MonitorService.instance) {
      MonitorService.instance = new MonitorService();
    }
    return MonitorService.instance;
  }

  private initializeMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectMetrics();
    }, 60000);
  }

  private async collectMetrics(): Promise<any[]> {
    const metrics = [];
    
    // Collect system metrics
    const systemMetrics = await this.getSystemMetrics();
    metrics.push(systemMetrics);

    // Collect application metrics
    const appMetrics = await this.getApplicationMetrics();
    metrics.push(appMetrics);

    // Collect custom metrics
    const customMetrics = await this.getCustomMetrics();
    metrics.push(customMetrics);

    return metrics;
  }

  public async getSystemMetrics(): Promise<SystemMetrics> {
    const cpus = os.cpus();
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const heapUsed = process.memoryUsage().heapUsed;
    const heapTotal = process.memoryUsage().heapTotal;

    return {
      cpu: {
        usage: process.cpuUsage().system / 1000000,
        loadAvg: os.loadavg(),
        cores: cpus.length
      },
      memory: {
        total: totalMem / 1024 / 1024,
        used: (totalMem - freeMem) / 1024 / 1024,
        free: freeMem / 1024 / 1024,
        heapUsed: heapUsed / 1024 / 1024,
        heapTotal: heapTotal / 1024 / 1024
      },
      disk: {
        total: 0, // TODO: Implement disk space check
        free: 0,
        used: 0
      },
      network: {
        connections: 0, // TODO: Implement connection tracking
        bytesReceived: 0,
        bytesSent: 0
      },
      process: {
        uptime: process.uptime(),
        pid: process.pid,
        threadCount: 0, // TODO: Implement thread counting
        handlesOpen: 0 // TODO: Implement handle counting
      }
    };
  }

  public async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    const dataSource = db.getDataSource();
    const queryRunner = dataSource.createQueryRunner();
    
    try {
      const start = Date.now();
      await queryRunner.query('SELECT 1');
      const queryLatency = Date.now() - start;

      return {
        responseTime: {
          avg: 0, // TODO: Implement response time tracking
          p95: 0,
          p99: 0
        },
        throughput: {
          requestsPerSecond: 0, // TODO: Implement request tracking
          successRate: 0,
          errorRate: 0
        },
        database: {
          connectionPool: 0, // TODO: Get actual pool size
          activeQueries: 0, // TODO: Get active query count
          queryLatency
        },
        cache: {
          hitRate: 0, // TODO: Implement cache metrics
          missRate: 0,
          size: 0
        }
      };
    } finally {
      await queryRunner.release();
    }
  }

  public async getLogs(level?: string, limit = 100): Promise<any[]> {
    // TODO: Implement log retrieval from logging system
    return [];
  }

  public trackError(error: Error, category: string): void {
    this.errorStats.total++;
    this.errorStats.categories[category] = (this.errorStats.categories[category] || 0) + 1;

    this.errorStats.recent.unshift({
      timestamp: new Date(),
      code: (error as any).code || 'UNKNOWN',
      message: error.message,
      stack: error.stack
    });

    // Keep only last 100 errors
    if (this.errorStats.recent.length > 100) {
      this.errorStats.recent.pop();
    }

    // Update trends
    const hour = new Date().getHours();
    this.errorStats.trends.hourly[hour]++;

    const day = new Date().getDate() - 1;
    this.errorStats.trends.daily[day]++;
  }

  public getErrorStats(): ErrorStats {
    return this.errorStats;
  }

  public getMetricsHistory(hours = 24): SystemMetrics[] {
    const limit = Math.min(hours * 60, this.metricsHistory.length);
    return this.metricsHistory.slice(-limit);
  }

  public getPerformanceHistory(hours = 24): PerformanceMetrics[] {
    const limit = Math.min(hours * 60, this.performanceHistory.length);
    return this.performanceHistory.slice(-limit);
  }

  public async getMetrics(): Promise<any[]> {
    try {
      return this.performanceHistory;
    } catch (error) {
      Logger.error('Error getting metrics:', error);
      throw error;
    }
  }

  private async processMetrics(metrics: any[]): Promise<any[]> {
    return metrics.map(metric => ({
      ...metric,
      timestamp: new Date(metric.timestamp),
      processed: true
    }));
  }
} 