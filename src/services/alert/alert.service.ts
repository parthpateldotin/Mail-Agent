import { MonitorService } from '../monitor/monitor.service';
import { AgentService } from '../agent/agent.service';
import { Logger } from '../../utils/Logger';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';

export interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  message: string;
  timestamp: Date;
  component: string;
  resolvedAt?: Date;
  metadata?: Record<string, any>;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  component: string;
  condition: {
    metric: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
    duration?: number; // Duration in seconds the condition must be true
  };
  severity: 'critical' | 'warning' | 'info';
  enabled: boolean;
  message: string;
  metadata?: Record<string, any>;
}

export interface AlertNotification {
  type: 'email' | 'slack' | 'webhook';
  config: {
    recipients?: string[];
    url?: string;
    channel?: string;
  };
}

export class AlertService extends EventEmitter {
  private static instance: AlertService;
  private monitorService: MonitorService;
  private agentService: AgentService;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private rules: AlertRule[] = [];
  private notifications: AlertNotification[] = [];
  private checkInterval: NodeJS.Timeout | null = null;

  private constructor() {
    super();
    this.monitorService = MonitorService.getInstance();
    this.agentService = AgentService.getInstance();
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  public static getInstance(): AlertService {
    if (!AlertService.instance) {
      AlertService.instance = new AlertService();
    }
    return AlertService.instance;
  }

  private initializeDefaultRules(): void {
    this.rules = [
      {
        id: uuidv4(),
        name: 'High CPU Usage',
        description: 'Alert when CPU usage is above 80% for 5 minutes',
        component: 'system',
        condition: {
          metric: 'cpu.usage',
          operator: 'gt',
          value: 80,
          duration: 300
        },
        severity: 'warning',
        enabled: true,
        message: 'CPU usage is above 80%'
      },
      {
        id: uuidv4(),
        name: 'Critical Memory Usage',
        description: 'Alert when memory usage is above 90%',
        component: 'system',
        condition: {
          metric: 'memory.used',
          operator: 'gt',
          value: 90,
          duration: 60
        },
        severity: 'critical',
        enabled: true,
        message: 'Memory usage is critically high'
      },
      {
        id: uuidv4(),
        name: 'High Error Rate',
        description: 'Alert when error rate is above 5%',
        component: 'application',
        condition: {
          metric: 'errorRate',
          operator: 'gt',
          value: 5
        },
        severity: 'warning',
        enabled: true,
        message: 'Application error rate is above 5%'
      }
    ];
  }

  private startMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
    }

    this.checkInterval = setInterval(async () => {
      await this.checkRules();
    }, 60000); // Check every minute
  }

  private async evaluateCondition(rule: AlertRule): Promise<boolean> {
    try {
      const metrics = await this.monitorService.getSystemMetrics();
      const performance = await this.monitorService.getPerformanceMetrics();
      
      let value: number;
      switch (rule.condition.metric) {
        case 'cpu.usage':
          value = metrics.cpu.usage;
          break;
        case 'memory.used':
          value = (metrics.memory.used / metrics.memory.total) * 100;
          break;
        case 'errorRate':
          value = performance.throughput.errorRate * 100;
          break;
        default:
          return false;
      }

      switch (rule.condition.operator) {
        case 'gt':
          return value > rule.condition.value;
        case 'lt':
          return value < rule.condition.value;
        case 'eq':
          return value === rule.condition.value;
        case 'gte':
          return value >= rule.condition.value;
        case 'lte':
          return value <= rule.condition.value;
        default:
          return false;
      }
    } catch (error) {
      Logger.error('Error evaluating alert condition:', error);
      return false;
    }
  }

  private async checkRules(): Promise<void> {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      try {
        const isTriggered = await this.evaluateCondition(rule);
        const alertId = `${rule.component}-${rule.condition.metric}`;

        if (isTriggered && !this.activeAlerts.has(alertId)) {
          const alert: Alert = {
            id: alertId,
            severity: rule.severity,
            message: rule.message,
            timestamp: new Date(),
            component: rule.component,
            metadata: rule.metadata
          };

          this.activeAlerts.set(alertId, alert);
          this.emit('alertCreated', alert);
          await this.sendNotifications(alert);
        } else if (!isTriggered && this.activeAlerts.has(alertId)) {
          const alert = this.activeAlerts.get(alertId)!;
          alert.resolvedAt = new Date();
          this.alertHistory.push(alert);
          this.activeAlerts.delete(alertId);
          this.emit('alertResolved', alert);
        }
      } catch (error) {
        Logger.error('Error checking rule:', error);
      }
    }

    // Keep last 1000 resolved alerts
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }
  }

  private async sendNotifications(alert: Alert): Promise<void> {
    for (const notification of this.notifications) {
      try {
        switch (notification.type) {
          case 'email':
            // TODO: Implement email notifications
            break;
          case 'slack':
            // TODO: Implement Slack notifications
            break;
          case 'webhook':
            if (notification.config.url) {
              await fetch(notification.config.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(alert)
              });
            }
            break;
        }
      } catch (error) {
        Logger.error('Error sending notification:', error);
      }
    }
  }

  public getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  public getAlertHistory(limit = 100): Alert[] {
    return this.alertHistory.slice(-limit);
  }

  public addRule(rule: Omit<AlertRule, 'id'>): AlertRule {
    const newRule = { ...rule, id: uuidv4() };
    this.rules.push(newRule);
    return newRule;
  }

  public updateRule(id: string, update: Partial<AlertRule>): AlertRule | null {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index === -1) return null;

    this.rules[index] = { ...this.rules[index], ...update };
    return this.rules[index];
  }

  public deleteRule(id: string): boolean {
    const index = this.rules.findIndex(rule => rule.id === id);
    if (index === -1) return false;

    this.rules.splice(index, 1);
    return true;
  }

  public getRules(): AlertRule[] {
    return this.rules;
  }

  public addNotification(notification: AlertNotification): void {
    this.notifications.push(notification);
  }

  public removeNotification(type: string, config: Partial<AlertNotification['config']>): boolean {
    const index = this.notifications.findIndex(n => 
      n.type === type && 
      JSON.stringify(n.config) === JSON.stringify(config)
    );
    
    if (index === -1) return false;
    
    this.notifications.splice(index, 1);
    return true;
  }

  public getNotifications(): AlertNotification[] {
    return this.notifications;
  }
} 