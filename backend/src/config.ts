import dotenv from 'dotenv';
import { DataSourceOptions } from 'typeorm';

dotenv.config();

interface Config {
  server: {
    port: number;
    host: string;
    environment: string;
  };
  database: DataSourceOptions;
  email: {
    smtp: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    imap: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
    defaults: {
      senderName: string;
      senderEmail: string;
    };
  };
  ai: {
    openaiApiKey: string;
    model: string;
  };
  jwt: {
    secret: string;
    refreshSecret: string;
    accessExpiresIn: string;
    refreshExpiresIn: string;
  };
}

export const config: Config = {
  server: {
    port: parseInt(process.env.PORT || '3001', 10),
    host: process.env.HOST || 'localhost',
    environment: process.env.NODE_ENV || 'development',
  },
  database: {
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    database: process.env.DB_NAME || 'aimail',
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.NODE_ENV !== 'production',
    entities: ['src/entities/**/*.ts'],
    migrations: ['src/migrations/**/*.ts'],
    subscribers: ['src/subscribers/**/*.ts'],
  },
  email: {
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    },
    imap: {
      host: process.env.IMAP_HOST || 'imap.gmail.com',
      port: parseInt(process.env.IMAP_PORT || '993', 10),
      secure: process.env.IMAP_SECURE === 'true',
      auth: {
        user: process.env.IMAP_USER || '',
        pass: process.env.IMAP_PASS || '',
      },
    },
    defaults: {
      senderName: process.env.EMAILS_FROM_NAME || 'AiMail',
      senderEmail: process.env.EMAILS_FROM_EMAIL || process.env.SMTP_USER || '',
    },
  },
  ai: {
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.OPENAI_MODEL || 'gpt-4',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key-here',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key-here',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRE || '30m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRE || '7d',
  },
}; 