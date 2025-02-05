import { ProcessedEmail, EmailAnalysis, EmailResponse } from '../types/email';
import { AppError } from '../utils/AppError';

interface OpenAIResponse {
  choices: Array<{
    text: string;
  }>;
}

interface ParsedAnalysis {
  sentiment: string;
  priority: 'high' | 'normal' | 'low';
  category: string;
  summary: string;
  key_points: string[];
  suggested_time_range?: {
    start: string;
    end: string;
  };
  requires_meeting: boolean;
  meeting_context?: string;
  additional_attendees?: string[];
}

export class LLMService {
  private openai: any; // Replace with proper OpenAI client type

  constructor() {
    // Initialize OpenAI client
  }

  public async analyzeEmail(email: ProcessedEmail): Promise<EmailAnalysis> {
    try {
      const prompt = this.buildAnalysisPrompt(email);
      const response: OpenAIResponse = await this.openai.createCompletion(prompt);
      const parsed: ParsedAnalysis = JSON.parse(response.choices[0].text);

      return {
        sentiment: parsed.sentiment,
        priority: parsed.priority,
        category: parsed.category,
        summary: parsed.summary,
        key_points: parsed.key_points,
        suggestedTimeRange: parsed.suggested_time_range ? {
          start: parsed.suggested_time_range.start,
          end: parsed.suggested_time_range.end
        } : undefined,
        requiresMeeting: parsed.requires_meeting,
        meetingContext: parsed.meeting_context,
        additionalAttendees: parsed.additional_attendees
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to analyze email: ${error.message}`, 500);
      }
      throw new AppError('Failed to analyze email with unknown error', 500);
    }
  }

  public async suggestSubject(email: ProcessedEmail): Promise<string> {
    try {
      const prompt = this.buildSubjectPrompt(email);
      const response: OpenAIResponse = await this.openai.createCompletion(prompt);
      return response.choices[0].text.trim();
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to suggest subject: ${error.message}`, 500);
      }
      throw new AppError('Failed to suggest subject with unknown error', 500);
    }
  }

  public async completeText(text: string, context?: string): Promise<string> {
    try {
      const prompt = this.buildCompletionPrompt(text, context);
      const response: OpenAIResponse = await this.openai.createCompletion(prompt);
      return response.choices[0].text.trim();
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to complete text: ${error.message}`, 500);
      }
      throw new AppError('Failed to complete text with unknown error', 500);
    }
  }

  public async generateResponse(originalEmail: ProcessedEmail): Promise<EmailResponse> {
    try {
      const analysis = await this.analyzeEmail(originalEmail);
      const prompt = this.buildResponsePrompt(originalEmail, analysis);
      const response: OpenAIResponse = await this.openai.createCompletion(prompt);
      const generatedResponse = response.choices[0].text.trim();

      return {
        to: originalEmail.to,
        subject: `Re: ${originalEmail.subject}`,
        body: generatedResponse,
        analytics: {
          sentiment: analysis.sentiment,
          priority: analysis.priority,
          category: analysis.category,
          summary: analysis.summary,
          key_points: analysis.key_points
        }
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to generate response: ${error.message}`, 500);
      }
      throw new AppError('Failed to generate response with unknown error', 500);
    }
  }

  private buildAnalysisPrompt(email: ProcessedEmail): string {
    return `Analyze the following email:
Subject: ${email.subject}
Content: ${email.content}`;
  }

  private buildSubjectPrompt(email: ProcessedEmail): string {
    return `Suggest a subject for the following email content:
${email.content}`;
  }

  private buildCompletionPrompt(text: string, context?: string): string {
    return context
      ? `Context: ${context}\nComplete the following text: ${text}`
      : `Complete the following text: ${text}`;
  }

  private buildResponsePrompt(email: ProcessedEmail, analysis: EmailAnalysis): string {
    return `Generate a response to the following email:
Subject: ${email.subject}
Content: ${email.content}
Sentiment: ${analysis.sentiment}
Priority: ${analysis.priority}
Category: ${analysis.category}`;
  }
} 