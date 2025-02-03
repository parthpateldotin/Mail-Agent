import { Request, Response } from 'express';
import { EmailRepository } from '../repositories/email.repository';
import { Logger } from '../utils/Logger';
import { EmailStatus } from '../models/email/email.entity';

export class EmailController {
  private emailRepo: EmailRepository;

  constructor() {
    this.emailRepo = new EmailRepository();
  }

  // List emails with filtering and pagination
  public listEmails = async (req: Request, res: Response): Promise<void> => {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        startDate,
        endDate,
        isArchived,
        isSpam,
        assignedToId,
        labels
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const take = Number(limit);

      const [emails, total] = await this.emailRepo.findEmails({
        status: status ? [String(status)] : undefined,
        startDate: startDate ? new Date(String(startDate)) : undefined,
        endDate: endDate ? new Date(String(endDate)) : undefined,
        isArchived: isArchived ? Boolean(isArchived) : undefined,
        isSpam: isSpam ? Boolean(isSpam) : undefined,
        assignedToId: assignedToId ? String(assignedToId) : undefined,
        labels: labels ? String(labels).split(',') : undefined,
        skip,
        take
      });

      res.json({
        data: emails,
        meta: {
          total,
          page: Number(page),
          limit: Number(limit),
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      Logger.error('Error listing emails:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Get email by ID
  public getEmailById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const email = await this.emailRepo.getEmailById(id);

      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      res.json(email);
    } catch (error) {
      Logger.error('Error getting email:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Update email status
  public updateEmailStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const email = await this.emailRepo.getEmailById(id);
      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      const updatedEmail = await this.emailRepo.updateEmail(id, { status });
      res.json(updatedEmail);
    } catch (error) {
      Logger.error('Error updating email status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Process email
  public processEmail = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { force = false } = req.body;

      const email = await this.emailRepo.getEmailById(id);
      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      if (!force && email.status !== EmailStatus.RECEIVED) {
        res.status(400).json({ error: 'Email has already been processed' });
        return;
      }

      // TODO: Implement email processing logic
      const updatedEmail = await this.emailRepo.updateEmail(id, {
        status: EmailStatus.PROCESSING,
        processingInfo: {
          ...email.processingInfo,
          attempts: (email.processingInfo.attempts || 0) + 1,
          status: 'processing',
          lastProcessed: new Date(),
          completedSteps: [...(email.processingInfo.completedSteps || [])],
          nextStep: 'analyze'
        }
      });

      res.json(updatedEmail);
    } catch (error) {
      Logger.error('Error processing email:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Get email statistics
  public getEmailStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { startDate, endDate } = req.query;

      const stats = await this.emailRepo.getEmailStats(
        startDate ? new Date(String(startDate)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate ? new Date(String(endDate)) : new Date()
      );

      res.json(stats);
    } catch (error) {
      Logger.error('Error getting email stats:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Update email labels
  public updateLabels = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { labels } = req.body;

      const email = await this.emailRepo.getEmailById(id);
      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      const updatedEmail = await this.emailRepo.updateEmail(id, { labels });
      res.json(updatedEmail);
    } catch (error) {
      Logger.error('Error updating email labels:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Toggle archive status
  public toggleArchive = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { archived } = req.body;

      const email = await this.emailRepo.getEmailById(id);
      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      const updatedEmail = await this.emailRepo.updateEmail(id, { isArchived: archived });
      res.json(updatedEmail);
    } catch (error) {
      Logger.error('Error toggling archive status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };

  // Toggle spam status
  public toggleSpam = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { spam } = req.body;

      const email = await this.emailRepo.getEmailById(id);
      if (!email) {
        res.status(404).json({ error: 'Email not found' });
        return;
      }

      const updatedEmail = await this.emailRepo.updateEmail(id, { isSpam: spam });
      res.json(updatedEmail);
    } catch (error) {
      Logger.error('Error toggling spam status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
} 