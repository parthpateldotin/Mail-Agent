import { Request, Response, NextFunction } from 'express';
import { Repository, DeepPartial } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Settings } from '../entities/Settings';
import { AppError } from '../utils/AppError';

export class SettingsController {
  private settingsRepository: Repository<Settings>;
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  constructor() {
    this.initializeRepository();
  }

  private async initializeRepository() {
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = (async () => {
      try {
        this.settingsRepository = AppDataSource.getRepository(Settings);
        this.initialized = true;
      } catch (error) {
        console.error('Failed to initialize repository:', error);
        this.initializationPromise = null;
        throw error;
      }
    })();

    return this.initializationPromise;
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeRepository();
    }
  }

  async getSettings(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('User ID is required');
      }

      const settings = await this.settingsRepository.findOne({
        where: { userId }
      });

      if (!settings) {
        throw AppError.notFound('Settings not found');
      }

      res.json(settings);
    } catch (error) {
      next(error);
    }
  }

  async updateSettings(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('User ID is required');
      }

      const updateData = req.body as DeepPartial<Settings>;
      let settings = await this.settingsRepository.findOne({
        where: { userId }
      });

      if (!settings) {
        settings = this.settingsRepository.create({
          userId,
          ...updateData
        });
      } else {
        Object.assign(settings, updateData);
      }

      const savedSettings = await this.settingsRepository.save(settings);
      res.json(savedSettings);
    } catch (error) {
      next(error);
    }
  }

  async updateEmailSettings(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('User ID is required');
      }

      const emailSettings = req.body;
      this.validateEmailSettings(emailSettings);

      let settings = await this.settingsRepository.findOne({
        where: { userId }
      });

      if (!settings) {
        settings = this.settingsRepository.create({
          userId,
          emailSettings
        } as DeepPartial<Settings>);
      } else {
        settings.emailSettings = {
          ...settings.emailSettings,
          ...emailSettings
        };
      }

      const savedSettings = await this.settingsRepository.save(settings);
      res.json(savedSettings);
    } catch (error) {
      next(error);
    }
  }

  async updateAISettings(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('User ID is required');
      }

      const aiSettings = req.body;
      this.validateAISettings(aiSettings);

      let settings = await this.settingsRepository.findOne({
        where: { userId }
      });

      if (!settings) {
        settings = this.settingsRepository.create({
          userId,
          aiSettings
        } as DeepPartial<Settings>);
      } else {
        settings.aiSettings = {
          ...settings.aiSettings,
          ...aiSettings
        };
      }

      const savedSettings = await this.settingsRepository.save(settings);
      res.json(savedSettings);
    } catch (error) {
      next(error);
    }
  }

  async updateTheme(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('User ID is required');
      }

      const { theme } = req.body;
      if (!['light', 'dark', 'system'].includes(theme)) {
        throw AppError.badRequest('Invalid theme value');
      }

      let settings = await this.settingsRepository.findOne({
        where: { userId }
      });

      if (!settings) {
        settings = this.settingsRepository.create({
          userId,
          theme
        } as DeepPartial<Settings>);
      } else {
        settings.theme = theme;
      }

      const savedSettings = await this.settingsRepository.save(settings);
      res.json(savedSettings);
    } catch (error) {
      next(error);
    }
  }

  async updateLanguage(req: Request, res: Response, next: NextFunction) {
    try {
      await this.ensureInitialized();
      const userId = req.user?.id;
      if (!userId) {
        throw AppError.unauthorized('User ID is required');
      }

      const { language } = req.body;
      let settings = await this.settingsRepository.findOne({
        where: { userId }
      });

      if (!settings) {
        settings = this.settingsRepository.create({
          userId,
          language
        } as DeepPartial<Settings>);
      } else {
        settings.language = language;
      }

      const savedSettings = await this.settingsRepository.save(settings);
      res.json(savedSettings);
    } catch (error) {
      next(error);
    }
  }

  private validateEmailSettings(settings: Partial<Settings['emailSettings']>) {
    if (!settings) {
      throw AppError.badRequest('Email settings are required');
    }

    if (settings.signature && settings.signature.length > 1000) {
      throw AppError.badRequest('Signature is too long');
    }

    if (settings.sendDelay && (settings.sendDelay < 0 || settings.sendDelay > 300)) {
      throw AppError.badRequest('Send delay must be between 0 and 300 seconds');
    }

    if (settings.filters) {
      for (const filter of settings.filters) {
        if (!filter || !filter.name || !filter.condition || !filter.action) {
          throw AppError.badRequest('Invalid filter configuration');
        }
      }
    }
  }

  private validateAISettings(settings: Partial<Settings['aiSettings']>) {
    if (!settings) {
      throw AppError.badRequest('AI settings are required');
    }

    if (settings.smartReplyStyle && !['professional', 'casual', 'friendly'].includes(settings.smartReplyStyle)) {
      throw AppError.badRequest('Invalid smart reply style');
    }

    if (settings.languageModel && !['gpt-3.5-turbo', 'gpt-4'].includes(settings.languageModel)) {
      throw AppError.badRequest('Invalid language model');
    }
  }
} 