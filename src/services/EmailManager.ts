import { simpleParser, ParsedMail } from 'mailparser';
import { ProcessedEmail, EmailResponse } from '../types/email';
import { AppError } from '../utils/AppError';

interface EmailPart {
  which: string;
  body: Buffer | string;
}

interface EmailMessage {
  id: string;
  parts: EmailPart[];
  to: string[];
  subject: string;
  messageId: string;
  references?: string[];
}

export class EmailManager {
  private imap: any; // Replace with proper IMAP client type
  private smtp: any; // Replace with proper SMTP client type

  constructor(config: any) { // Replace with proper config type
    // Initialize IMAP and SMTP clients
  }

  public async testConnection(): Promise<void> {
    try {
      await this.imap.connect();
      console.log('IMAP connection successful');
      await this.smtp.verify();
      console.log('SMTP connection successful');
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Connection test failed: ${error.message}`, 500);
      }
      throw new AppError('Connection test failed with unknown error', 500);
    }
  }

  public async processEmails(): Promise<ProcessedEmail[]> {
    try {
      await this.imap.connect();
      const messages = await this.imap.fetch();
      
      const processedEmails: ProcessedEmail[] = await Promise.all(
        messages.map(async (message: EmailMessage) => {
          const textPart = message.parts.find((p: EmailPart) => p.which === 'TEXT');
          if (!textPart) {
            throw new AppError('No text content found in email', 400);
          }

          const parsed: ParsedMail = await simpleParser(textPart.body);
          
          return {
            id: message.id,
            from: parsed.from?.text || '',
            to: message.to,
            subject: message.subject,
            content: parsed.text || '',
            timestamp: parsed.date?.toISOString() || new Date().toISOString()
          };
        })
      );

      return processedEmails;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to process emails: ${error.message}`, 500);
      }
      throw new AppError('Failed to process emails with unknown error', 500);
    }
  }

  public async sendResponse(emailId: string, response: string): Promise<void> {
    try {
      const originalEmail = await this.imap.fetchOne(emailId);
      if (!originalEmail) {
        throw new AppError('Original email not found', 404);
      }

      const headerPart = originalEmail.parts.find((p: EmailPart) => p.which === 'HEADER');
      if (!headerPart) {
        throw new AppError('Email headers not found', 400);
      }

      await this.smtp.sendMail({
        to: originalEmail.to,
        subject: `Re: ${originalEmail.subject}`,
        text: response,
        inReplyTo: originalEmail.messageId,
        references: originalEmail.references ? [...originalEmail.references, originalEmail.messageId] : [originalEmail.messageId]
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to send response: ${error.message}`, 500);
      }
      throw new AppError('Failed to send response with unknown error', 500);
    }
  }

  public async sendAdminSummary(summary: string): Promise<void> {
    try {
      if (!process.env.ADMIN_EMAIL) {
        throw new AppError('ADMIN_EMAIL environment variable is not set', 500);
      }

      await this.smtp.sendMail({
        to: process.env.ADMIN_EMAIL,
        subject: 'Daily Email Processing Summary',
        text: summary
      });
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to send summary to admin: ${error.message}`, 500);
      }
      throw new AppError('Failed to send summary to admin with unknown error', 500);
    }
  }
} 