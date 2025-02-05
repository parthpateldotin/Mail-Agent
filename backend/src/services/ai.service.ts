import { OpenAI } from 'openai';
import { Settings } from '../entities/Settings';
import { AppDataSource } from '../config/database';
import { Repository } from 'typeorm';
import { EmailService } from './email.service';

export class AIService {
  private openai: OpenAI;
  private settingsRepository: Repository<Settings>;
  private emailService: EmailService;
  private initialized = false;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.emailService = new EmailService();
    this.initializeRepository();
  }

  private async initializeRepository() {
    try {
      this.settingsRepository = AppDataSource.getRepository(Settings);
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize settings repository:', error);
      throw error;
    }
  }

  private async ensureInitialized() {
    if (!this.initialized) {
      await this.initializeRepository();
    }
  }

  private async getUserSettings(userId: string): Promise<Settings> {
    await this.ensureInitialized();
    const settings = await this.settingsRepository.findOne({
      where: { userId }
    });

    if (!settings) {
      throw new Error('User settings not found');
    }

    return settings;
  }

  async generateSmartReply(emailContent: string, userId: string): Promise<string> {
    await this.ensureInitialized();
    const settings = await this.getUserSettings(userId);
    const style = settings.aiSettings?.smartReplyStyle || 'professional';

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant helping to generate email replies in a ${style} tone.`
        },
        {
          role: 'user',
          content: `Generate a reply to this email:\n\n${emailContent}`
        }
      ]
    });

    return completion.choices[0]?.message?.content || 'Unable to generate reply';
  }

  async generateEmailSummary(emailContent: string, userId: string): Promise<string> {
    await this.ensureInitialized();
    const settings = await this.getUserSettings(userId);

    if (!settings.aiSettings?.enableSummary) {
      return 'Email summarization is disabled';
    }

    const completion = await this.openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4',
      messages: [
        {
          role: 'system',
          content: 'You are an AI assistant that summarizes emails concisely.'
        },
        {
          role: 'user',
          content: `Summarize this email:\n\n${emailContent}`
        }
      ]
    });

    return completion.choices[0]?.message?.content || 'Unable to generate summary';
  }

  // Add more AI-powered features as needed...
}