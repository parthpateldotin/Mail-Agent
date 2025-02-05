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
      const { emailId } = req.body;
      const analysis = await this.llmService.analyzeEmail(emailId);
      return res.json(analysis);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Failed to analyze email');
    }
  };

  public suggestSubject = async (req: Request, res: Response) => {
    try {
      const { emailId } = req.body;
      const subject = await this.llmService.suggestSubject(emailId);
      return res.json({ subject });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Failed to suggest subject');
    }
  };

  public completeText = async (req: Request, res: Response) => {
    try {
      const { prompt, context } = req.body;
      const completedText = await this.llmService.completeText(prompt, context);
      return res.json({ completedText });
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw AppError.internal('Failed to complete text');
    }
  };
} 