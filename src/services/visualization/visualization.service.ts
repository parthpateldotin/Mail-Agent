import { MonitorService } from '../monitor/monitor.service';
import { AgentService } from '../agent/agent.service';
import { SystemMetrics, PerformanceMetrics } from '../monitor/monitor.service';
import { Logger } from '../../utils/Logger';

export interface DashboardData {
  systemHealth: {
    status: 'healthy' | 'degraded' | 'unhealthy';
    components: {
      name: string;
      status: 'up' | 'down';
      metrics: {
        value: number;
        trend: 'up' | 'down' | 'stable';
        threshold: number;
      };
    }[];
  };
  metrics: {
    system: {
      cpu: {
        current: number;
        history: number[];
        trend: 'up' | 'down' | 'stable';
      };
      memory: {
        current: number;
        history: number[];
        trend: 'up' | 'down' | 'stable';
      };
      disk: {
        current: number;
        history: number[];
        trend: 'up' | 'down' | 'stable';
      };
    };
    performance: {
      responseTime: {
        current: number;
        history: number[];
        p95: number;
        p99: number;
      };
      throughput: {
        current: number;
        history: number[];
        trend: 'up' | 'down' | 'stable';
      };
      errorRate: {
        current: number;
        history: number[];
        trend: 'up' | 'down' | 'stable';
      };
    };
  };
  alerts: {
    active: {
      id: string;
      severity: 'critical' | 'warning' | 'info';
      message: string;
      timestamp: Date;
      component: string;
    }[];
    history: {
      id: string;
      severity: 'critical' | 'warning' | 'info';
      message: string;
      timestamp: Date;
      component: string;
      resolvedAt: Date;
    }[];
  };
  agent: {
    status: string;
    metrics: {
      emailsProcessed: {
        total: number;
        trend: 'up' | 'down' | 'stable';
      };
      successRate: {
        current: number;
        trend: 'up' | 'down' | 'stable';
      };
      errorRate: {
        current: number;
        trend: 'up' | 'down' | 'stable';
      };
    };
  };
}

export interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor?: string;
    backgroundColor?: string;
  }[];
}

export class VisualizationService {
  private static instance: VisualizationService;
  private monitorService: MonitorService;
  private agentService: AgentService;

  private constructor() {
    this.monitorService = MonitorService.getInstance();
    this.agentService = AgentService.getInstance();
  }

  public static getInstance(): VisualizationService {
    if (!VisualizationService.instance) {
      VisualizationService.instance = new VisualizationService();
    }
    return VisualizationService.instance;
  }

  private calculateTrend(history: number[]): 'up' | 'down' | 'stable' {
    if (history.length < 2) return 'stable';
    const last = history[history.length - 1];
    const prev = history[history.length - 2];
    const diff = ((last - prev) / prev) * 100;
    if (Math.abs(diff) < 5) return 'stable';
    return diff > 0 ? 'up' : 'down';
  }

  private async getSystemHealthData(): Promise<DashboardData['systemHealth']> {
    try {
      const health = await this.monitorService.checkHealth();
      const metrics = await this.monitorService.getSystemMetrics();
      
      return {
        status: health.status,
        components: health.components.map(component => ({
          name: component.name,
          status: component.status,
          metrics: {
            value: component.latency,
            trend: this.calculateTrend([]), // TODO: Implement latency history
            threshold: 1000 // TODO: Make configurable
          }
        }))
      };
    } catch (error) {
      Logger.error('Error getting system health data:', error);
      throw error;
    }
  }

