import { Request, Response } from 'express';
import { DashboardMonitor } from '../services/DashboardMonitor';
import { HandshakeManager } from '../services/HandshakeManager';
import { Logger } from '../utils/logger';

export class DashboardController {
  private logger: Logger;

  constructor(
    private dashboardMonitor: DashboardMonitor,
    private handshakeManager: HandshakeManager
  ) {
    this.logger = new Logger('DashboardController');
  }

  async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.dashboardMonitor.getMetrics();
      res.json(metrics);
    } catch (error) {
      this.logger.error('Failed to get metrics:', error);
      res.status(500).json({ error: 'Failed to get metrics' });
    }
  }

  async getServiceStatus(req: Request, res: Response): Promise<void> {
    try {
      const services = this.handshakeManager.getAllServiceStates();
      res.json(services);
    } catch (error) {
      this.logger.error('Failed to get service status:', error);
      res.status(500).json({ error: 'Failed to get service status' });
    }
  }

  async getHandshakeHistory(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const history = this.handshakeManager.getHandshakeHistory(limit);
      res.json(history);
    } catch (error) {
      this.logger.error('Failed to get handshake history:', error);
      res.status(500).json({ error: 'Failed to get handshake history' });
    }
  }

  async getEmailMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.dashboardMonitor.getMetrics();
      res.json(metrics.email);
    } catch (error) {
      this.logger.error('Failed to get email metrics:', error);
      res.status(500).json({ error: 'Failed to get email metrics' });
    }
  }

  async getPerformanceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = this.dashboardMonitor.getMetrics();
      res.json(metrics.performance);
    } catch (error) {
      this.logger.error('Failed to get performance metrics:', error);
      res.status(500).json({ error: 'Failed to get performance metrics' });
    }
  }
} 