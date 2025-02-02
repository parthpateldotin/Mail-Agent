import { createTransport } from 'nodemailer';
import { connect as imapConnect } from 'imap-simple';
import { simpleParser } from 'mailparser';
import { EmailConfig } from '../types/email';
import { ProcessedEmail } from '../types/email';
import { LLMService } from './LLMService';
import { config } from 'dotenv';

// Load environment variables
config();

export class EmailManager {
  private imapConnection: any;
  private smtpTransport: any;
  private config: EmailConfig | null = null;
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
    // Set default config from environment variables
    this.config = {
      imap: {
        host: process.env.IMAP_HOST || '',
        port: process.env.IMAP_PORT || '',
        username: process.env.IMAP_USER || '',
        password: process.env.IMAP_PASS || '',
        secure: process.env.IMAP_SECURE === 'true',
      },
      smtp: {
        host: process.env.SMTP_HOST || '',
        port: process.env.SMTP_PORT || '',
        username: process.env.SMTP_USER || '',
        password: process.env.SMTP_PASS || '',
        secure: process.env.SMTP_SECURE === 'true',
      },
      autoResponse: {
        enabled: false,
        adminEmail: process.env.ADMIN_EMAIL || '',
        summaryEnabled: true,
        responseDelay: '5',
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
        excludedEmails: '',
        customSignature: '',
      },
    };
    this.setupConnections();
  }

  async configure(config: EmailConfig) {
    this.config = config;
    await this.setupConnections();
  }

  private async setupConnections() {
    if (!this.config) throw new Error('Email configuration not set');

    // Setup SMTP
    this.smtpTransport = createTransport({
      host: this.config.smtp.host,
      port: parseInt(this.config.smtp.port),
      secure: this.config.smtp.secure,
      auth: {
        user: this.config.smtp.username,
        pass: this.config.smtp.password,
      },
    });

    // Setup IMAP
    const imapConfig = {
      imap: {
        user: this.config.imap.username,
        password: this.config.imap.password,
        host: this.config.imap.host,
        port: parseInt(this.config.imap.port),
        tls: this.config.imap.secure,
        tlsOptions: { rejectUnauthorized: false },
      },
    };

    this.imapConnection = await imapConnect(imapConfig);
  }

  async testConnection(config: EmailConfig): Promise<void> {
    try {
      // Test SMTP
      const testTransport = createTransport({
        host: config.smtp.host,
        port: parseInt(config.smtp.port),
        secure: config.smtp.secure,
        auth: {
          user: config.smtp.username,
          pass: config.smtp.password,
        },
      });
      await testTransport.verify();

      // Test IMAP
      const imapConfig = {
        imap: {
          user: config.imap.username,
          password: config.imap.password,
          host: config.imap.host,
          port: parseInt(config.imap.port),
          tls: config.imap.secure,
          tlsOptions: { rejectUnauthorized: false },
        },
      };
      const connection = await imapConnect(imapConfig);
      await connection.end();
    } catch (error) {
      throw new Error('Connection test failed: ' + error.message);
    }
  }

  async processNewEmails(): Promise<ProcessedEmail[]> {
    if (!this.imapConnection) throw new Error('IMAP connection not established');

    try {
      await this.imapConnection.openBox('INBOX');
      
      // Search for unread messages
      const searchCriteria = ['UNSEEN'];
      const fetchOptions = {
        bodies: ['HEADER', 'TEXT'],
        markSeen: false,
      };

      const messages = await this.imapConnection.search(searchCriteria, fetchOptions);
      const processedEmails: ProcessedEmail[] = [];

      for (const message of messages) {
        const parsed = await simpleParser(message.parts.filter(p => p.which === 'TEXT')[0].body);
        
        const email: ProcessedEmail = {
          id: message.attributes.uid,
          from: parsed.from?.text || '',
          subject: parsed.subject || '',
          content: parsed.text || '',
          timestamp: parsed.date?.toISOString() || new Date().toISOString(),
        };

        processedEmails.push(email);
      }

      return processedEmails;
    } catch (error) {
      throw new Error('Failed to process emails: ' + error.message);
    }
  }

  async sendResponse(emailId: string, response: string): Promise<void> {
    if (!this.config || !this.smtpTransport) {
      throw new Error('Email configuration not set');
    }

    try {
      // Get original email details
      await this.imapConnection.openBox('INBOX');
      const searchCriteria = [['UID', emailId]];
      const fetchOptions = { bodies: ['HEADER'] };
      const messages = await this.imapConnection.search(searchCriteria, fetchOptions);
      
      if (messages.length === 0) {
        throw new Error('Original email not found');
      }

      const originalEmail = messages[0];
      const headers = originalEmail.parts.filter(p => p.which === 'HEADER')[0].body;

      // Send response
      await this.smtpTransport.sendMail({
        from: this.config.smtp.username,
        to: headers.from[0],
        subject: `Re: ${headers.subject[0]}`,
        text: response,
      });

      // Mark original email as seen
      await this.imapConnection.addFlags(emailId, ['\\Seen']);
    } catch (error) {
      throw new Error('Failed to send response: ' + error.message);
    }
  }

  async sendSummaryToAdmin(summaries: ProcessedEmail[]): Promise<void> {
    if (!this.config || !this.smtpTransport) {
      throw new Error('Email configuration not set');
    }

    try {
      const adminEmail = this.config.autoResponse.adminEmail;
      if (!adminEmail) {
        throw new Error('Admin email not configured');
      }

      const summaryText = summaries.map(email => `
From: ${email.from}
Subject: ${email.subject}
Time: ${new Date(email.timestamp).toLocaleString()}
Priority: ${email.priority || 'Not set'}
Sentiment: ${email.sentiment || 'Not analyzed'}

Summary:
${email.summary || 'No summary available'}

${email.autoResponseSent ? '✓ Auto-response sent' : '✗ No auto-response sent'}
-------------------
`).join('\n');

      await this.smtpTransport.sendMail({
        from: this.config.smtp.username,
        to: adminEmail,
        subject: `Email Summaries - ${new Date().toLocaleDateString()}`,
        text: `Email Summaries Report\n\n${summaryText}`,
      });
    } catch (error) {
      throw new Error('Failed to send summary to admin: ' + error.message);
    }
  }

  async disconnect(): Promise<void> {
    if (this.imapConnection) {
      await this.imapConnection.end();
    }
    if (this.smtpTransport) {
      this.smtpTransport.close();
    }
  }
} 