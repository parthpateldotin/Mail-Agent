import { Request, Response } from 'express';
import { AgentService } from '../services/agent/agent.service';
import { Logger } from '../utils/Logger';

interface AgentError extends Error {
  code: string;
}

export class AgentController {
  private agentService: AgentService;

  constructor() {
    this.agentService = AgentService.getInstance();
  }

  private handleError(error: unknown): { message: string } {
    if (error instanceof Error) {
      return { message: error.message };
    }
    return { message: String(error) };
  }

  // Get agent status
  public getStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = this.agentService.getStatus();
      res.json(status);
    } catch (error) {
      Logger.error('Error getting agent status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Start agent
  public startAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.agentService.start();
      const status = this.agentService.getStatus();
      res.json(status);
    } catch (error) {
      Logger.error('Error starting agent:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Stop agent
  public stopAgent = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.agentService.stop();
      const status = this.agentService.getStatus();
      res.json(status);
    } catch (error) {
      Logger.error('Error stopping agent:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Update agent settings
  public updateSettings = async (req: Request, res: Response): Promise<void> => {
    try {
      const settings = await this.agentService.updateSettings(req.body);
      res.json(settings);
    } catch (error) {
      Logger.error('Error updating agent settings:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Get agent health
  public getHealth = async (req: Request, res: Response): Promise<void> => {
    try {
      const health = await this.agentService.checkHealth();
      res.status(health.status === 'healthy' ? 200 : 
                health.status === 'degraded' ? 200 : 503)
         .json(health);
    } catch (error) {
      Logger.error('Error checking agent health:', error);
      const errorResponse = this.handleError(error);
      res.status(503).json({
        status: 'unhealthy',
        timestamp: new Date(),
        error: errorResponse.message
      });
    }
  };

  // Reset agent metrics
  public resetMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      await this.agentService.resetMetrics();
      const status = this.agentService.getStatus();
      res.json(status);
    } catch (error) {
      Logger.error('Error resetting agent metrics:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };
} 