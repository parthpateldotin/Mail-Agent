import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  createEmailSchema,
  updateEmailSchema,
  moveEmailSchema,
  searchEmailSchema,
} from '../validators/email.validator';

const router = Router();
const emailController = new EmailController();

// Apply authentication middleware to all routes
router.use(authenticate);

// Get all emails
router.get('/', emailController.getEmails);

// Get email by ID
router.get('/:id', emailController.getEmail);

// Create new email
router.post('/', validateRequest(createEmailSchema), emailController.createEmail);

// Update email
router.put('/:id', validateRequest(updateEmailSchema), emailController.updateEmail);

// Delete email
router.delete('/:id', emailController.deleteEmail);

// Move email to folder
router.post('/:id/move', validateRequest(moveEmailSchema), emailController.moveToFolder);

// Search emails
router.get('/search', validateRequest(searchEmailSchema), emailController.searchEmails);

export default router; 