import OpenAI from 'openai';
import { IncomingEmail, EmailContext, EmailResponse, EmailMetadata } from '../email/types';
import { LLMConfig } from '../../config/llm.config';
import { Logger } from '../../utils/Logger';

export class LLMService {
  private openai: OpenAI;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    this.config = config;
    this.openai = new OpenAI({
      apiKey: this.config.apiKey
    });
  }

  public async analyzeContext(email: IncomingEmail): Promise<EmailContext> {
    try {
      const prompt = this.createAnalysisPrompt(email);
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
        messages: [
          { role: 'system', content: this.config.systemPrompts.contextAnalysis },
          { role: 'user', content: prompt }
        ]
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No response from LLM');
      }

      return this.parseAnalysisResponse(result);
    } catch (error) {
      Logger.error('Error analyzing email context:', error);
      throw error;
    }
  }

  public async validateResponse(response: EmailResponse): Promise<boolean> {
    try {
      const prompt = this.createValidationPrompt(response);
      const completion = await this.openai.chat.completions.create({
        model: this.config.model,
        temperature: 0.3, // Lower temperature for more consistent validation
        max_tokens: 500,
        messages: [
          { role: 'system', content: this.config.systemPrompts.responseValidation },
          { role: 'user', content: prompt }
        ]
      });

      const result = completion.choices[0]?.message?.content;
      if (!result) {
        throw new Error('No validation response from LLM');
      }

      return this.parseValidationResponse(result);
    } catch (error) {
      Logger.error('Error validating response:', error);
      throw error;
    }
  }

  private createAnalysisPrompt(email: IncomingEmail): string {
    return `
Please analyze this email and provide a structured response:

From: ${email.from}
Subject: ${email.subject}
Content:
${email.content}

Analyze the following aspects:
1. Primary intent of the email
2. Key entities mentioned
3. Required actions
4. Priority level
5. Sentiment
6. Whether it requires a response
7. Language used
8. Whether it's an auto-reply

Provide your analysis in JSON format.`;
  }

  private createValidationPrompt(response: EmailResponse): string {
    return `
Please validate this email response:

Original Context: ${JSON.stringify(response.context)}
Response Subject: ${response.subject}
Response Content:
${response.content}

Validate the following aspects:
1. All key points addressed
2. Professional tone
3. Appropriate language
4. Correct context
5. No missing information
6. Grammar and spelling

Respond with either VALID or INVALID, followed by any issues found.`;
  }

  private parseAnalysisResponse(result: string): EmailContext {
    try {
      // Attempt to parse JSON response
      const parsed = JSON.parse(result);
      
      // Extract and validate required fields
      const metadata: EmailMetadata = {
        categories: parsed.categories || ['general'],
        priority: parsed.priority || 'medium',
        language: parsed.language || 'en',
        sentiment: parsed.sentiment || 'neutral',
        isAutoReply: parsed.isAutoReply || false,
        requiresResponse: parsed.requiresResponse || true
      };

      return {
        intent: parsed.intent || 'general_inquiry',
        entities: parsed.entities || {},
        requiredActions: parsed.requiredActions || [],
        suggestedResponse: parsed.suggestedResponse,
        confidence: parsed.confidence || 0.8,
        metadata
      };
    } catch (error) {
      Logger.error('Error parsing LLM analysis response:', error);
      // Provide a default context if parsing fails
      return {
        intent: 'general_inquiry',
        entities: {},
        requiredActions: [],
        confidence: 0.5,
        metadata: {
          categories: ['general'],
          priority: 'medium',
          language: 'en',
          sentiment: 'neutral',
          isAutoReply: false,
          requiresResponse: true
        }
      };
    }
  }

  private parseValidationResponse(result: string): boolean {
    return result.trim().toUpperCase().startsWith('VALID');
  }
} 