import { body } from 'express-validator';
import { SystemFolderType } from '../entities/Folder';
import { checkSchema } from 'express-validator';

export const updateSettingsSchema = [
  body('theme')
    .optional()
    .isIn(['light', 'dark', 'system'])
    .withMessage('Theme must be light, dark, or system'),
  body('language')
    .optional()
    .isString()
    .isLength({ min: 2, max: 5 })
    .withMessage('Language code must be between 2 and 5 characters'),
  body('emailsPerPage')
    .optional()
    .isInt({ min: 10, max: 100 })
    .withMessage('Emails per page must be between 10 and 100'),
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),
  body('notifications.enabled')
    .optional()
    .isBoolean()
    .withMessage('Notifications enabled must be a boolean'),
  body('notifications.sound')
    .optional()
    .isBoolean()
    .withMessage('Notifications sound must be a boolean'),
  body('notifications.desktop')
    .optional()
    .isBoolean()
    .withMessage('Desktop notifications must be a boolean'),
  body('autoRefreshInterval')
    .optional()
    .isInt({ min: 0, max: 3600 })
    .withMessage('Auto refresh interval must be between 0 and 3600 seconds'),
  body('signature')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('Signature cannot exceed 1000 characters'),
  body('defaultReplyBehavior')
    .optional()
    .isIn(['reply', 'replyAll'])
    .withMessage('Default reply behavior must be reply or replyAll'),
];

export const updateEmailSettingsSchema = [
  body('signature')
    .optional()
    .isString()
    .withMessage('Signature must be a string'),
  body('replyTo')
    .optional()
    .isEmail()
    .withMessage('Reply-to must be a valid email'),
  body('sendDelay')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Send delay must be a non-negative integer'),
  body('defaultFolder')
    .optional()
    .isIn(Object.values(SystemFolderType))
    .withMessage('Invalid default folder'),
  body('notifications')
    .optional()
    .isObject()
    .withMessage('Notifications must be an object'),
  body('notifications.newEmail')
    .optional()
    .isBoolean()
    .withMessage('newEmail must be a boolean'),
  body('notifications.mentions')
    .optional()
    .isBoolean()
    .withMessage('mentions must be a boolean'),
  body('notifications.reminders')
    .optional()
    .isBoolean()
    .withMessage('reminders must be a boolean'),
  body('filters')
    .optional()
    .isArray()
    .withMessage('Filters must be an array'),
  body('filters.*.name')
    .optional()
    .isString()
    .withMessage('Filter name must be a string'),
  body('filters.*.condition')
    .optional()
    .isString()
    .withMessage('Filter condition must be a string'),
  body('filters.*.action')
    .optional()
    .isString()
    .withMessage('Filter action must be a string'),
];

export const updateAISettingsSchema = [
  body('smartReplyStyle')
    .optional()
    .isIn(['professional', 'casual', 'friendly'])
    .withMessage('Invalid smart reply style'),
  body('enableAutoComplete')
    .optional()
    .isBoolean()
    .withMessage('enableAutoComplete must be a boolean'),
  body('enableSmartCompose')
    .optional()
    .isBoolean()
    .withMessage('enableSmartCompose must be a boolean'),
  body('enableSummary')
    .optional()
    .isBoolean()
    .withMessage('enableSummary must be a boolean'),
  body('enableCategories')
    .optional()
    .isBoolean()
    .withMessage('enableCategories must be a boolean'),
  body('enablePriority')
    .optional()
    .isBoolean()
    .withMessage('enablePriority must be a boolean'),
  body('languageModel')
    .optional()
    .isString()
    .withMessage('Language model must be a string'),
];

export const updateThemeSchema = [
  body('theme')
    .isIn(['light', 'dark', 'system'])
    .withMessage('Invalid theme'),
];

export const updateLanguageSchema = checkSchema({
  language: {
    in: ['body'],
    isString: true,
    errorMessage: 'Language is required and must be a string',
  },
}); 