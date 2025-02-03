import { EmailTemplate, EmailContext, ValidationResult } from '../types';
import { Logger } from '../../../utils/Logger';

export interface TemplateVariable {
  name: string;
  type: 'string' | 'number' | 'date' | 'array' | 'object';
  required: boolean;
  description: string;
  defaultValue?: any;
}

export interface TemplateCategory {
  id: string;
  name: string;
  description: string;
  templates: EmailTemplate[];
}

export class TemplateManager {
  private categories: Map<string, TemplateCategory>;
  private defaultTemplates: EmailTemplate[];

  constructor() {
    this.categories = new Map();
    this.defaultTemplates = this.initializeDefaultTemplates();
    this.initializeCategories();
  }

  private initializeDefaultTemplates(): EmailTemplate[] {
    return [
      {
        id: 'general-inquiry-response',
        name: 'General Inquiry Response',
        description: 'Standard response template for general inquiries',
        content: `Dear {{senderName}},

Thank you for your email regarding {{subject}}.

{{mainResponse}}

{{if hasNextSteps}}
Next steps:
{{nextSteps}}
{{/if}}

Best regards,
{{agentName}}`,
        variables: ['senderName', 'subject', 'mainResponse', 'hasNextSteps', 'nextSteps', 'agentName'],
        metadata: {
          category: 'general',
          language: 'en',
          tone: 'professional',
          useCase: 'general-inquiry'
        }
      },
      {
        id: 'technical-support',
        name: 'Technical Support Response',
        description: 'Template for technical support inquiries',
        content: `Dear {{senderName}},

Thank you for reaching out to our technical support team regarding {{issue}}.

{{troubleshootingSteps}}

{{if requiresFollowUp}}
Please note:
{{followUpNotes}}
{{/if}}

If you have any further questions, don't hesitate to ask.

Best regards,
{{agentName}}
Technical Support Team`,
        variables: ['senderName', 'issue', 'troubleshootingSteps', 'requiresFollowUp', 'followUpNotes', 'agentName'],
        metadata: {
          category: 'support',
          language: 'en',
          tone: 'technical',
          useCase: 'technical-support'
        }
      }
    ];
  }

  private initializeCategories(): void {
    const defaultCategories: TemplateCategory[] = [
      {
        id: 'general',
        name: 'General Communication',
        description: 'Templates for general business communication',
        templates: []
      },
      {
        id: 'support',
        name: 'Technical Support',
        description: 'Templates for technical support responses',
        templates: []
      },
      {
        id: 'sales',
        name: 'Sales and Marketing',
        description: 'Templates for sales and marketing communication',
        templates: []
      }
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.id, {
        ...category,
        templates: this.defaultTemplates.filter(t => t.metadata.category === category.id)
      });
    });
  }

  public getTemplate(id: string): EmailTemplate | undefined {
    for (const category of this.categories.values()) {
      const template = category.templates.find(t => t.id === id);
      if (template) return template;
    }
    return undefined;
  }

  public getTemplatesByCategory(categoryId: string): EmailTemplate[] {
    return this.categories.get(categoryId)?.templates || [];
  }

  public findBestTemplate(context: EmailContext): EmailTemplate {
    const category = this.determineCategory(context);
    const templates = this.getTemplatesByCategory(category);
    
    if (templates.length === 0) {
      Logger.warn(`No templates found for category: ${category}, using default template`);
      return this.defaultTemplates[0];
    }

    // TODO: Implement more sophisticated template matching based on context
    return templates[0];
  }

  private determineCategory(context: EmailContext): string {
    // Determine category based on intent and metadata
    if (context.intent.includes('support') || context.metadata.categories.includes('support')) {
      return 'support';
    }
    if (context.intent.includes('sales') || context.metadata.categories.includes('sales')) {
      return 'sales';
    }
    return 'general';
  }

  public validateTemplate(template: EmailTemplate): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check required fields
    if (!template.id) errors.push('Template ID is required');
    if (!template.name) errors.push('Template name is required');
    if (!template.content) errors.push('Template content is required');

    // Check content for valid variable syntax
    const variablePattern = /\{\{([^}]+)\}\}/g;
    const matches = template.content.match(variablePattern) || [];
    const declaredVariables = new Set(template.variables);
    
    matches.forEach(match => {
      const variable = match.slice(2, -2).trim();
      if (!declaredVariables.has(variable)) {
        warnings.push(`Template uses undeclared variable: ${variable}`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  public addTemplate(template: EmailTemplate, categoryId: string): void {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const validation = this.validateTemplate(template);
    if (!validation.isValid) {
      throw new Error(`Invalid template: ${validation.errors.join(', ')}`);
    }

    category.templates.push(template);
    Logger.info(`Added template ${template.id} to category ${categoryId}`);
  }

  public removeTemplate(templateId: string, categoryId: string): void {
    const category = this.categories.get(categoryId);
    if (!category) {
      throw new Error(`Category not found: ${categoryId}`);
    }

    const index = category.templates.findIndex(t => t.id === templateId);
    if (index === -1) {
      throw new Error(`Template not found: ${templateId}`);
    }

    category.templates.splice(index, 1);
    Logger.info(`Removed template ${templateId} from category ${categoryId}`);
  }
} 