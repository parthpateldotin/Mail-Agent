import { query, param, body } from 'express-validator';
import { validateResult } from './auth.validator';
import { EmailStatus } from '../models/email/email.entity';

// List emails validation
export const listEmailsValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(Object.values(EmailStatus))
    .withMessage('Invalid email status'),
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO date'),
  query('isArchived')
    .optional()
    .isBoolean()
    .withMessage('isArchived must be a boolean'),
  query('isSpam')
    .optional()
    .isBoolean()
    .withMessage('isSpam must be a boolean'),
  validateResult
];

// Get email by ID validation
export const getEmailValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid email ID format'),
  validateResult
];

// Update email status validation
export const updateEmailStatusValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid email ID format'),
  body('status')
    .isIn(Object.values(EmailStatus))
    .withMessage('Invalid email status'),
  validateResult
];

// Process email validation
export const processEmailValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid email ID format'),
  body('force')
    .optional()
    .isBoolean()
    .withMessage('force must be a boolean'),
  validateResult
];

// Update email labels validation
export const updateEmailLabelsValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid email ID format'),
  body('labels')
    .isArray()
    .withMessage('Labels must be an array'),
  body('labels.*')
    .isString()
    .withMessage('Each label must be a string'),
  validateResult
];

// Archive/Unarchive email validation
export const toggleArchiveValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid email ID format'),
  body('archived')
    .isBoolean()
    .withMessage('archived must be a boolean'),
  validateResult
];

// Mark as spam/not spam validation
export const toggleSpamValidation = [
  param('id')
    .isUUID()
    .withMessage('Invalid email ID format'),
  body('spam')
    .isBoolean()
    .withMessage('spam must be a boolean'),
  validateResult
]; 