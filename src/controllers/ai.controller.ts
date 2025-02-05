import { Request, Response } from 'express';
import { LLMService } from '../services/LLMService';
import { AppError } from '../utils/AppError';

export class AIController {
  private llmService: LLMService;

  constructor() {
    this.llmService = new LLMService();
  }

  public analyzeEmail = async (req: Request, res: Response) => {
    try {
      const analysis = await this.llmService.analyzeEmail(req.body.email);
      res.json(analysis);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to analyze email', 500);
    }
  };

  public suggestSubject = async (req: Request, res: Response) => {
    try {
      const subject = await this.llmService.suggestSubject(req.body.email);
      res.json({ subject });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to suggest subject', 500);
    }
  };

  public completeText = async (req: Request, res: Response) => {
    try {
      const completedText = await this.llmService.completeText(req.body.text, req.body.context);
      res.json({ completedText });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to complete text', 500);
    }
  };
} 