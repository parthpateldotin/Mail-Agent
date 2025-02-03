import { EmailTemplate, EmailContext, IncomingEmail } from '../types';
import { Logger } from '../../../utils/Logger';

export interface TemplateContext {
  email: IncomingEmail;
  context: EmailContext;
  variables: Record<string, any>;
}

export class TemplateRenderer {
  private static readonly VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
  private static readonly CONDITIONAL_PATTERN = /\{\{if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

  constructor() {}

  public async render(template: EmailTemplate, context: TemplateContext): Promise<string> {
    try {
      let content = template.content;

      // Process conditionals first
      content = this.processConditionals(content, context);

      // Then replace variables
      content = this.replaceVariables(content, context);

      // Clean up any remaining template syntax
      content = this.cleanupTemplate(content);

      return content;
    } catch (error) {
      Logger.error('Error rendering template:', error);
      throw new Error(`Template rendering failed: ${error.message}`);
    }
  }

  private processConditionals(content: string, context: TemplateContext): string {
    return content.replace(TemplateRenderer.CONDITIONAL_PATTERN, (match, condition, body) => {
      const conditionValue = this.evaluateCondition(condition.trim(), context);
      return conditionValue ? body : '';
    });
  }

  private evaluateCondition(condition: string, context: TemplateContext): boolean {
    try {
      // First check if it's a simple variable check
      if (context.variables[condition] !== undefined) {
        return Boolean(context.variables[condition]);
      }

      // Check in email context
      if (condition.startsWith('context.')) {
        const path = condition.split('.');
        let value: any = context.context;
        for (let i = 1; i < path.length; i++) {
          value = value?.[path[i]];
        }
        return Boolean(value);
      }

      // Check in email
      if (condition.startsWith('email.')) {
        const path = condition.split('.');
        let value: any = context.email;
        for (let i = 1; i < path.length; i++) {
          value = value?.[path[i]];
        }
        return Boolean(value);
      }

      return false;
    } catch (error) {
      Logger.warn(`Error evaluating condition "${condition}":`, error);
      return false;
    }
  }

  private replaceVariables(content: string, context: TemplateContext): string {
    return content.replace(TemplateRenderer.VARIABLE_PATTERN, (match, variable) => {
      const value = this.getVariableValue(variable.trim(), context);
      return value !== undefined ? String(value) : match;
    });
  }

  private getVariableValue(variable: string, context: TemplateContext): any {
    // First check in provided variables
    if (context.variables[variable] !== undefined) {
      return context.variables[variable];
    }

    // Check in email context
    if (variable.startsWith('context.')) {
      const path = variable.split('.');
      let value: any = context.context;
      for (let i = 1; i < path.length; i++) {
        value = value?.[path[i]];
      }
      return value;
    }

    // Check in email
    if (variable.startsWith('email.')) {
      const path = variable.split('.');
      let value: any = context.email;
      for (let i = 1; i < path.length; i++) {
        value = value?.[path[i]];
      }
      return value;
    }

    // Special variables
    switch (variable) {
      case 'senderName':
        return this.extractSenderName(context.email.from);
      case 'currentDate':
        return new Date().toLocaleDateString();
      default:
        Logger.warn(`Variable "${variable}" not found in context`);
        return undefined;
    }
  }

  private extractSenderName(emailAddress: string): string {
    const parts = emailAddress.split('@')[0].split('.');
    return parts.map(part => 
      part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    ).join(' ');
  }

  private cleanupTemplate(content: string): string {
    // Remove any remaining template syntax
    return content
      .replace(TemplateRenderer.VARIABLE_PATTERN, '')
      .replace(TemplateRenderer.CONDITIONAL_PATTERN, '')
      .replace(/\n{3,}/g, '\n\n') // Replace multiple newlines with double newlines
      .trim();
  }
} 