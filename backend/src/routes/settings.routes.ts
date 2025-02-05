import { Router } from 'express';
import { SettingsController } from '../controllers/settings.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  updateSettingsSchema,
  updateEmailSettingsSchema,
  updateAISettingsSchema,
  updateThemeSchema,
  updateLanguageSchema,
} from '../validators/settings.validator';

const router = Router();
const settingsController = new SettingsController();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get user settings
router.get('/', settingsController.getSettings);

// Update general settings
router.put('/', validateRequest(updateSettingsSchema), settingsController.updateSettings);

// Update email settings
router.put('/email', validateRequest(updateEmailSettingsSchema), settingsController.updateEmailSettings);

// Update AI settings
router.put('/ai', validateRequest(updateAISettingsSchema), settingsController.updateAISettings);

// Update theme
router.put('/theme', validateRequest(updateThemeSchema), settingsController.updateTheme);

// Update language
router.put('/language', validateRequest(updateLanguageSchema), settingsController.updateLanguage);

// Define settings routes here

export default router; 