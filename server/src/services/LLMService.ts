import OpenAI from 'openai';
import { Logger } from '../utils/logger';
import { EmailAnalysis, EmailResponse, ProcessedEmail } from '../types/email';

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

  constructor(apiKey: string = process.env.OPENAI_API_KEY || '') {
    this.openai = new OpenAI({ apiKey });
    this.logger = new Logger('LLMService');
  }

  async analyzeEmail(content: string, context?: AnalysisContext): Promise<EmailAnalysis> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: this.buildAnalysisPrompt(content, context),
          },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      });

      const analysis = response.choices[0]?.message?.content;
      if (!analysis) {
        throw new Error('Failed to generate analysis');
      }

      // Parse the analysis into structured format
      const parsedAnalysis = this.parseAnalysis(analysis);
      this.logger.info('Email analysis completed', { emailAnalysis: parsedAnalysis });

      return parsedAnalysis;
    } catch (error) {
      this.logger.error('Failed to analyze email:', error);
      throw error;
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

  private buildAnalysisPrompt(content: string, context?: AnalysisContext): string {
    return `Analyze the following email content:
    ${content}
    
    ${context?.previousEmails ? `Consider previous email context:
    ${context.previousEmails.map(email => `
    From: ${email.from}
    Subject: ${email.subject}
    Content: ${email.content}
    ---`).join('\n')}` : ''}
    
    Provide a detailed analysis including meeting detection and scheduling requirements.`;
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

  private parseAnalysis(rawAnalysis: string): EmailAnalysis {
    try {
      const parsed = JSON.parse(rawAnalysis);
      return {
        summary: parsed.summary,
        key_points: parsed.key_points,
        sentiment: parsed.sentiment,
        priority: parsed.priority,
        action_items: parsed.action_items,
        category: parsed.category,
        requiresMeeting: parsed.requires_meeting,
        suggestedTimeRange: parsed.suggested_time_range ? {
          start: new Date(parsed.suggested_time_range.start),
          end: new Date(parsed.suggested_time_range.end),
        } : undefined,
        meetingContext: parsed.meeting_context,
        additionalAttendees: parsed.additional_attendees,
        confidence: parsed.confidence,
        tags: parsed.tags,
      };
    } catch (error) {
      this.logger.error('Failed to parse analysis:', error);
      throw new Error('Failed to parse analysis');
    }
  }

  private parseResponse(
    rawResponse: string,
    originalEmail: ProcessedEmail
  ): EmailResponse {
    try {
      const parsed = JSON.parse(rawResponse);
      return {
        subject: parsed.subject || `Re: ${originalEmail.subject}`,
        body: parsed.body,
        to: [originalEmail.from],
        cc: parsed.cc,
        metadata: {
          priority: originalEmail.analysis?.priority || 'normal',
          category: originalEmail.analysis?.category || 'general',
          responseType: parsed.response_type || 'auto-generated',
          autoGenerated: true,
        },
      };
    } catch (error) {
      this.logger.error('Failed to parse response:', error);
      throw new Error('Failed to parse response');
    }
  }

  setContext(emailId: string, context: AnalysisContext): void {
    this.context.set(emailId, context);
  }

  clearContext(emailId: string): void {
    this.context.delete(emailId);
  }
} 