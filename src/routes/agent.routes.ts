import { Router } from 'express';
import { AgentController } from '../controllers/agent.controller';
import { authenticate, authorize } from '../middleware';
import { validateAgentSettings } from '../validators/agent.validator';
import { RequestHandler } from 'express';

const router = Router();
const agentController = new AgentController();

// Apply authentication to all routes
router.use(authenticate);

// Only admins can access agent controls
router.use(authorize('admin') as RequestHandler);

// Get agent status
router.get('/status', agentController.getStatus);

// Get agent health
router.get('/health', agentController.getHealth);

// Start agent
router.post('/start', agentController.startAgent);

// Stop agent
router.post('/stop', agentController.stopAgent);

// Update settings
router.put('/settings',
  validateAgentSettings as RequestHandler[],
  agentController.updateSettings
);

// Reset metrics
router.post('/metrics/reset', agentController.resetMetrics);

export default router; 