  private async getMetricsData(): Promise<DashboardData['metrics']> {
    try {
      const currentMetrics = await this.monitorService.getSystemMetrics();
      const metricsHistory = this.monitorService.getMetricsHistory(24);
      const performanceMetrics = await this.monitorService.getPerformanceMetrics();
      const performanceHistory = this.monitorService.getPerformanceHistory(24);

      const cpuHistory = metricsHistory.map(m => m.cpu.usage);
      const memoryHistory = metricsHistory.map(m => m.memory.used / m.memory.total * 100);
      const diskHistory = metricsHistory.map(m => m.disk.used / m.disk.total * 100);

      return {
        system: {
          cpu: {
            current: currentMetrics.cpu.usage,
            history: cpuHistory,
            trend: this.calculateTrend(cpuHistory)
          },
          memory: {
            current: (currentMetrics.memory.used / currentMetrics.memory.total) * 100,
            history: memoryHistory,
            trend: this.calculateTrend(memoryHistory)
          },
          disk: {
            current: (currentMetrics.disk.used / currentMetrics.disk.total) * 100,
            history: diskHistory,
            trend: this.calculateTrend(diskHistory)
          }
        },
        performance: {
          responseTime: {
            current: performanceMetrics.responseTime.avg,
            history: performanceHistory.map(p => p.responseTime.avg),
            p95: performanceMetrics.responseTime.p95,
            p99: performanceMetrics.responseTime.p99
          },
          throughput: {
            current: performanceMetrics.throughput.requestsPerSecond,
            history: performanceHistory.map(p => p.throughput.requestsPerSecond),
            trend: this.calculateTrend(performanceHistory.map(p => p.throughput.requestsPerSecond))
          },
          errorRate: {
            current: performanceMetrics.throughput.errorRate,
            history: performanceHistory.map(p => p.throughput.errorRate),
            trend: this.calculateTrend(performanceHistory.map(p => p.throughput.errorRate))
          }
        }
      };
    } catch (error) {
      Logger.error('Error getting metrics data:', error);
      throw error;
    }
  }

  public async getDashboardData(): Promise<DashboardData> {
    try {
      const [systemHealth, metrics, agentState] = await Promise.all([
        this.getSystemHealthData(),
        this.getMetricsData(),
        this.agentService.getStatus()
      ]);

      return {
        systemHealth,
        metrics,
        alerts: {
          active: [], // TODO: Implement alert system
          history: []
        },
        agent: {
          status: agentState.status,
          metrics: {
            emailsProcessed: {
              total: agentState.metrics.emailsProcessed,
              trend: 'stable' // TODO: Implement trend calculation
            },
            successRate: {
              current: agentState.metrics.successRate,
              trend: 'stable'
            },
            errorRate: {
              current: agentState.metrics.errorRate,
              trend: 'stable'
            }
          }
        }
      };
    } catch (error) {
      Logger.error('Error getting dashboard data:', error);
      throw error;
    }
  }

  public getSystemMetricsChart(hours = 24): ChartData {
    const metrics = this.monitorService.getMetricsHistory(hours);
    const labels = metrics.map((_, i) => 
      new Date(Date.now() - (hours - i) * 3600000).toLocaleTimeString()
    );

    return {
      labels,
      datasets: [
        {
          label: 'CPU Usage (%)',
          data: metrics.map(m => m.cpu.usage),
          borderColor: '#ff6384',
          backgroundColor: '#ff638444'
        },
        {
          label: 'Memory Usage (%)',
          data: metrics.map(m => (m.memory.used / m.memory.total) * 100),
          borderColor: '#36a2eb',
          backgroundColor: '#36a2eb44'
        },
        {
          label: 'Disk Usage (%)',
          data: metrics.map(m => (m.disk.used / m.disk.total) * 100),
          borderColor: '#4bc0c0',
          backgroundColor: '#4bc0c044'
        }
      ]
    };
  }

  public getPerformanceChart(hours = 24): ChartData {
    const performance = this.monitorService.getPerformanceHistory(hours);
    const labels = performance.map((_, i) =>
      new Date(Date.now() - (hours - i) * 3600000).toLocaleTimeString()
    );

    return {
      labels,
      datasets: [
        {
          label: 'Response Time (ms)',
          data: performance.map(p => p.responseTime.avg),
          borderColor: '#ff6384',
          backgroundColor: '#ff638444'
        },
        {
          label: 'Requests/Second',
          data: performance.map(p => p.throughput.requestsPerSecond),
          borderColor: '#36a2eb',
          backgroundColor: '#36a2eb44'
        },
        {
          label: 'Error Rate (%)',
          data: performance.map(p => p.throughput.errorRate * 100),
          borderColor: '#ff9f40',
          backgroundColor: '#ff9f4044'
        }
      ]
    };
  }
} 