import { Request, Response } from 'express';
import { MonitorService } from '../services/monitor/monitor.service';
import { Logger } from '../utils/Logger';

export class MonitorController {
  private monitorService: MonitorService;

  constructor() {
    this.monitorService = MonitorService.getInstance();
  }

  private handleError(error: unknown): { message: string } {
    if (error instanceof Error) {
      return { message: error.message };
    }
    return { message: String(error) };
  }

  // Get system metrics
  public getMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const currentMetrics = await this.monitorService.getSystemMetrics();
      const metricsHistory = this.monitorService.getMetricsHistory(hours);

      res.json({
        current: currentMetrics,
        history: metricsHistory
      });
    } catch (error) {
      Logger.error('Error getting metrics:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Get performance metrics
  public getPerformance = async (req: Request, res: Response): Promise<void> => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const currentPerformance = await this.monitorService.getPerformanceMetrics();
      const performanceHistory = this.monitorService.getPerformanceHistory(hours);

      res.json({
        current: currentPerformance,
        history: performanceHistory
      });
    } catch (error) {
      Logger.error('Error getting performance metrics:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Get error statistics
  public getErrors = async (req: Request, res: Response): Promise<void> => {
    try {
      const errorStats = this.monitorService.getErrorStats();
      res.json(errorStats);
    } catch (error) {
      Logger.error('Error getting error stats:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Get application logs
  public getLogs = async (req: Request, res: Response): Promise<void> => {
    try {
      const level = req.query.level as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      
      const logs = await this.monitorService.getLogs(level, limit);
      res.json(logs);
    } catch (error) {
      Logger.error('Error getting logs:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };
} 