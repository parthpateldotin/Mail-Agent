import { OpenAI } from 'openai';
import { Logger } from '../utils/logger';
import { EmailAnalysis, EmailResponse, ProcessedEmail } from '../types/email';
import { AppError } from '../utils/AppError';

interface AnalysisContext {
  previousEmails?: ProcessedEmail[];
  userPreferences?: {
    workingHours: {
      start: string;
      end: string;
    };
    timezone: string;
    meetingDuration: number;
  };
  meetingContext?: {
    existingMeetings: Array<{
      start: Date;
      end: Date;
      attendees: string[];
    }>;
    preferredTimes: string[];
  };
}

export class LLMService {
  private openai: OpenAI;
  private logger: Logger;
  private context: Map<string, AnalysisContext> = new Map();

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    this.logger = new Logger('LLMService');
  }

  async analyzeEmail(email: ProcessedEmail): Promise<EmailAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(email);
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
        max_tokens: 1000
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response content from OpenAI');
      }

      return this.parseAnalysisResponse(content);
    } catch (error) {
      this.logger.error('Failed to analyze email', error);
      throw new AppError('Failed to analyze email', 500);
    }
  }

  async suggestSubject(email: ProcessedEmail): Promise<string> {
    try {
      const prompt = `Please suggest a concise and relevant subject line for this email content: ${email.content}`;
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      throw new AppError('Failed to suggest subject', 500);
    }
  }

  async completeText(text: string, context?: string): Promise<string> {
    try {
      const prompt = this.buildCompletionPrompt(text, context);
      const response = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4',
        messages: [{ role: 'user', content: prompt }],
      });

      return response.choices[0].message.content || '';
    } catch (error) {
      throw new AppError('Failed to complete text', 500);
    }
  }

  async generateResponse(email: ProcessedEmail): Promise<EmailResponse> {
    try {
      const context = this.context.get(email.id);
      const systemPrompt = this.buildResponsePrompt(context);
      
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: this.buildResponseContext(email),
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const generatedResponse = response.choices[0]?.message?.content;
      if (!generatedResponse) {
        throw new Error('Failed to generate response');
      }

      // Parse the response into structured format
      const parsedResponse = this.parseResponse(generatedResponse, email);
      this.logger.info('Email response generated', { emailResponse: parsedResponse });

      return parsedResponse;
    } catch (error) {
      this.logger.error('Failed to generate response:', error);
      throw error;
    }
  }

  private buildSystemPrompt(context?: AnalysisContext): string {
    return `You are an AI assistant that analyzes emails with high accuracy.
    Your task is to provide a detailed analysis in JSON format including:
    - Summary of the email content
    - Key points and action items
    - Sentiment analysis
    - Priority level
    - Meeting requirements and scheduling needs
    - Required attendees and context
    
    ${context?.userPreferences ? `Consider user preferences:
    - Working hours: ${context.userPreferences.workingHours.start} - ${context.userPreferences.workingHours.end}
    - Timezone: ${context.userPreferences.timezone}
    - Preferred meeting duration: ${context.userPreferences.meetingDuration} minutes` : ''}
    
    ${context?.meetingContext ? `Consider existing meetings:
    ${JSON.stringify(context.meetingContext.existingMeetings, null, 2)}` : ''}
    
    Provide the analysis in a structured JSON format.`;
  }

  private buildAnalysisPrompt(email: ProcessedEmail): string {
    return `Please analyze this email and provide:
      - Sentiment (positive/negative/neutral)
      - Priority (high/normal/low)
      - Category
      - Summary
      - Key points
      
      Email content: ${email.content}`;
  }

  private buildResponsePrompt(context?: AnalysisContext): string {
    return `You are an AI assistant that generates professional email responses.
    Generate a response in JSON format that includes:
    - Subject line
    - Email body
    - Suggested meeting times (if applicable)
    - Required attendees
    - Follow-up actions
    
    ${context?.userPreferences ? `Consider user preferences:
    - Working hours: ${context.userPreferences.workingHours.start} - ${context.userPreferences.workingHours.end}
    - Timezone: ${context.userPreferences.timezone}` : ''}
    
    The response should be professional, clear, and actionable.`;
  }

  private buildResponseContext(email: ProcessedEmail): string {
    return JSON.stringify({
      originalEmail: {
        subject: email.subject,
        content: email.content,
        from: email.from,
      },
      analysis: email.analysis,
    });
  }

  private parseAnalysisResponse(response: string): EmailAnalysis {
    try {
      return {
        sentiment: 'neutral',
        priority: 'normal',
        category: 'general',
        summary: response,
        key_points: [],
        requiresMeeting: false
      };
    } catch (error) {
      this.logger.error('Failed to parse analysis response', error);
      throw new AppError('Failed to parse analysis response', 500);
    }
  }

  private parseResponse(
    rawResponse: string,
    originalEmail: ProcessedEmail
  ): EmailResponse {
    try {
      const parsed = JSON.parse(rawResponse);
      return {
        to: [originalEmail.from],
        subject: `Re: ${originalEmail.subject}`,
        body: parsed.content || '',
        analytics: originalEmail.analytics || {
          sentiment: 'neutral',
          priority: 'normal',
          category: 'general',
          summary: '',
          key_points: []
        }
      };
    } catch (error) {
      this.logger.error('Failed to parse response', error);
      throw new AppError('Failed to parse response', 500);
    }
  }

  setContext(emailId: string, context: AnalysisContext): void {
    this.context.set(emailId, context);
  }

  clearContext(emailId: string): void {
    this.context.delete(emailId);
  }

  private buildCompletionPrompt(text: string, context?: string): string {
    return context 
      ? `Context: ${context}\nComplete this text: ${text}`
      : `Complete this text: ${text}`;
  }
} 