import express from 'express';
import { AIController } from '../controllers/ai.controller';
import { authenticate } from '../middleware/auth';
import { validateRequest } from '../middleware/validate';
import {
  generateSmartReplySchema,
  analyzeEmailSchema,
  suggestSubjectSchema,
  summarizeEmailSchema,
  completeTextSchema,
} from '../validators/ai.validator';

const router = express.Router();
const aiController = new AIController();

// Apply authentication middleware to all AI routes
router.use(authenticate);

// Generate smart reply for an email
router.post('/smart-reply', validateRequest(generateSmartReplySchema), aiController.generateSmartReply);

// Analyze email content
router.post('/analyze', validateRequest(analyzeEmailSchema), aiController.analyzeEmail);

// Suggest email subject
router.post('/suggest-subject', validateRequest(suggestSubjectSchema), aiController.suggestSubject);

// Summarize email content
router.post('/summarize', validateRequest(summarizeEmailSchema), aiController.summarizeEmail);

// Complete text based on context
router.post('/complete-text', validateRequest(completeTextSchema), aiController.completeText);

export default router; 