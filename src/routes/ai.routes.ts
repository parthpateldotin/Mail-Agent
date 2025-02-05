import { Router } from 'express';
import { AIController } from '../controllers/ai.controller';
import { validateRequest } from '../middleware/validate-request';
import { analyzeEmailSchema, suggestSubjectSchema, completeTextSchema } from '../schemas/ai.schema';

const router = Router();
const aiController = new AIController();

router.post('/analyze', validateRequest(analyzeEmailSchema), aiController.analyzeEmail);
router.post('/suggest-subject', validateRequest(suggestSubjectSchema), aiController.suggestSubject);
router.post('/complete-text', validateRequest(completeTextSchema), aiController.completeText);

export default router; 