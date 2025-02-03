import { EmailServiceConfig } from '../services/email/types';

export const emailConfig: EmailServiceConfig = {
  imap: {
    host: process.env.EMAIL_IMAP_HOST || '',
    port: parseInt(process.env.EMAIL_IMAP_PORT || '993'),
    secure: process.env.EMAIL_IMAP_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
  },
  smtp: {
    host: process.env.EMAIL_SMTP_HOST || '',
    port: parseInt(process.env.EMAIL_SMTP_PORT || '587'),
    secure: process.env.EMAIL_SMTP_SECURE === 'true',
    user: process.env.EMAIL_USER || '',
    password: process.env.EMAIL_PASSWORD || '',
  },
  polling: {
    interval: parseInt(process.env.EMAIL_POLLING_INTERVAL || '60000'), // Default: 1 minute
    maxRetries: parseInt(process.env.EMAIL_MAX_RETRIES || '3'),
    retryDelay: parseInt(process.env.EMAIL_RETRY_DELAY || '5000'), // Default: 5 seconds
  },
  processing: {
    maxConcurrent: parseInt(process.env.EMAIL_MAX_CONCURRENT || '5'),
    timeout: parseInt(process.env.EMAIL_PROCESSING_TIMEOUT || '30000'), // Default: 30 seconds
    retryStrategy: (process.env.EMAIL_RETRY_STRATEGY || 'exponential') as 'exponential' | 'linear',
  },
}; 