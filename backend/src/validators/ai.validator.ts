import { body } from 'express-validator';

export const generateSmartReplySchema = [
  body('emailContent')
    .isString()
    .notEmpty()
    .withMessage('Email content is required'),
];

export const analyzeEmailSchema = [
  body('content')
    .isString()
    .notEmpty()
    .withMessage('Email content is required'),
];

export const suggestSubjectSchema = [
  body('content')
    .isString()
    .notEmpty()
    .withMessage('Email content is required'),
  body('style')
    .optional()
    .isIn(['concise', 'descriptive'])
    .withMessage('Style must be concise or descriptive'),
];

export const summarizeEmailSchema = [
  body('content')
    .isString()
    .notEmpty()
    .withMessage('Email content is required'),
  body('subject')
    .optional()
    .isString()
    .withMessage('Subject must be a string'),
];

export const completeTextSchema = [
  body('prompt')
    .isString()
    .notEmpty()
    .withMessage('Prompt is required'),
  body('context')
    .optional()
    .isString()
    .withMessage('Context must be a string'),
]; 