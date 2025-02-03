export enum AgentStatus {
  IDLE = 'idle',
  RUNNING = 'running',
  PAUSED = 'paused',
  ERROR = 'error',
  MAINTENANCE = 'maintenance'
}

export interface AgentMetrics {
  emailsProcessed: number;
  successRate: number;
  averageProcessingTime: number;
  errorRate: number;
  lastProcessedAt?: Date;
  queueSize: number;
}

export interface AgentSettings {
  maxConcurrentProcessing: number;
  processingTimeout: number;
  retryAttempts: number;
  retryDelay: number;
  pollingInterval: number;
  enabledFeatures: string[];
  llmSettings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  emailSettings: {
    maxAttachmentSize: number;
    allowedMimeTypes: string[];
    spamThreshold: number;
  };
}

export interface AgentState {
  status: AgentStatus;
  metrics: AgentMetrics;
  settings: AgentSettings;
  lastError?: {
    message: string;
    timestamp: Date;
    code: string;
  };
  version: string;
  uptime: number;
  healthStatus: {
    database: boolean;
    emailService: boolean;
    llmService: boolean;
    diskSpace: boolean;
  };
}

export interface AgentHealthCheck {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: Date;
  components: {
    name: string;
    status: 'up' | 'down';
    latency: number;
    message?: string;
  }[];
  metrics: {
    cpu: number;
    memory: number;
    diskSpace: number;
    activeConnections: number;
  };
} 