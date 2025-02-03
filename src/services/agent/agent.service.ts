import { AgentStatus, AgentState, AgentSettings, AgentHealthCheck } from '../../models/agent/agent.types';
import { Logger } from '../../utils/Logger';
import os from 'os';
import { db } from '../../database/connection';

interface AgentError extends Error {
  code: string;
}

export class AgentService {
  private static instance: AgentService;
  private state: AgentState;
  private startTime: Date;

  private constructor() {
    this.startTime = new Date();
    this.state = {
      status: AgentStatus.IDLE,
      metrics: {
        emailsProcessed: 0,
        successRate: 0,
        averageProcessingTime: 0,
        errorRate: 0,
        queueSize: 0
      },
      settings: this.getDefaultSettings(),
      version: process.env.npm_package_version || '1.0.0',
      uptime: 0,
      healthStatus: {
        database: true,
        emailService: true,
        llmService: true,
        diskSpace: true
      }
    };
  }

  public static getInstance(): AgentService {
    if (!AgentService.instance) {
      AgentService.instance = new AgentService();
    }
    return AgentService.instance;
  }

  private getDefaultSettings(): AgentSettings {
    return {
      maxConcurrentProcessing: 5,
      processingTimeout: 30000,
      retryAttempts: 3,
      retryDelay: 5000,
      pollingInterval: 60000,
      enabledFeatures: ['email_processing', 'spam_detection', 'auto_response'],
      llmSettings: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000
      },
      emailSettings: {
        maxAttachmentSize: 10 * 1024 * 1024, // 10MB
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
        spamThreshold: 0.8
      }
    };
  }

  private handleError(error: unknown, code: string): AgentError {
    const agentError = error instanceof Error ? error : new Error(String(error));
    (agentError as AgentError).code = code;
    return agentError as AgentError;
  }

  public async start(): Promise<void> {
    try {
      Logger.info('Starting agent...');
      
      // Check if agent is already running
      if (this.state.status === AgentStatus.RUNNING) {
        throw new Error('Agent is already running');
      }

      // Perform health check before starting
      const health = await this.checkHealth();
      if (health.status === 'unhealthy') {
        throw new Error('Agent health check failed');
      }

      this.state.status = AgentStatus.RUNNING;
      Logger.info('Agent started successfully');
    } catch (error) {
      Logger.error('Error starting agent:', error);
      this.state.status = AgentStatus.ERROR;
      const agentError = this.handleError(error, 'START_ERROR');
      this.state.lastError = {
        message: agentError.message,
        timestamp: new Date(),
        code: agentError.code
      };
      throw agentError;
    }
  }

  public async stop(): Promise<void> {
    try {
      Logger.info('Stopping agent...');
      
      if (this.state.status !== AgentStatus.RUNNING) {
        throw new Error('Agent is not running');
      }

      // Perform cleanup
      this.state.status = AgentStatus.IDLE;
      Logger.info('Agent stopped successfully');
    } catch (error) {
      Logger.error('Error stopping agent:', error);
      const agentError = this.handleError(error, 'STOP_ERROR');
      this.state.lastError = {
        message: agentError.message,
        timestamp: new Date(),
        code: agentError.code
      };
      throw agentError;
    }
  }

  public async updateSettings(settings: Partial<AgentSettings>): Promise<AgentSettings> {
    try {
      this.state.settings = {
        ...this.state.settings,
        ...settings
      };
      Logger.info('Agent settings updated');
      return this.state.settings;
    } catch (error) {
      Logger.error('Error updating agent settings:', error);
      throw this.handleError(error, 'SETTINGS_ERROR');
    }
  }

  public getStatus(): AgentState {
    // Update uptime
    this.state.uptime = (new Date().getTime() - this.startTime.getTime()) / 1000;
    return this.state;
  }

  public async checkHealth(): Promise<AgentHealthCheck> {
    try {
      const components = [];

      // Check database
      try {
        const dbLatencyStart = Date.now();
        await db.getDataSource().query('SELECT 1');
        components.push({
          name: 'database',
          status: 'up' as const,
          latency: Date.now() - dbLatencyStart
        });
        this.state.healthStatus.database = true;
      } catch (error) {
        const agentError = this.handleError(error, 'DB_CHECK_ERROR');
        components.push({
          name: 'database',
          status: 'down' as const,
          latency: 0,
          message: agentError.message
        });
        this.state.healthStatus.database = false;
      }

      // Get system metrics
      const metrics = {
        cpu: process.cpuUsage().system / 1000000, // Convert to seconds
        memory: process.memoryUsage().heapUsed / 1024 / 1024, // Convert to MB
        diskSpace: os.freemem() / 1024 / 1024 / 1024, // Convert to GB
        activeConnections: 0 // TODO: Implement connection tracking
      };

      // Determine overall status
      const status = components.every(c => c.status === 'up') ? 'healthy' :
        components.some(c => c.status === 'up') ? 'degraded' : 'unhealthy';

      return {
        status,
        timestamp: new Date(),
        components,
        metrics
      };
    } catch (error) {
      Logger.error('Error checking agent health:', error);
      throw this.handleError(error, 'HEALTH_CHECK_ERROR');
    }
  }

  public async resetMetrics(): Promise<void> {
    try {
      this.state.metrics = {
        emailsProcessed: 0,
        successRate: 0,
        averageProcessingTime: 0,
        errorRate: 0,
        queueSize: 0
      };
      Logger.info('Agent metrics reset');
    } catch (error) {
      Logger.error('Error resetting agent metrics:', error);
      throw this.handleError(error, 'METRICS_RESET_ERROR');
    }
  }
} 