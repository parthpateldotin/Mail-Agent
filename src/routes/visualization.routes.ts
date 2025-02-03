import { Router } from 'express';
import { VisualizationController } from '../controllers/visualization.controller';
import { authenticate, authorize } from '../middleware';
import { RequestHandler } from 'express';

const router = Router();
const visualizationController = new VisualizationController();

// Apply authentication to all routes
router.use(authenticate);

// Only admins can access visualization endpoints
router.use(authorize('admin') as RequestHandler);

// Dashboard endpoints
router.get('/dashboard', visualizationController.getDashboard);
router.get('/charts/system', visualizationController.getSystemMetricsChart);
router.get('/charts/performance', visualizationController.getPerformanceChart);

// Alert rule endpoints
router.get('/alerts/rules', visualizationController.getAlertRules);
router.post('/alerts/rules', visualizationController.addAlertRule);
router.put('/alerts/rules/:id', visualizationController.updateAlertRule);
router.delete('/alerts/rules/:id', visualizationController.deleteAlertRule);

// Alert notification endpoints
router.get('/alerts/notifications', visualizationController.getNotifications);
router.post('/alerts/notifications', visualizationController.addNotification);
router.delete('/alerts/notifications/:type', visualizationController.removeNotification);

export default router; 