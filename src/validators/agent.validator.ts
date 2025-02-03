import { body } from 'express-validator';
import { validateResult } from './auth.validator';

export const validateAgentSettings = [
  // Validate maxConcurrentProcessing
  body('maxConcurrentProcessing')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('maxConcurrentProcessing must be between 1 and 20'),

  // Validate processingTimeout
  body('processingTimeout')
    .optional()
    .isInt({ min: 5000, max: 300000 })
    .withMessage('processingTimeout must be between 5000ms and 300000ms'),

  // Validate retryAttempts
  body('retryAttempts')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('retryAttempts must be between 0 and 10'),

  // Validate retryDelay
  body('retryDelay')
    .optional()
    .isInt({ min: 1000, max: 60000 })
    .withMessage('retryDelay must be between 1000ms and 60000ms'),

  // Validate pollingInterval
  body('pollingInterval')
    .optional()
    .isInt({ min: 10000, max: 300000 })
    .withMessage('pollingInterval must be between 10000ms and 300000ms'),

  // Validate enabledFeatures
  body('enabledFeatures')
    .optional()
    .isArray()
    .withMessage('enabledFeatures must be an array')
    .custom((features: string[]) => {
      const validFeatures = ['email_processing', 'spam_detection', 'auto_response'];
      return features.every(feature => validFeatures.includes(feature));
    })
    .withMessage('Invalid feature specified'),

  // Validate LLM settings
  body('llmSettings.model')
    .optional()
    .isString()
    .isIn(['gpt-4', 'gpt-3.5-turbo'])
    .withMessage('Invalid LLM model'),

  body('llmSettings.temperature')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('temperature must be between 0 and 1'),

  body('llmSettings.maxTokens')
    .optional()
    .isInt({ min: 100, max: 4000 })
    .withMessage('maxTokens must be between 100 and 4000'),

  // Validate email settings
  body('emailSettings.maxAttachmentSize')
    .optional()
    .isInt({ min: 1024 * 1024, max: 50 * 1024 * 1024 })
    .withMessage('maxAttachmentSize must be between 1MB and 50MB'),

  body('emailSettings.allowedMimeTypes')
    .optional()
    .isArray()
    .withMessage('allowedMimeTypes must be an array')
    .custom((types: string[]) => {
      const validTypes = ['application/pdf', 'image/jpeg', 'image/png', 'text/plain'];
      return types.every(type => validTypes.includes(type));
    })
    .withMessage('Invalid MIME type specified'),

  body('emailSettings.spamThreshold')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('spamThreshold must be between 0 and 1'),

  validateResult
]; 