import nodemailer from 'nodemailer';
import Imap, { Box, ImapMessage } from 'imap';
import { ParsedMail, simpleParser, Source, AddressObject } from 'mailparser';
import { AppDataSource } from '../config/database';
import { Email } from '../entities/Email';
import { User } from '../entities/User';
import { Folder, SystemFolderType } from '../entities/Folder';
import { AppError } from '../utils/AppError';
import { ProcessedEmail, EmailAttachment } from '../types/email';
import { Repository } from 'typeorm';
import { EmailConfig } from '../types/email';

interface EmailAddress {
  name?: string;
  address: string;
}

const parseAddresses = (addressObj: AddressObject | AddressObject[] | undefined): string[] => {
  if (!addressObj) return [];
  
  const addresses = Array.isArray(addressObj) ? addressObj : [addressObj];
  return addresses.map(addr => addr.value?.[0]?.address || '').filter(Boolean);
};

export class EmailService {
  private transporter: nodemailer.Transporter;
  private imapClient: Imap;
  private emailRepository: Repository<Email>;
  private folderRepository: Repository<Folder>;
  private initialized = false;

  constructor() {
    this.initializeRepositories();
    this.setupTransporter();
    this.setupImapClient();
  }

  private async initializeRepositories() {
    try {
      this.emailRepository = AppDataSource.getRepository(Email);
      this.folderRepository = AppDataSource.getRepository(Folder);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize repositories:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeRepositories();
    }
  }

  private setupTransporter() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  private setupImapClient() {
    this.imapClient = new Imap({
      user: process.env.IMAP_USER || '',
      password: process.env.IMAP_PASS || '',
      host: process.env.IMAP_HOST || '',
      port: parseInt(process.env.IMAP_PORT || '993'),
      tls: process.env.IMAP_SECURE === 'true',
    });
  }

  async sendEmail(data: {
    from: string;
    to: string[];
    subject: string;
    content: string;
    cc?: string[];
    bcc?: string[];
    attachments?: any[];
    user: User;
  }): Promise<Email> {
    await this.ensureInitialized();

    try {
      const mailOptions = {
        from: data.from,
        to: data.to.join(', '),
        cc: data.cc?.join(', '),
        bcc: data.bcc?.join(', '),
        subject: data.subject,
        html: data.content,
        attachments: data.attachments,
      };

      await this.transporter.sendMail(mailOptions);

      const email = this.emailRepository.create({
        from: data.from,
        to: data.to,
        subject: data.subject,
        content: data.content,
        cc: data.cc,
        bcc: data.bcc,
        user: data.user,
        userId: data.user.id,
        isDraft: false,
        isRead: true,
        isDeleted: false,
        isStarred: false,
      });

      await this.emailRepository.save(email);
      return email;
    } catch (error) {
      console.error('Error sending email:', error);
      throw AppError.internal('Failed to send email');
    }
  }

  async syncEmails(user: User): Promise<void> {
    return new Promise((resolve, reject) => {
      this.imapClient.once('ready', () => {
        this.imapClient.openBox('INBOX', false, async (err: Error | null, box: Box) => {
          if (err) {
            reject(err);
            return;
          }

          const date = new Date();
          date.setDate(date.getDate() - 30);
          
          this.imapClient.search(['ALL', ['SINCE', date]], async (err: Error | null, results: number[]) => {
            if (err) {
              reject(err);
              return;
            }

            const fetch = this.imapClient.fetch(results, {
              bodies: '',
              struct: true,
            });

            fetch.on('message', async (msg: ImapMessage) => {
              msg.on('body', async (stream: Source) => {
                try {
                  const parsed: ParsedMail = await simpleParser(stream);
                  
                  const emailData = {
                    from: parsed.from?.value[0]?.address || '',
                    to: parseAddresses(parsed.to),
                    cc: parseAddresses(parsed.cc),
                    bcc: parseAddresses(parsed.bcc),
                    subject: parsed.subject || 'No Subject',
                    content: parsed.html || parsed.textAsHtml || '',
                    attachments: parsed.attachments.map(att => ({
                      filename: att.filename || 'unnamed',
                      contentType: att.contentType,
                      size: att.size,
                      content: ''
                    })),
                    userId: user.id,
                    isRead: false,
                    isStarred: false,
                    isDraft: false,
                    isDeleted: false
                  };

                  const email = this.emailRepository.create(emailData);
                  email.user = user;

                  const inboxFolder = await this.folderRepository.findOne({
                    where: {
                      user: { id: user.id },
                      systemType: SystemFolderType.INBOX,
                    },
                  });

                  if (inboxFolder) {
                    email.folders = [inboxFolder];
                  }

                  await this.emailRepository.save(email);
                } catch (error) {
                  console.error('Error processing email:', error);
                }
              });
            });

            fetch.once('error', (err: Error) => {
              reject(err);
            });

            fetch.once('end', () => {
              this.imapClient.end();
              resolve();
            });
          });
        });
      });

      this.imapClient.once('error', (err: Error) => {
        reject(err);
      });

      this.imapClient.connect();
    });
  }

