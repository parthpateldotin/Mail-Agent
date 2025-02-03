import { Request, Response } from 'express';
import { VisualizationService } from '../services/visualization/visualization.service';
import { AlertService } from '../services/alert/alert.service';
import { Logger } from '../utils/Logger';

export class VisualizationController {
  private visualizationService: VisualizationService;
  private alertService: AlertService;

  constructor() {
    this.visualizationService = VisualizationService.getInstance();
    this.alertService = AlertService.getInstance();
  }

  private handleError(error: unknown): { message: string } {
    if (error instanceof Error) {
      return { message: error.message };
    }
    return { message: String(error) };
  }

  // Get dashboard data
  public getDashboard = async (req: Request, res: Response): Promise<void> => {
    try {
      const dashboardData = await this.visualizationService.getDashboardData();
      const activeAlerts = this.alertService.getActiveAlerts();
      const alertHistory = this.alertService.getAlertHistory();

      res.json({
        ...dashboardData,
        alerts: {
          active: activeAlerts,
          history: alertHistory
        }
      });
    } catch (error) {
      Logger.error('Error getting dashboard data:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Get system metrics chart
  public getSystemMetricsChart = async (req: Request, res: Response): Promise<void> => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const chartData = this.visualizationService.getSystemMetricsChart(hours);
      res.json(chartData);
    } catch (error) {
      Logger.error('Error getting system metrics chart:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Get performance chart
  public getPerformanceChart = async (req: Request, res: Response): Promise<void> => {
    try {
      const hours = req.query.hours ? parseInt(req.query.hours as string) : 24;
      const chartData = this.visualizationService.getPerformanceChart(hours);
      res.json(chartData);
    } catch (error) {
      Logger.error('Error getting performance chart:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Get alert rules
  public getAlertRules = async (req: Request, res: Response): Promise<void> => {
    try {
      const rules = this.alertService.getRules();
      res.json(rules);
    } catch (error) {
      Logger.error('Error getting alert rules:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Add alert rule
  public addAlertRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const rule = this.alertService.addRule(req.body);
      res.json(rule);
    } catch (error) {
      Logger.error('Error adding alert rule:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Update alert rule
  public updateAlertRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const rule = this.alertService.updateRule(id, req.body);
      if (!rule) {
        res.status(404).json({ error: 'Alert rule not found' });
        return;
      }
      res.json(rule);
    } catch (error) {
      Logger.error('Error updating alert rule:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Delete alert rule
  public deleteAlertRule = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const success = this.alertService.deleteRule(id);
      if (!success) {
        res.status(404).json({ error: 'Alert rule not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      Logger.error('Error deleting alert rule:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Get alert notifications
  public getNotifications = async (req: Request, res: Response): Promise<void> => {
    try {
      const notifications = this.alertService.getNotifications();
      res.json(notifications);
    } catch (error) {
      Logger.error('Error getting notifications:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Add alert notification
  public addNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      this.alertService.addNotification(req.body);
      res.status(201).json(req.body);
    } catch (error) {
      Logger.error('Error adding notification:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };

  // Remove alert notification
  public removeNotification = async (req: Request, res: Response): Promise<void> => {
    try {
      const { type } = req.params;
      const success = this.alertService.removeNotification(type, req.body);
      if (!success) {
        res.status(404).json({ error: 'Notification not found' });
        return;
      }
      res.status(204).send();
    } catch (error) {
      Logger.error('Error removing notification:', error);
      const errorResponse = this.handleError(error);
      res.status(500).json({ error: errorResponse.message });
    }
  };
} 