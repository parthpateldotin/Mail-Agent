import nodemailer from 'nodemailer';
import { Logger } from '../../utils/Logger';
import { Alert } from '../alert/alert.service';
import { readFileSync } from 'fs';
import { join } from 'path';
import Handlebars from 'handlebars';

export interface EmailConfig {
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    auth: {
      user: string;
      pass: string;
    };
  };
  from: string;
  recipients: string[];
  templates: {
    alert: string;
    daily: string;
    weekly: string;
  };
  rateLimits: {
    maxPerMinute: number;
    maxPerHour: number;
  };
}

export class EmailService {
  private static instance: EmailService;
  private transporter: nodemailer.Transporter;
  private templates: Map<string, HandlebarsTemplateDelegate> = new Map();
  private emailsSentLastMinute = 0;
  private emailsSentLastHour = 0;
  private lastMinuteReset: Date = new Date();
  private lastHourReset: Date = new Date();

  private constructor(private config: EmailConfig) {
    this.initializeTransporter();
    this.loadTemplates();
    this.startRateLimitResetInterval();
  }

  public static getInstance(config?: EmailConfig): EmailService {
    if (!EmailService.instance && config) {
      EmailService.instance = new EmailService(config);
    }
    return EmailService.instance;
  }

  private initializeTransporter(): void {
    this.transporter = nodemailer.createTransport(this.config.smtp);
  }

  private loadTemplates(): void {
    try {
      const templatesPath = join(__dirname, '../../templates/email');
      
      const templates = {
        alert: readFileSync(join(templatesPath, 'alert.hbs'), 'utf-8'),
        daily: readFileSync(join(templatesPath, 'daily-report.hbs'), 'utf-8'),
        weekly: readFileSync(join(templatesPath, 'weekly-report.hbs'), 'utf-8')
      };

      for (const [name, content] of Object.entries(templates)) {
        this.templates.set(name, Handlebars.compile(content));
      }
    } catch (error) {
      Logger.error('Error loading email templates:', error);
      throw error;
    }
  }

  private startRateLimitResetInterval(): void {
    // Reset minute counter
    setInterval(() => {
      this.emailsSentLastMinute = 0;
      this.lastMinuteReset = new Date();
    }, 60000);

    // Reset hour counter
    setInterval(() => {
      this.emailsSentLastHour = 0;
      this.lastHourReset = new Date();
    }, 3600000);
  }

  private checkRateLimit(): boolean {
    const now = new Date();
    
    // Reset counters if needed
    if (now.getTime() - this.lastMinuteReset.getTime() > 60000) {
      this.emailsSentLastMinute = 0;
      this.lastMinuteReset = now;
    }
    if (now.getTime() - this.lastHourReset.getTime() > 3600000) {
      this.emailsSentLastHour = 0;
      this.lastHourReset = now;
    }

    return (
      this.emailsSentLastMinute < this.config.rateLimits.maxPerMinute &&
      this.emailsSentLastHour < this.config.rateLimits.maxPerHour
    );
  }

  private incrementRateLimit(): void {
    this.emailsSentLastMinute++;
    this.emailsSentLastHour++;
  }

  public async sendAlert(alert: Alert): Promise<boolean> {
    try {
      if (!this.checkRateLimit()) {
        Logger.warn('Email rate limit exceeded');
        return false;
      }

      const template = this.templates.get('alert');
      if (!template) {
        throw new Error('Alert template not found');
      }

      const html = template({
        alert,
        timestamp: new Date().toLocaleString(),
        severity: alert.severity.toUpperCase(),
        component: alert.component
      });

      const mailOptions = {
        from: this.config.from,
        to: this.config.recipients.join(', '),
        subject: `[${alert.severity.toUpperCase()}] ${alert.message}`,
        html
      };

      await this.transporter.sendMail(mailOptions);
      this.incrementRateLimit();
      
      Logger.info(`Alert email sent: ${alert.message}`);
      return true;
    } catch (error) {
      Logger.error('Error sending alert email:', error);
      return false;
    }
  }

  public async sendDailyReport(data: any): Promise<boolean> {
    try {
      if (!this.checkRateLimit()) {
        Logger.warn('Email rate limit exceeded');
        return false;
      }

      const template = this.templates.get('daily');
      if (!template) {
        throw new Error('Daily report template not found');
      }

      const html = template({
        data,
        date: new Date().toLocaleDateString()
      });

      const mailOptions = {
        from: this.config.from,
        to: this.config.recipients.join(', '),
        subject: `Daily System Report - ${new Date().toLocaleDateString()}`,
        html
      };

      await this.transporter.sendMail(mailOptions);
      this.incrementRateLimit();
      
      Logger.info('Daily report email sent');
      return true;
    } catch (error) {
      Logger.error('Error sending daily report email:', error);
      return false;
    }
  }

  public async sendWeeklyReport(data: any): Promise<boolean> {
    try {
      if (!this.checkRateLimit()) {
        Logger.warn('Email rate limit exceeded');
        return false;
      }

      const template = this.templates.get('weekly');
      if (!template) {
        throw new Error('Weekly report template not found');
      }

      const html = template({
        data,
        weekStart: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        weekEnd: new Date().toLocaleDateString()
      });

      const mailOptions = {
        from: this.config.from,
        to: this.config.recipients.join(', '),
        subject: `Weekly System Report - ${new Date().toLocaleDateString()}`,
        html
      };

      await this.transporter.sendMail(mailOptions);
      this.incrementRateLimit();
      
      Logger.info('Weekly report email sent');
      return true;
    } catch (error) {
      Logger.error('Error sending weekly report email:', error);
      return false;
    }
  }

  public async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      Logger.error('Email connection verification failed:', error);
      return false;
    }
  }
} 