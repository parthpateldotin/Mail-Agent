import axiosInstance from '../api/axios';

export interface EmailSummary {
  key_points: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  priority: 'high' | 'medium' | 'low';
  action_items: string[];
  category: string;
  suggested_actions: string[];
  deadline?: string;
  stakeholders: string[];
  next_steps: string[];
}

export interface EmailResponse {
  subject: string;
  body: string;
  tone: string;
  attachments?: string[];
  cc?: string[];
  scheduling_suggestion?: string;
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  tone: string;
  category: string;
}

// Predefined prompt templates for common scenarios
const promptTemplates: PromptTemplate[] = [
  {
    id: 'agree-timeline',
    name: 'Agree with Timeline',
    description: 'Agree to proposed timeline changes with professional tone',
    template: 'Write a professional response agreeing to the timeline changes. Express understanding of the reasons and confirm our commitment to the project.',
    tone: 'professional',
    category: 'project-management'
  },
  {
    id: 'request-details',
    name: 'Request More Details',
    description: 'Ask for additional information politely',
    template: 'Write a polite response asking for more specific details about {topic}. Mention the current information we have and what additional details would be helpful.',
    tone: 'inquiring',
    category: 'information-gathering'
  },
  {
    id: 'schedule-meeting',
    name: 'Schedule Meeting',
    description: 'Propose a meeting to discuss the topic',
    template: 'Write a response suggesting a meeting to discuss this matter. Include possible time slots and agenda points.',
    tone: 'professional',
    category: 'scheduling'
  },
  {
    id: 'budget-approval',
    name: 'Budget Approval',
    description: 'Approve budget changes with conditions',
    template: 'Write a response approving the budget changes. Include any conditions, reporting requirements, or oversight measures.',
    tone: 'formal',
    category: 'finance'
  },
  {
    id: 'status-update',
    name: 'Provide Status Update',
    description: 'Share progress update on tasks',
    template: 'Write a comprehensive status update on our progress. Include completed items, ongoing work, and any blockers.',
    tone: 'informative',
    category: 'reporting'
  }
];

export const aiService = {
  // Get available prompt templates
  getPromptTemplates: () => promptTemplates,

  // Get template by ID
  getTemplateById: (id: string) => promptTemplates.find(t => t.id === id),

  // Summarize an email thread with enhanced analysis
  summarizeEmail: async (emailContent: string): Promise<EmailSummary> => {
    try {
      // Mock enhanced summary. In production, this would call your AI endpoint
      return {
        key_points: [
          "Project timeline extended by 2 weeks",
          "Budget increased by 15%",
          "New requirements added for mobile support"
        ],
        sentiment: "neutral",
        priority: "high",
        action_items: [
          "Review updated timeline",
          "Approve budget changes",
          "Schedule mobile development planning"
        ],
        category: "Project Management",
        suggested_actions: [
          "Schedule team meeting to discuss timeline",
          "Prepare budget approval document",
          "Create mobile development resource plan"
        ],
        stakeholders: [
          "Development Team",
          "Project Manager",
          "Finance Department"
        ],
        next_steps: [
          "Confirm timeline with stakeholders",
          "Submit budget approval request",
          "Begin mobile development planning"
        ],
        deadline: "End of next month"
      };
    } catch (error) {
      throw new Error('Failed to summarize email');
    }
  },

  // Generate email response with enhanced context
  generateResponse: async (
    emailContent: string,
    userPrompt: string,
    templateId?: string
  ): Promise<EmailResponse> => {
    try {
      // In production, this would use the template and context to generate a more relevant response
      const template = templateId ? promptTemplates.find(t => t.id === templateId) : null;
      
      return {
        subject: "Re: Project Update",
        body: `Thank you for your email regarding the project updates.

I've reviewed the proposed changes in detail:

1. Timeline Extension:
   ✓ Agree with the 2-week extension
   ✓ Understand the impact on delivery date
   ✓ Will update our internal schedules accordingly

2. Budget Adjustment:
   ✓ Approve the 15% increase
   ✓ Acknowledge mobile development costs
   ✓ Will initiate budget revision process

3. Mobile Support:
   ✓ Support the addition of iOS/Android requirements
   ✓ Will assign dedicated mobile development team
   ✓ Testing resources will be allocated

Next Steps:
1. I'll schedule a team meeting for next week to discuss implementation details
2. Our finance team will process the budget adjustment
3. Mobile development team will prepare initial sprint planning

Please let me know if you need any clarification or have additional considerations.

Best regards,
[Your Name]`,
        tone: template?.tone || "professional",
        scheduling_suggestion: "Next Tuesday at 10 AM for team sync-up",
        cc: ["mobile.team@company.com", "finance@company.com"]
      };
    } catch (error) {
      throw new Error('Failed to generate response');
    }
  },

  // Process natural language prompt with enhanced context
  processPrompt: async (prompt: string, context: any): Promise<string> => {
    try {
      // Mock response. In production, this would analyze the context and generate a more relevant response
      return "Based on the project context and your prompt, here's a suggested approach...";
    } catch (error) {
      throw new Error('Failed to process prompt');
    }
  },

  // Suggest response templates based on email content
  suggestTemplates: async (emailContent: string): Promise<PromptTemplate[]> => {
    try {
      // In production, this would analyze the email content and suggest relevant templates
      return promptTemplates.filter(template => 
        template.category === 'project-management' || 
        template.category === 'scheduling'
      );
    } catch (error) {
      throw new Error('Failed to suggest templates');
    }
  }
}; 