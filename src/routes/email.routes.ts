import { Router } from 'express';
import { EmailController } from '../controllers/email.controller';
import { authenticate, authorize } from '../middleware';
import {
  listEmailsValidation,
  getEmailValidation,
  updateEmailStatusValidation,
  processEmailValidation,
  updateEmailLabelsValidation,
  toggleArchiveValidation,
  toggleSpamValidation
} from '../validators/email.validator';
import { RequestHandler } from 'express';

const router = Router();
const emailController = new EmailController();

// Apply authentication to all routes
router.use(authenticate);

// List emails with filtering and pagination
router.get('/', 
  listEmailsValidation as RequestHandler[],
  emailController.listEmails
);

// Get email statistics
router.get('/stats',
  authorize('admin', 'agent') as RequestHandler,
  emailController.getEmailStats
);

// Get email by ID
router.get('/:id',
  getEmailValidation as RequestHandler[],
  emailController.getEmailById
);

// Update email status
router.put('/:id/status',
  authorize('admin', 'agent') as RequestHandler,
  updateEmailStatusValidation as RequestHandler[],
  emailController.updateEmailStatus
);

// Process email
router.post('/:id/process',
  authorize('admin', 'agent') as RequestHandler,
  processEmailValidation as RequestHandler[],
  emailController.processEmail
);

// Update email labels
router.put('/:id/labels',
  authorize('admin', 'agent') as RequestHandler,
  updateEmailLabelsValidation as RequestHandler[],
  emailController.updateLabels
);

// Toggle archive status
router.put('/:id/archive',
  authorize('admin', 'agent') as RequestHandler,
  toggleArchiveValidation as RequestHandler[],
  emailController.toggleArchive
);

// Toggle spam status
router.put('/:id/spam',
  authorize('admin', 'agent') as RequestHandler,
  toggleSpamValidation as RequestHandler[],
  emailController.toggleSpam
);

export default router; 