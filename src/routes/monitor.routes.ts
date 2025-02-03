import { Router } from 'express';
import { MonitorController } from '../controllers/monitor.controller';
import { authenticate, authorize } from '../middleware';
import { RequestHandler } from 'express';

const router = Router();
const monitorController = new MonitorController();

// Apply authentication to all routes
router.use(authenticate);

// Only admins can access monitoring endpoints
router.use(authorize('admin') as RequestHandler);

// Get system metrics
router.get('/metrics', monitorController.getMetrics);

// Get performance metrics
router.get('/performance', monitorController.getPerformance);

// Get error statistics
router.get('/errors', monitorController.getErrors);

// Get application logs
router.get('/logs', monitorController.getLogs);

export default router; 