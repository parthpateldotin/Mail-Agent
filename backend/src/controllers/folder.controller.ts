import { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Folder, SystemFolderType } from '../entities/Folder';
import { User } from '../entities/User';
import { AppError } from '../utils/AppError';

export class FolderController {
  private folderRepository: Repository<Folder>;
  private userRepository: Repository<User>;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    // Don't initialize in constructor
  }

  private async initializeRepository() {
    if (!this.initialized && !this.initializationPromise) {
      this.initializationPromise = (async () => {
        try {
          if (!AppDataSource.isInitialized) {
            await AppDataSource.initialize();
          }
          this.folderRepository = AppDataSource.getRepository(Folder);
          this.userRepository = AppDataSource.getRepository(User);
          this.initialized = true;
        } catch (error) {
          console.error('Failed to initialize repository:', error);
          throw error;
        }
      })();
    }
    await this.initializationPromise;
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeRepository();
    }
  }

  // Get all folders for a user
  async getFolders(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;
      const folders = await this.folderRepository.find({ where: { userId } });
      res.json(folders);
    } catch (error) {
      next(error);
    }
  }

  // Get a specific folder
  async getFolder(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { id } = req.params;
      const userId = req.user?.id;

      const folder = await this.folderRepository.findOne({
        where: { id, userId },
      });

      if (!folder) {
        throw AppError.notFound('Folder not found');
      }

      res.json(folder);
    } catch (error) {
      next(error);
    }
  }

  // Create a new custom folder
  async createFolder(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { name } = req.body;
      const userId = req.user?.id;

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw AppError.notFound('User not found');
      }

      const folder = this.folderRepository.create({
        name,
        userId,
        type: 'custom',
      });

      await this.folderRepository.save(folder);
      res.status(201).json(folder);
    } catch (error) {
      next(error);
    }
  }

  // Update a folder
  async updateFolder(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { id } = req.params;
      const { name } = req.body;
      const userId = req.user?.id;

      const folder = await this.folderRepository.findOne({
        where: { id, userId },
      });

      if (!folder) {
        throw AppError.notFound('Folder not found');
      }

      if (folder.type === 'system') {
        throw AppError.badRequest('Cannot update system folder');
      }

      folder.name = name;
      await this.folderRepository.save(folder);
      res.json(folder);
    } catch (error) {
      next(error);
    }
  }

  // Delete a folder
  async deleteFolder(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const { id } = req.params;
      const userId = req.user?.id;

      const folder = await this.folderRepository.findOne({
        where: { id, userId },
      });

      if (!folder) {
        throw AppError.notFound('Folder not found');
      }

      if (folder.type === 'system') {
        throw AppError.badRequest('Cannot delete system folder');
      }

      await this.folderRepository.remove(folder);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  // Create system folders for a new user
  async createSystemFolders(userId: string): Promise<void> {
    try {
      await this.ensureInitialized();

      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user) {
        throw AppError.notFound('User not found');
      }

      const systemFolders = [
        { name: 'Inbox', type: 'system' as const, systemType: SystemFolderType.INBOX },
        { name: 'Sent', type: 'system' as const, systemType: SystemFolderType.SENT },
        { name: 'Drafts', type: 'system' as const, systemType: SystemFolderType.DRAFTS },
        { name: 'Trash', type: 'system' as const, systemType: SystemFolderType.TRASH },
        { name: 'Spam', type: 'system' as const, systemType: SystemFolderType.SPAM },
      ];

      for (const folderData of systemFolders) {
        const folder = this.folderRepository.create({
          ...folderData,
          userId,
        });
        await this.folderRepository.save(folder);
      }
    } catch (error) {
      throw error;
    }
  }

  // Move emails to a folder
  async moveToFolder(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { emailIds } = req.body;
      const targetFolder = await this.folderRepository.findOne({
        where: {
          id,
          userId: req.user!.id
        }
      });

      if (!targetFolder) {
        throw AppError.notFound('Target folder not found');
      }

      // Update email-folder relationships
      await this.folderRepository
        .createQueryBuilder()
        .relation(Folder, 'emails')
        .of(targetFolder)
        .add(emailIds);

      res.json({ status: 'success', message: 'Emails moved successfully' });
    } catch (error) {
      next(error);
    }
  }

  // Get folder statistics
  async getFolderStats(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;

      const stats = await this.folderRepository
        .createQueryBuilder('folder')
        .leftJoin('folder.emails', 'email')
        .select([
          'folder.id as folderId',
          'folder.name as folderName',
          'COUNT(email.id) as emailCount'
        ])
        .where('folder.userId = :userId', { userId })
        .groupBy('folder.id, folder.name')
        .getRawMany();

      res.json(stats);
    } catch (error) {
      next(error);
    }
  }
} 