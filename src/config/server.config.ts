import { config } from 'dotenv';

config();

export const serverConfig = {
  port: process.env.PORT || 3000,
  env: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'your-secret-key',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW) || 15 * 60 * 1000, // 15 minutes
  rateLimitMax: Number(process.env.RATE_LIMIT_MAX) || 100,
  corsOrigin: process.env.CORS_ORIGIN || '*',
  apiPrefix: '/api/v1'
}; 