import { EmailManager } from './EmailManager';
import { LLMService } from './LLMService';
import { ProcessedEmail, EmailResponse } from '../types/email';
import { AppError } from '../utils/AppError';

export class AutoResponseAgent {
  private emailManager: EmailManager;
  private llmService: LLMService;

  constructor(emailManager: EmailManager, llmService: LLMService) {
    this.emailManager = emailManager;
    this.llmService = llmService;
  }

  public async processEmail(email: ProcessedEmail): Promise<void> {
    try {
      const response = await this.llmService.generateResponse(email);
      await this.emailManager.sendResponse(email.id, response.body);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to process email: ${error.message}`, 500);
      }
      throw new AppError('Failed to process email with unknown error', 500);
    }
  }
} 