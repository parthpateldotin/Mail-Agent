import { EventEmitter } from 'events';
import * as nodemailer from 'nodemailer';
import * as Imap from 'imap';
import { simpleParser } from 'mailparser';
import {
  IncomingEmail,
  EmailResponse,
  EmailServiceConfig,
  EmailStatus,
  ProcessingInfo,
  EmailContext,
} from './types';
import { LLMService } from '../llm/LLMService';
import { ResponseGenerator } from './ResponseGenerator';
import { Logger } from '../utils/Logger';

export class EmailService extends EventEmitter {
  private imap: Imap;
  private transporter: nodemailer.Transporter;
  private config: EmailServiceConfig;
  private llmService: LLMService;
  private responseGenerator: ResponseGenerator;
  private isListening: boolean = false;
  private processingQueue: Map<string, ProcessingInfo> = new Map();

  constructor(
    config: EmailServiceConfig,
    llmService: LLMService,
    responseGenerator: ResponseGenerator
  ) {
    super();
    this.config = config;
    this.llmService = llmService;
    this.responseGenerator = responseGenerator;
    this.setupConnections();
  }

  private setupConnections() {
    // Setup IMAP
    this.imap = new Imap({
      user: this.config.imap.user,
      password: this.config.imap.password,
      host: this.config.imap.host,
      port: this.config.imap.port,
      tls: this.config.imap.secure,
    });

    // Setup SMTP
    this.transporter = nodemailer.createTransport({
      host: this.config.smtp.host,
      port: this.config.smtp.port,
      secure: this.config.smtp.secure,
      auth: {
        user: this.config.smtp.user,
        pass: this.config.smtp.password,
      },
    });

    // Setup event handlers
    this.imap.on('error', (err) => {
      Logger.error('IMAP Error:', err);
      this.emit('error', err);
    });

    this.imap.on('end', () => {
      Logger.info('IMAP connection ended');
      this.emit('disconnected');
    });
  }

  public async start(): Promise<void> {
    if (this.isListening) {
      return;
    }

    try {
      await this.connect();
      this.isListening = true;
      this.startPolling();
      this.emit('started');
      Logger.info('Email service started successfully');
    } catch (error) {
      Logger.error('Failed to start email service:', error);
      throw error;
    }
  }

  public async stop(): Promise<void> {
    if (!this.isListening) {
      return;
    }

    try {
      this.isListening = false;
      await this.disconnect();
      this.emit('stopped');
      Logger.info('Email service stopped successfully');
    } catch (error) {
      Logger.error('Failed to stop email service:', error);
      throw error;
    }
  }

  private async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.once('ready', () => {
        Logger.info('IMAP connection established');
        resolve();
      });

      this.imap.once('error', (err) => {
        Logger.error('IMAP connection error:', err);
        reject(err);
      });

      this.imap.connect();
    });
  }

  private async disconnect(): Promise<void> {
    return new Promise((resolve) => {
      this.imap.end();
      resolve();
    });
  }

  private startPolling(): void {
    setInterval(async () => {
      if (!this.isListening) return;
      try {
        await this.checkNewEmails();
      } catch (error) {
        Logger.error('Error checking new emails:', error);
      }
    }, this.config.polling.interval);
  }

  private async checkNewEmails(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imap.openBox('INBOX', false, (err, box) => {
        if (err) {
          Logger.error('Error opening inbox:', err);
          reject(err);
          return;
        }

        const fetch = this.imap.seq.fetch('1:*', {
          bodies: ['HEADER', 'TEXT'],
          struct: true,
        });

        fetch.on('message', (msg) => {
          this.processMessage(msg);
        });

        fetch.once('error', (err) => {
          Logger.error('Fetch error:', err);
          reject(err);
        });

        fetch.once('end', () => {
          resolve();
        });
      });
    });
  }

  private async processMessage(msg: any): Promise<void> {
    const email = await this.parseEmail(msg);
    if (!email) return;

    try {
      // Analyze context using LLM
      const context = await this.llmService.analyzeContext(email);
      
      // Generate response if needed
      if (context.metadata.requiresResponse) {
        const response = await this.responseGenerator.generate({
          email,
          context,
        });

        // Validate response
        const isValid = await this.llmService.validateResponse(response);
        if (isValid) {
          await this.sendResponse(response);
        } else {
          throw new Error('Generated response validation failed');
        }
      }

      this.emit('processed', {
        emailId: email.id,
        status: 'completed',
      });
    } catch (error) {
      Logger.error('Error processing email:', error);
      this.emit('error', {
        emailId: email.id,
        error,
      });
    }
  }

  private async parseEmail(msg: any): Promise<IncomingEmail | null> {
    return new Promise((resolve) => {
      let email: any = {};
      
      msg.on('body', (stream: any, info: any) => {
        simpleParser(stream, async (err, parsed) => {
          if (err) {
            Logger.error('Error parsing email:', err);
            resolve(null);
            return;
          }

          const getEmailAddress = (addr: any): string => {
            if (Array.isArray(addr)) {
              return addr.map(a => a.address).join(', ');
            }
            return addr?.address || '';
          };

          email = {
            id: parsed.messageId,
            from: getEmailAddress(parsed.from),
            to: Array.isArray(parsed.to) 
              ? parsed.to.map(getEmailAddress)
              : [getEmailAddress(parsed.to)],
            subject: parsed.subject || '',
            content: parsed.text || '',
            timestamp: parsed.date || new Date(),
            attachments: parsed.attachments,
          };
        });
      });

      msg.once('end', () => {
        resolve(email);
      });
    });
  }

  private async sendResponse(response: EmailResponse): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.smtp.user,
        to: response.inReplyTo,
        subject: response.subject,
        text: response.content,
        attachments: response.attachments,
      });

      this.emit('response_sent', {
        emailId: response.id,
        status: 'sent',
      });
    } catch (error) {
      Logger.error('Error sending response:', error);
      throw error;
    }
  }

  public getStatus(): { isListening: boolean; queue: number } {
    return {
      isListening: this.isListening,
      queue: this.processingQueue.size,
    };
  }
} 