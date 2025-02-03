import winston from 'winston';
import { format } from 'winston';

const { combine, timestamp, label, printf } = format;

const logFormat = printf(({ level, message, label, timestamp }) => {
  return `${timestamp} [${label}] ${level}: ${message}`;
});

export class Logger {
  private logger: winston.Logger;

  constructor(service: string) {
    this.logger = winston.createLogger({
      format: combine(
        label({ label: service }),
        timestamp(),
        logFormat
      ),
      transports: [
        new winston.transports.Console({
          level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
        }),
        new winston.transports.File({
          filename: 'logs/error.log',
          level: 'error',
        }),
        new winston.transports.File({
          filename: 'logs/combined.log',
        }),
      ],
    });
  }

  info(message: string, ...meta: any[]): void {
    this.logger.info(message, ...meta);
  }

  error(message: string, ...meta: any[]): void {
    this.logger.error(message, ...meta);
  }

  warn(message: string, ...meta: any[]): void {
    this.logger.warn(message, ...meta);
  }

  debug(message: string, ...meta: any[]): void {
    this.logger.debug(message, ...meta);
  }

  // Add structured logging for metrics
  logMetric(
    metricName: string,
    value: number,
    tags: Record<string, string | number> = {}
  ): void {
    this.logger.info('METRIC', {
      metric: metricName,
      value,
      tags,
      timestamp: new Date().toISOString(),
    });
  }

  // Add structured logging for events
  logEvent(
    eventName: string,
    data: Record<string, any> = {},
    tags: Record<string, string | number> = {}
  ): void {
    this.logger.info('EVENT', {
      event: eventName,
      data,
      tags,
      timestamp: new Date().toISOString(),
    });
  }
} 