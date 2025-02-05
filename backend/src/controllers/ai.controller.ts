import { Request, Response, NextFunction } from 'express';
import { Repository } from 'typeorm';
import { AppDataSource } from '../config/database';
import { Settings } from '../entities/Settings';
import { AppError } from '../utils/AppError';
import { AIService } from '../services/ai.service';
import { LLMService } from '../services/LLMService';

export class AIController {
    private settingsRepository: Repository<Settings>;
    private aiService: AIService;
    private llmService: LLMService;
    private initialized = false;

    constructor() {
        this.aiService = new AIService();
        this.llmService = new LLMService();
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

    public analyzeEmail = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;
            const analysis = await this.llmService.analyzeEmail(email);
            res.json({ success: true, data: analysis });
        } catch (error) {
            throw new AppError('Failed to analyze email', 500);
        }
    };

    public suggestSubject = async (req: Request, res: Response) => {
        try {
            const { email } = req.body;
            const subject = await this.llmService.suggestSubject(email);
            res.json({ success: true, data: { subject } });
        } catch (error) {
            throw new AppError('Failed to suggest subject', 500);
        }
    };

    public completeText = async (req: Request, res: Response) => {
        try {
            const { text, context } = req.body;
            const completion = await this.llmService.completeText(text, context);
            res.json({ success: true, data: { completion } });
        } catch (error) {
            throw new AppError('Failed to complete text', 500);
        }
    };
} 