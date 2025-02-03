import '@types/jest';
import { AgentService } from '../../services/agent/agent.service';
import { AgentStatus } from '../../models/agent/agent.types';
import { db } from '../../database/connection';

jest.mock('../../database/connection', () => ({
  db: {
    getDataSource: jest.fn().mockReturnValue({
      query: jest.fn().mockResolvedValue([{ '1': 1 }]),
      createQueryRunner: jest.fn().mockReturnValue({
        query: jest.fn().mockResolvedValue([{ '1': 1 }]),
        release: jest.fn().mockResolvedValue(undefined)
      })
    })
  }
}));

describe('AgentService', () => {
  let agentService: AgentService;

  beforeEach(() => {
    // Reset singleton instance before each test
    (AgentService as any).instance = null;
    agentService = AgentService.getInstance();
  });

  describe('getInstance', () => {
    it('should return the same instance', () => {
      const instance1 = AgentService.getInstance();
      const instance2 = AgentService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('start', () => {
    it('should start the agent successfully', async () => {
      await agentService.start();
      const state = agentService.getStatus();
      expect(state.status).toBe(AgentStatus.RUNNING);
    });

    it('should throw error if agent is already running', async () => {
      await agentService.start();
      await expect(agentService.start()).rejects.toThrow('Agent is already running');
    });

    it('should handle database health check failure', async () => {
      jest.spyOn(db.getDataSource(), 'query').mockRejectedValueOnce(new Error('DB Error'));
      await expect(agentService.start()).rejects.toThrow('Agent health check failed');
    });
  });

  describe('stop', () => {
    it('should stop the agent successfully', async () => {
      await agentService.start();
      await agentService.stop();
      const state = agentService.getStatus();
      expect(state.status).toBe(AgentStatus.IDLE);
    });

    it('should throw error if agent is not running', async () => {
      await expect(agentService.stop()).rejects.toThrow('Agent is not running');
    });
  });

  describe('updateSettings', () => {
    it('should update settings successfully', async () => {
      const newSettings = {
        maxConcurrentProcessing: 10,
        processingTimeout: 60000
      };
      const settings = await agentService.updateSettings(newSettings);
      expect(settings.maxConcurrentProcessing).toBe(10);
      expect(settings.processingTimeout).toBe(60000);
    });

    it('should merge with existing settings', async () => {
      const initialState = agentService.getStatus();
      const newSettings = { maxConcurrentProcessing: 10 };
      const settings = await agentService.updateSettings(newSettings);
      expect(settings.maxConcurrentProcessing).toBe(10);
      expect(settings.processingTimeout).toBe(initialState.settings.processingTimeout);
    });
  });

  describe('checkHealth', () => {
    it('should return healthy status when all checks pass', async () => {
      const health = await agentService.checkHealth();
      expect(health.status).toBe('healthy');
      expect(health.components[0].status).toBe('up');
    });

    it('should return unhealthy status when database check fails', async () => {
      jest.spyOn(db.getDataSource(), 'query').mockRejectedValueOnce(new Error('DB Error'));
      const health = await agentService.checkHealth();
      expect(health.status).toBe('unhealthy');
      expect(health.components[0].status).toBe('down');
    });

    it('should include system metrics', async () => {
      const health = await agentService.checkHealth();
      expect(health.metrics).toBeDefined();
      expect(health.metrics.cpu).toBeDefined();
      expect(health.metrics.memory).toBeDefined();
      expect(health.metrics.diskSpace).toBeDefined();
    });
  });

  describe('resetMetrics', () => {
    it('should reset all metrics to zero', async () => {
      await agentService.resetMetrics();
      const state = agentService.getStatus();
      expect(state.metrics.emailsProcessed).toBe(0);
      expect(state.metrics.successRate).toBe(0);
      expect(state.metrics.averageProcessingTime).toBe(0);
      expect(state.metrics.errorRate).toBe(0);
      expect(state.metrics.queueSize).toBe(0);
    });
  });

  describe('getStatus', () => {
    it('should return current agent state', () => {
      const state = agentService.getStatus();
      expect(state).toBeDefined();
      expect(state.status).toBe(AgentStatus.IDLE);
      expect(state.metrics).toBeDefined();
      expect(state.settings).toBeDefined();
      expect(state.version).toBeDefined();
      expect(state.uptime).toBeDefined();
      expect(state.healthStatus).toBeDefined();
    });

    it('should calculate uptime correctly', async () => {
      const initialState = agentService.getStatus();
      await new Promise(resolve => setTimeout(resolve, 1000));
      const newState = agentService.getStatus();
      expect(newState.uptime).toBeGreaterThan(initialState.uptime);
    });
  });
}); 