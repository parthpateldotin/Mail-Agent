import { config as dotenvConfig } from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenvConfig({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  server: {
    port: process.env.PORT || 3001,
    host: process.env.HOST || '0.0.0.0',
    environment: process.env.NODE_ENV || 'development',
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    imap: {
      host: process.env.IMAP_HOST || 'imap.hostinger.com',
      port: parseInt(process.env.IMAP_PORT || '993'),
      secure: process.env.IMAP_SECURE === 'true',
      auth: {
        user: process.env.IMAP_USER || '',
        pass: process.env.IMAP_PASS || '',
      },
    },
    defaults: {
      from: {
        name: process.env.MAIL_FROM_NAME || 'AiMail',
        address: process.env.MAIL_FROM || 'ai@deployx.in',
      },
    },
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
    maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '2000'),
    temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
  },
  admin: {
    email: process.env.ADMIN_EMAIL || 'ai@deployx.in',
    password: process.env.ADMIN_PASSWORD || '',
  },
  security: {
    jwtSecret: process.env.JWT_SECRET || 'your-strong-jwt-secret-here',
    sessionSecret: process.env.SESSION_SECRET || 'your-strong-session-secret-here',
    accessTokenExpire: parseInt(process.env.ACCESS_TOKEN_EXPIRE_MINUTES || '30'),
    refreshTokenExpire: parseInt(process.env.REFRESH_TOKEN_EXPIRE_DAYS || '7'),
  },
  cors: {
    origin: process.env.CORS_ORIGIN || 'http://localhost:8000',
    allowedHosts: JSON.parse(process.env.ALLOWED_HOSTS || '["*"]'),
  },
  features: {
    enableMetrics: process.env.ENABLE_METRICS === 'true',
    enableDocs: process.env.ENABLE_DOCS === 'true',
    aiEnabled: process.env.AI_ENABLED === 'true',
  },
  rateLimiting: {
    enabled: process.env.RATE_LIMIT_ENABLED === 'true',
    defaultCalls: parseInt(process.env.DEFAULT_RATE_LIMIT_CALLS || '100'),
    defaultPeriod: parseInt(process.env.DEFAULT_RATE_LIMIT_PERIOD || '60'),
  },
} as const;

// Type for the config object
export type Config = typeof config;

// Export individual config sections for convenience
export const {
  server,
  email,
  openai,
  admin,
  security,
  cors,
  features,
  rateLimiting,
} = config; 