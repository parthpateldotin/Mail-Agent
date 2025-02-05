import { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Settings } from '../entities/Settings';
import { AppError } from '../utils/AppError';
import { AIService } from '../services/ai.service';

export class AIController {
    private settingsRepository: Repository<Settings>;
    private aiService: AIService;
    private initialized = false;

    constructor() {
        this.aiService = new AIService();
        this.initializeRepository();
    }

    private async initializeRepository() {
        try {
            this.settingsRepository = AppDataSource.getRepository(Settings);
            this.initialized = true;
        } catch (error) {
            console.error('Failed to initialize repository:', error);
            throw error;
        }
    }

    private async ensureInitialized() {
        if (!this.initialized) {
            await this.initializeRepository();
        }
    }

    private async getUserSettings(req: Request) {
        await this.ensureInitialized();
        const userId = req.user?.id;
        if (!userId) {
            throw AppError.unauthorized('User not authenticated');
        }

        const settings = await this.settingsRepository.findOne({
            where: { userId }
        });

        if (!settings) {
            throw AppError.notFound('User settings not found');
        }

        return settings;
    }

    async generateSmartReply(req: Request, res: Response, next: NextFunction) {
        try {
            const { content } = req.body;
            if (!content) {
                throw AppError.badRequest('Email content is required');
            }

            const userId = req.user?.id;
            if (!userId) {
                throw AppError.unauthorized('User not authenticated');
            }

            const reply = await this.aiService.generateSmartReply(content, userId);
            res.json({ reply });
        } catch (error) {
            next(error);
        }
    }

    async summarizeEmail(req: Request, res: Response, next: NextFunction) {
        try {
            const { content } = req.body;
            if (!content) {
                throw AppError.badRequest('Email content is required');
            }

            const userId = req.user?.id;
            if (!userId) {
                throw AppError.unauthorized('User not authenticated');
            }

            const summary = await this.aiService.generateEmailSummary(content, userId);
            res.json({ summary });
        } catch (error) {
            next(error);
        }
    }
} 