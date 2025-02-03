import { EventEmitter } from 'events';
import { Logger } from '../utils/logger';

interface HandshakeEvent {
  id: string;
  type: string;
  source: string;
  target: string;
  status: 'initiated' | 'completed' | 'failed';
  timestamp: Date;
  data?: any;
  error?: string;
}

interface ServiceState {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastUpdate: Date;
  metrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
  };
}

export class HandshakeManager extends EventEmitter {
  private handshakes: Map<string, HandshakeEvent> = new Map();
  private serviceStates: Map<string, ServiceState> = new Map();
  private logger: Logger;
  private metrics: {
    totalHandshakes: number;
    successfulHandshakes: number;
    failedHandshakes: number;
    averageHandshakeTime: number;
  };

  constructor() {
    super();
    this.logger = new Logger('HandshakeManager');
    this.metrics = {
      totalHandshakes: 0,
      successfulHandshakes: 0,
      failedHandshakes: 0,
      averageHandshakeTime: 0,
    };

    this.setupEventListeners();
  }

  private setupEventListeners() {
    this.on('handshake:initiated', this.handleHandshakeInitiated.bind(this));
    this.on('handshake:completed', this.handleHandshakeCompleted.bind(this));
    this.on('handshake:failed', this.handleHandshakeFailed.bind(this));
    this.on('service:status', this.handleServiceStatusUpdate.bind(this));
  }

  initiateHandshake(source: string, target: string, type: string, data?: any): string {
    const handshakeId = `${source}-${target}-${Date.now()}`;
    const handshake: HandshakeEvent = {
      id: handshakeId,
      type,
      source,
      target,
      status: 'initiated',
      timestamp: new Date(),
      data,
    };

    this.handshakes.set(handshakeId, handshake);
    this.emit('handshake:initiated', handshake);
    this.updateMetrics('initiated');

    return handshakeId;
  }

  completeHandshake(handshakeId: string, data?: any): void {
    const handshake = this.handshakes.get(handshakeId);
    if (!handshake) {
      throw new Error(`Handshake ${handshakeId} not found`);
    }

    handshake.status = 'completed';
    handshake.data = data;
    this.handshakes.set(handshakeId, handshake);
    this.emit('handshake:completed', handshake);
    this.updateMetrics('completed');
  }

  failHandshake(handshakeId: string, error: string): void {
    const handshake = this.handshakes.get(handshakeId);
    if (!handshake) {
      throw new Error(`Handshake ${handshakeId} not found`);
    }

    handshake.status = 'failed';
    handshake.error = error;
    this.handshakes.set(handshakeId, handshake);
    this.emit('handshake:failed', handshake);
    this.updateMetrics('failed');
  }

  updateServiceState(
    serviceId: string,
    name: string,
    status: ServiceState['status'],
    metrics?: Partial<ServiceState['metrics']>
  ): void {
    const currentState = this.serviceStates.get(serviceId) || {
      id: serviceId,
      name,
      status: 'inactive',
      lastUpdate: new Date(),
      metrics: {
        requestCount: 0,
        errorCount: 0,
        averageResponseTime: 0,
      },
    };

    const updatedState: ServiceState = {
      ...currentState,
      status,
      lastUpdate: new Date(),
      metrics: {
        ...currentState.metrics,
        ...metrics,
      },
    };

    this.serviceStates.set(serviceId, updatedState);
    this.emit('service:status', updatedState);
  }

  private handleHandshakeInitiated(handshake: HandshakeEvent): void {
    this.logger.info(`Handshake initiated: ${handshake.id}`);
    this.updateServiceMetrics(handshake.source, 'request');
  }

  private handleHandshakeCompleted(handshake: HandshakeEvent): void {
    this.logger.info(`Handshake completed: ${handshake.id}`);
    const duration = new Date().getTime() - handshake.timestamp.getTime();
    this.updateServiceMetrics(handshake.source, 'success', duration);
  }

  private handleHandshakeFailed(handshake: HandshakeEvent): void {
    this.logger.error(`Handshake failed: ${handshake.id}`, handshake.error);
    this.updateServiceMetrics(handshake.source, 'error');
  }

  private handleServiceStatusUpdate(state: ServiceState): void {
    this.logger.info(`Service ${state.name} status updated to ${state.status}`);
  }

  private updateMetrics(type: 'initiated' | 'completed' | 'failed'): void {
    this.metrics.totalHandshakes++;
    
    if (type === 'completed') {
      this.metrics.successfulHandshakes++;
    } else if (type === 'failed') {
      this.metrics.failedHandshakes++;
    }

    this.metrics.averageHandshakeTime = this.calculateAverageHandshakeTime();
  }

  private updateServiceMetrics(
    serviceId: string,
    type: 'request' | 'success' | 'error',
    duration?: number
  ): void {
    const state = this.serviceStates.get(serviceId);
    if (!state) return;

    const metrics = state.metrics;
    if (type === 'request') {
      metrics.requestCount++;
    } else if (type === 'error') {
      metrics.errorCount++;
    }

    if (duration) {
      metrics.averageResponseTime =
        (metrics.averageResponseTime * (metrics.requestCount - 1) + duration) /
        metrics.requestCount;
    }

    this.serviceStates.set(serviceId, {
      ...state,
      metrics,
      lastUpdate: new Date(),
    });
  }

  private calculateAverageHandshakeTime(): number {
    const completedHandshakes = Array.from(this.handshakes.values()).filter(
      h => h.status === 'completed'
    );

    if (completedHandshakes.length === 0) return 0;

    const totalTime = completedHandshakes.reduce((sum, handshake) => {
      const endTime = handshake.data?.completedAt || new Date();
      return sum + (endTime.getTime() - handshake.timestamp.getTime());
    }, 0);

    return totalTime / completedHandshakes.length;
  }

  getServiceState(serviceId: string): ServiceState | undefined {
    return this.serviceStates.get(serviceId);
  }

  getAllServiceStates(): ServiceState[] {
    return Array.from(this.serviceStates.values());
  }

  getMetrics() {
    return { ...this.metrics };
  }

  getHandshakeHistory(limit: number = 100): HandshakeEvent[] {
    return Array.from(this.handshakes.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }
} 