  async saveDraft(draftData: Partial<Email>): Promise<Email> {
    try {
      const draft = this.emailRepository.create({
        ...draftData,
        isDraft: true,
      });

      const draftsFolder = await this.folderRepository.findOne({
        where: {
          user: { id: draftData.user?.id },
          systemType: SystemFolderType.DRAFTS,
        },
      });

      if (draftsFolder) {
        draft.folders = [draftsFolder];
      }

      return await this.emailRepository.save(draft);
    } catch (error) {
      console.error('Error saving draft:', error);
      throw AppError.internal('Failed to save draft');
    }
  }

  async moveToTrash(emailId: string, userId: string): Promise<Email> {
    try {
      const email = await this.emailRepository.findOne({
        where: { id: emailId, user: { id: userId } },
        relations: ['folders'],
      });

      if (!email) {
        throw AppError.notFound('Email not found');
      }

      const trashFolder = await this.folderRepository.findOne({
        where: {
          user: { id: userId },
          systemType: SystemFolderType.TRASH,
        },
      });

      if (trashFolder) {
        email.folders = [trashFolder];
        await this.emailRepository.save(email);
      }

      return email;
    } catch (error) {
      console.error('Error moving email to trash:', error);
      throw AppError.internal('Failed to move email to trash');
    }
  }

  async moveToFolder(emailId: string, folderId: string, userId: string): Promise<void> {
    try {
      const email = await this.emailRepository.findOne({
        where: { id: emailId, userId },
        relations: ['folders'],
      });

      if (!email) {
        throw AppError.notFound('Email not found');
      }

      const folder = await this.folderRepository.findOne({
        where: { id: folderId, userId },
      });

      if (!folder) {
        throw AppError.notFound('Folder not found');
      }

      email.folders = [folder];
      await this.emailRepository.save(email);
    } catch (error) {
      console.error('Error moving email:', error);
      throw AppError.internal('Failed to move email');
    }
  }

  async markAsRead(emailId: string, userId: string): Promise<void> {
    try {
      const email = await this.emailRepository.findOne({
        where: { id: emailId, userId },
      });

      if (!email) {
        throw AppError.notFound('Email not found');
      }

      email.isRead = true;
      await this.emailRepository.save(email);
    } catch (error) {
      console.error('Error marking email as read:', error);
      throw AppError.internal('Failed to mark email as read');
    }
  }

  async toggleStar(emailId: string, userId: string): Promise<void> {
    try {
      const email = await this.emailRepository.findOne({
        where: { id: emailId, userId },
      });

      if (!email) {
        throw AppError.notFound('Email not found');
      }

      email.isStarred = !email.isStarred;
      await this.emailRepository.save(email);
    } catch (error) {
      console.error('Error toggling star:', error);
      throw AppError.internal('Failed to toggle star');
    }
  }

  async deleteEmail(emailId: string, userId: string): Promise<void> {
    try {
      const email = await this.emailRepository.findOne({
        where: { id: emailId, userId },
      });

      if (!email) {
        throw AppError.notFound('Email not found');
      }

      const trashFolder = await this.folderRepository.findOne({
        where: {
          userId,
          systemType: SystemFolderType.TRASH,
        },
      });

      if (!trashFolder) {
        throw AppError.notFound('Trash folder not found');
      }

      email.folders = [trashFolder];
      await this.emailRepository.save(email);
    } catch (error) {
      console.error('Error deleting email:', error);
      throw AppError.internal('Failed to delete email');
    }
  }
} 