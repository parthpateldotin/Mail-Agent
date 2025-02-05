import { body } from 'express-validator';
import { checkSchema } from 'express-validator';

export const createFolderSchema = [
  body('name')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Folder name is required')
    .isLength({ min: 1, max: 50 })
    .withMessage('Folder name must be between 1 and 50 characters'),
  body('color')
    .optional()
    .isString()
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  body('icon')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Icon name cannot be empty'),
];

export const updateFolderSchema = [
  body('name')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Folder name cannot be empty')
    .isLength({ min: 1, max: 50 })
    .withMessage('Folder name must be between 1 and 50 characters'),
  body('color')
    .optional()
    .isString()
    .trim()
    .matches(/^#[0-9A-Fa-f]{6}$/)
    .withMessage('Color must be a valid hex color code'),
  body('icon')
    .optional()
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Icon name cannot be empty'),
];

export const moveToFolderSchema = checkSchema({
  folderId: {
    in: ['body'],
    isString: true,
    errorMessage: 'Folder ID is required and must be a string',
  },
}); 