import { body, query } from 'express-validator';

export const createEmailSchema = [
  body('to')
    .isArray()
    .withMessage('Recipients must be an array')
    .notEmpty()
    .withMessage('At least one recipient is required')
    .custom((value) => value.every((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    .withMessage('Invalid email address in recipients'),
  body('subject')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Subject is required')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  body('content')
    .isString()
    .notEmpty()
    .withMessage('Content is required'),
  body('cc')
    .optional()
    .isArray()
    .custom((value) => value.every((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    .withMessage('Invalid email address in CC'),
  body('bcc')
    .optional()
    .isArray()
    .custom((value) => value.every((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
    .withMessage('Invalid email address in BCC'),
  body('attachments')
    .optional()
    .isArray()
    .withMessage('Attachments must be an array'),
];

export const updateEmailSchema = [
  body('subject')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Subject cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Subject cannot exceed 200 characters'),
  body('content')
    .optional()
    .isString()
    .notEmpty()
    .withMessage('Content cannot be empty'),
  body('isDraft')
    .optional()
    .isBoolean()
    .withMessage('isDraft must be a boolean'),
  body('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead must be a boolean'),
  body('isStarred')
    .optional()
    .isBoolean()
    .withMessage('isStarred must be a boolean'),
];

export const moveEmailSchema = [
  body('folderId')
    .isString()
    .notEmpty()
    .withMessage('Folder ID is required'),
];

export const searchEmailSchema = [
  query('q')
    .optional()
    .isString()
    .trim(),
  query('folder')
    .optional()
    .isString(),
  query('from')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for from parameter'),
  query('to')
    .optional()
    .isISO8601()
    .withMessage('Invalid date format for to parameter'),
  query('isRead')
    .optional()
    .isBoolean()
    .withMessage('isRead must be a boolean'),
  query('isStarred')
    .optional()
    .isBoolean()
    .withMessage('isStarred must be a boolean'),
  query('hasAttachments')
    .optional()
    .isBoolean()
    .withMessage('hasAttachments must be a boolean'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('sort')
    .optional()
    .isIn(['date', '-date', 'subject', '-subject'])
    .withMessage('Invalid sort parameter'),
]; 