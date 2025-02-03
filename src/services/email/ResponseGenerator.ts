import { EmailTemplate, EmailContext, EmailResponse, ValidationResult, IncomingEmail } from './types';
import { TemplateManager } from './templates/TemplateManager';
import { TemplateRenderer, TemplateContext } from './templates/TemplateRenderer';
import { LLMService } from '../llm/LLMService';
import { Logger } from '../../utils/Logger';

export class ResponseGenerator {
  private templateManager: TemplateManager;
  private templateRenderer: TemplateRenderer;
  private llmService: LLMService;

  constructor(llmService: LLMService) {
    this.templateManager = new TemplateManager();
    this.templateRenderer = new TemplateRenderer();
    this.llmService = llmService;
  }

  public async generate({ 
    email, 
    context 
  }: { 
    email: IncomingEmail; 
    context: EmailContext; 
  }): Promise<EmailResponse> {
    try {
      // Find the best matching template
      const template = this.templateManager.findBestTemplate(context);
      Logger.info(`Selected template: ${template.id} for email: ${email.id}`);

      // Prepare template variables
      const templateContext = await this.prepareTemplateContext(email, context);

      // Generate the response content
      const content = await this.templateRenderer.render(template, templateContext);

      // Create the response object
      const response: EmailResponse = {
        id: `response-${email.id}`,
        inReplyTo: email.from,
        subject: this.generateSubject(email.subject),
        content,
        metadata: context.metadata,
        context,
        status: 'draft'
      };

      // Validate the response
      const validation = await this.validate(response);
      if (!validation.isValid) {
        Logger.warn('Response validation failed:', validation.errors);
        throw new Error('Response validation failed');
      }

      response.status = 'ready';
      return response;
    } catch (error) {
      Logger.error('Error generating response:', error);
      throw error;
    }
  }

  private async prepareTemplateContext(email: IncomingEmail, context: EmailContext): Promise<TemplateContext> {
    // Extract sender name from email
    const senderName = email.from.split('@')[0].split('.').map(
      part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join(' ');

    // Prepare dynamic variables
    const variables: Record<string, any> = {
      senderName,
      subject: email.subject,
      mainResponse: context.suggestedResponse || this.generateDefaultResponse(context),
      hasNextSteps: context.requiredActions.length > 0,
      nextSteps: context.requiredActions.join('\n'),
      agentName: 'AI Assistant', // TODO: Make configurable
      currentDate: new Date().toLocaleDateString(),
    };

    // Add any additional context-specific variables
    if (context.intent === 'technical_support') {
      variables.issue = context.entities.issue || email.subject;
      variables.troubleshootingSteps = this.generateTroubleshootingSteps(context);
      variables.requiresFollowUp = context.requiredActions.length > 0;
      variables.followUpNotes = context.requiredActions.join('\n');
    }

    return {
      email,
      context,
      variables
    };
  }

  private generateSubject(originalSubject: string): string {
    if (!originalSubject.toLowerCase().startsWith('re:')) {
      return `Re: ${originalSubject}`;
    }
    return originalSubject;
  }

  private generateDefaultResponse(context: EmailContext): string {
    // TODO: Implement more sophisticated response generation
    return `Thank you for your email. We have received your message and will respond appropriately.`;
  }

  private generateTroubleshootingSteps(context: EmailContext): string {
    // TODO: Implement actual troubleshooting steps generation
    return context.requiredActions.map((action, index) => 
      `${index + 1}. ${action}`
    ).join('\n');
  }

  public async validate(response: EmailResponse): Promise<ValidationResult> {
    try {
      // First validate using LLM
      const isValid = await this.llmService.validateResponse(response);
      if (!isValid) {
        return {
          isValid: false,
          errors: ['Response validation failed by LLM']
        };
      }

      // Additional validation rules
      const errors: string[] = [];
      const warnings: string[] = [];

      // Check response length
      if (response.content.length < 10) {
        errors.push('Response content is too short');
      }
      if (response.content.length > 5000) {
        warnings.push('Response content is very long');
      }

      // Check for empty sections
      if (response.content.includes('{{') || response.content.includes('}}')) {
        errors.push('Response contains unresolved template variables');
      }

      // Check for basic formatting
      if (!response.content.includes('Dear') && !response.content.includes('Hello')) {
        warnings.push('Response may be missing greeting');
      }
      if (!response.content.includes('regards') && !response.content.includes('sincerely')) {
        warnings.push('Response may be missing closing');
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      Logger.error('Error validating response:', error);
      return {
        isValid: false,
        errors: [`Validation error: ${error.message}`]
      };
    }
  }
} 