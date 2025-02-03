import { Repository, FindOptionsWhere, Between, LessThan, MoreThan } from 'typeorm';
import { Email } from '../models/email/email.entity';
import { EmailResponse } from '../models/email/email-response.entity';
import { EmailAttachment } from '../models/email/email-attachment.entity';
import { db } from '../database/connection';
import { Logger } from '../utils/Logger';

export class EmailRepository {
  private emailRepo: Repository<Email>;
  private responseRepo: Repository<EmailResponse>;
  private attachmentRepo: Repository<EmailAttachment>;

  constructor() {
    this.emailRepo = db.getRepository<Email>(Email);
    this.responseRepo = db.getRepository<EmailResponse>(EmailResponse);
    this.attachmentRepo = db.getRepository<EmailAttachment>(EmailAttachment);
  }

  // Email methods
  public async createEmail(email: Partial<Email>): Promise<Email> {
    try {
      const newEmail = this.emailRepo.create(email);
      return await this.emailRepo.save(newEmail);
    } catch (error) {
      Logger.error('Error creating email:', error);
      throw error;
    }
  }

  public async getEmailById(id: string): Promise<Email | null> {
    try {
      return await this.emailRepo.findOne({
        where: { id },
        relations: ['responses', 'attachments', 'assignedTo']
      });
    } catch (error) {
      Logger.error('Error getting email by ID:', error);
      throw error;
    }
  }

  public async updateEmail(id: string, data: Partial<Email>): Promise<Email> {
    try {
      await this.emailRepo.update(id, data);
      return await this.getEmailById(id);
    } catch (error) {
      Logger.error('Error updating email:', error);
      throw error;
    }
  }

  public async findEmails(options: {
    status?: string[];
    from?: string;
    to?: string;
    subject?: string;
    startDate?: Date;
    endDate?: Date;
    isArchived?: boolean;
    isSpam?: boolean;
    assignedToId?: string;
    labels?: string[];
    skip?: number;
    take?: number;
  }): Promise<[Email[], number]> {
    try {
      const where: FindOptionsWhere<Email> = {};

      if (options.status) {
        where.status = options.status;
      }
      if (options.from) {
        where.from = options.from;
      }
      if (options.subject) {
        where.subject = options.subject;
      }
      if (options.isArchived !== undefined) {
        where.isArchived = options.isArchived;
      }
      if (options.isSpam !== undefined) {
        where.isSpam = options.isSpam;
      }
      if (options.assignedToId) {
        where.assignedTo = { id: options.assignedToId };
      }
      if (options.labels) {
        where.labels = options.labels;
      }
      if (options.startDate && options.endDate) {
        where.createdAt = Between(options.startDate, options.endDate);
      } else if (options.startDate) {
        where.createdAt = MoreThan(options.startDate);
      } else if (options.endDate) {
        where.createdAt = LessThan(options.endDate);
      }

      return await this.emailRepo.findAndCount({
        where,
        relations: ['responses', 'attachments', 'assignedTo'],
        skip: options.skip,
        take: options.take,
        order: { createdAt: 'DESC' }
      });
    } catch (error) {
      Logger.error('Error finding emails:', error);
      throw error;
    }
  }

  // Response methods
  public async createResponse(response: Partial<EmailResponse>): Promise<EmailResponse> {
    try {
      const newResponse = this.responseRepo.create(response);
      return await this.responseRepo.save(newResponse);
    } catch (error) {
      Logger.error('Error creating response:', error);
      throw error;
    }
  }

  public async updateResponse(id: string, data: Partial<EmailResponse>): Promise<EmailResponse> {
    try {
      await this.responseRepo.update(id, data);
      return await this.responseRepo.findOne({ where: { id } });
    } catch (error) {
      Logger.error('Error updating response:', error);
      throw error;
    }
  }

  // Attachment methods
  public async createAttachment(attachment: Partial<EmailAttachment>): Promise<EmailAttachment> {
    try {
      const newAttachment = this.attachmentRepo.create(attachment);
      return await this.attachmentRepo.save(newAttachment);
    } catch (error) {
      Logger.error('Error creating attachment:', error);
      throw error;
    }
  }

  public async deleteAttachment(id: string): Promise<void> {
    try {
      await this.attachmentRepo.delete(id);
    } catch (error) {
      Logger.error('Error deleting attachment:', error);
      throw error;
    }
  }

  // Statistics methods
  public async getEmailStats(startDate: Date, endDate: Date): Promise<{
    total: number;
    processed: number;
    failed: number;
    responseRate: number;
    averageResponseTime: number;
  }> {
    try {
      const [total, processed, failed] = await Promise.all([
        this.emailRepo.count({
          where: {
            createdAt: Between(startDate, endDate)
          }
        }),
        this.emailRepo.count({
          where: {
            status: 'sent',
            createdAt: Between(startDate, endDate)
          }
        }),
        this.emailRepo.count({
          where: {
            status: 'failed',
            createdAt: Between(startDate, endDate)
          }
        })
      ]);

      const emails = await this.emailRepo.find({
        where: {
          createdAt: Between(startDate, endDate),
          lastResponseAt: Not(IsNull())
        },
        select: ['createdAt', 'lastResponseAt']
      });

      const responseTimes = emails.map(email => 
        email.lastResponseAt.getTime() - email.createdAt.getTime()
      );

      const averageResponseTime = responseTimes.length > 0
        ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
        : 0;

      return {
        total,
        processed,
        failed,
        responseRate: total > 0 ? processed / total : 0,
        averageResponseTime
      };
    } catch (error) {
      Logger.error('Error getting email stats:', error);
      throw error;
    }
  }
} 