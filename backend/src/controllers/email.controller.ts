import { Request, Response, NextFunction } from 'express';
import { getRepository, In, Like, Between, Repository } from 'typeorm';
import { BaseController } from './base.controller';
import { Email } from '../entities/Email';
import { Folder, SystemFolderType } from '../entities/Folder';
import { EmailService } from '../services/email.service';
import { AIService } from '../services/ai.service';
import { AppError } from '../utils/AppError';
import { ProcessedEmail, EmailSearchParams } from '../types/email';
import { AppDataSource } from '../config/database';
import { User } from '../entities/User';

export class EmailController extends BaseController<Email> {
  private emailService: EmailService;
  private aiService: AIService;
  private emailRepository: Repository<Email>;
  private folderRepository: Repository<Folder>;
  private initialized = false;

  constructor() {
    super();
    this.emailService = new EmailService();
    this.aiService = new AIService();
    this.initializeRepositories();
  }

  private async initializeRepositories() {
    try {
      this.emailRepository = AppDataSource.getRepository(Email);
      this.folderRepository = AppDataSource.getRepository(Folder);
      this.setRepository(this.emailRepository);
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

  async listEmails(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { 
        page = 1, 
        limit = 10,
        folderId,
        search,
        startDate,
        endDate,
        isRead,
        isStarred,
        hasAttachments
      } = req.query;

      const query: any = {};
      
      if (folderId) {
        query.folderId = folderId;
      }
      
      if (search) {
        query.subject = { $regex: search, $options: 'i' };
      }
      
      if (startDate && endDate) {
        query.createdAt = {
          $gte: new Date(startDate as string),
          $lte: new Date(endDate as string)
        };
      }
      
      if (isRead !== undefined) {
        query.isRead = isRead === 'true';
      }
      
      if (isStarred !== undefined) {
        query.isStarred = isStarred === 'true';
      }
      
      if (hasAttachments !== undefined) {
        query.hasAttachments = hasAttachments === 'true';
      }

      const [items, total] = await this.emailRepository.findAndCount({
        where: query,
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        order: { createdAt: 'DESC' }
      });

      res.json({
        items,
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit))
      });
    } catch (error) {
      next(error);
    }
  }

  async getEmail(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { id } = req.params;
      const email = await this.emailRepository.findOne({
        where: { id },
        relations: ['attachments', 'labels']
      });

      if (!email) {
        throw AppError.notFound('Email not found');
      }

      res.json(email);
    } catch (error) {
      next(error);
    }
  }

  async sendEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const user = req.user as User;
      const { to, subject, content, cc, bcc, attachments } = req.body;

      const email = await this.emailService.sendEmail({
        from: user.email,
        to,
        subject,
        content,
        cc,
        bcc,
        attachments,
        user,
      });

      res.json(email);
    } catch (error) {
      next(error);
    }
  }

  async saveDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const draft = await this.repository.save({
        ...req.body,
        user: req.user,
        isDraft: true,
      });

      // Add to Drafts folder
      const draftsFolder = await getRepository(Folder).findOne({
        where: {
          user: { id: req.user!.id },
          systemType: SystemFolderType.DRAFTS,
        },
      });

      if (draftsFolder) {
        draft.folders = [draftsFolder];
        await this.repository.save(draft);
      }

      res.status(201).json(draft);
    } catch (error) {
      next(error);
    }
  }

  async updateDraft(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const draft = await this.repository.findOne({
        where: {
          id,
          user: { id: req.user!.id },
          isDraft: true,
        },
      });

      if (!draft) {
        throw AppError.notFound('Draft not found');
      }

      Object.assign(draft, req.body);
      await this.repository.save(draft);
      res.json(draft);
    } catch (error) {
      next(error);
    }
  }

  async toggleStar(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user as User;

      await this.emailService.toggleStar(id, user.id);
      res.json({ message: 'Email star toggled' });
    } catch (error) {
      next(error);
    }
  }

  async toggleRead(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user as User;

      await this.emailService.markAsRead(id, user.id);
      res.json({ message: 'Email marked as read' });
    } catch (error) {
      next(error);
    }
  }

  async moveToTrash(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user as User;

      const email = await this.emailService.moveToTrash(id, user.id);
      res.json(email);
    } catch (error) {
      next(error);
    }
  }

  async moveToFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { folderId } = req.body;
      const user = req.user as User;

      await this.emailService.moveToFolder(id, folderId, user.id);
      res.json({ message: 'Email moved successfully' });
    } catch (error) {
      next(error);
    }
  }

  async batchOperation(req: Request, res: Response, next: NextFunction) {
    try {
      const { ids, operation, data } = req.body;

      const emails = await this.repository.find({
        where: {
          id: In(ids),
          user: { id: req.user!.id },
        },
      });

      if (!emails.length) {
        throw AppError.notFound('No emails found');
      }

      switch (operation) {
        case 'star':
          emails.forEach((email) => (email.isStarred = true));
          break;
        case 'unstar':
          emails.forEach((email) => (email.isStarred = false));
          break;
        case 'read':
          emails.forEach((email) => (email.isRead = true));
          break;
        case 'unread':
          emails.forEach((email) => (email.isRead = false));
          break;
        case 'trash':
          emails.forEach((email) => (email.isDeleted = true));
          break;
        case 'move':
          const folder = await getRepository(Folder).findOne({
            where: {
              id: data.folderId,
              user: { id: req.user!.id },
            },
          });
          if (!folder) {
            throw AppError.notFound('Folder not found');
          }
          emails.forEach((email) => (email.folders = [folder]));
          break;
        default:
          throw AppError.badRequest('Invalid operation');
      }

      await this.repository.save(emails);
      res.json({ success: true, count: emails.length });
    } catch (error) {
      next(error);
    }
  }

  getEmails = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = req.user as User;
      const { folder = SystemFolderType.INBOX, page = 1, limit = 20 } = req.query;
      const folderType = folder as SystemFolderType;

      const skip = (Number(page) - 1) * Number(limit);

      const [emails, total] = await this.emailRepository.findAndCount({
        where: {
          user: { id: user.id },
          folders: { systemType: folderType },
        },
        relations: ['folders'],
        order: { createdAt: 'DESC' },
        skip,
        take: Number(limit),
      });

      res.json({
        emails,
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      });
    } catch (error) {
      next(error);
    }
  };

  async createEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const emailData = req.body;
      // TODO: Implement email creation logic
      const newEmail: ProcessedEmail = {
        id: 'new-id',
        from: emailData.from,
        to: emailData.to,
        subject: emailData.subject,
        content: emailData.content,
        timestamp: new Date().toISOString(),
        cc: emailData.cc,
        bcc: emailData.bcc,
        attachments: emailData.attachments,
      };
      res.status(201).json({ status: 'success', data: newEmail });
    } catch (error) {
      next(error);
    }
  }

  async updateEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      // TODO: Implement email update logic
      const updatedEmail: ProcessedEmail = {
        id,
        from: '',
        to: [],
        subject: updateData.subject || '',
        content: updateData.content || '',
        timestamp: new Date().toISOString(),
      };
      res.json({ status: 'success', data: updatedEmail });
    } catch (error) {
      next(error);
    }
  }

  async deleteEmail(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const user = req.user as User;

      await this.emailService.deleteEmail(id, user.id);
      res.json({ message: 'Email deleted successfully' });
    } catch (error) {
      next(error);
    }
  }

  async searchEmails(req: Request, res: Response, next: NextFunction) {
    try {
      const searchParams: EmailSearchParams = req.query;
      // TODO: Implement email search logic
      const searchResults: ProcessedEmail[] = [];
      res.json({ status: 'success', data: searchResults });
    } catch (error) {
      next(error);
    }
  }
} 