import { Configuration, OpenAIApi } from 'openai';
import { ProcessedEmail } from '../types/email';

export class LLMService {
  private openai: OpenAIApi;

  constructor() {
    const configuration = new Configuration({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.openai = new OpenAIApi(configuration);
  }

  async analyzeEmail(email: ProcessedEmail) {
    try {
      const prompt = `
Analyze the following email and provide:
1. A brief summary
2. Key points
3. Sentiment (positive, neutral, or negative)
4. Priority (high, medium, or low)
5. Suggested actions

Email:
From: ${email.from}
Subject: ${email.subject}
Content: ${email.content}
`;

      const response = await this.openai.createChatCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specialized in analyzing emails and providing concise, actionable insights."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
      });

      const analysis = response.data.choices[0]?.message?.content || '';
      return this.parseAnalysis(analysis);
    } catch (error) {
      console.error('Failed to analyze email:', error);
      throw error;
    }
  }

  async generateResponse(email: ProcessedEmail, template?: string) {
    try {
      const prompt = `
Generate a professional email response to the following email:
From: ${email.from}
Subject: ${email.subject}
Content: ${email.content}

${template ? `Use this template style: ${template}` : ''}

Requirements:
1. Maintain a professional and courteous tone
2. Address all key points from the original email
3. Be clear and concise
4. Include a proper greeting and signature
5. If any action items are mentioned, acknowledge them
`;

      const response = await this.openai.createChatCompletion({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an AI assistant specialized in writing professional email responses."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.5,
      });

      return response.data.choices[0]?.message?.content || '';
    } catch (error) {
      console.error('Failed to generate response:', error);
      throw error;
    }
  }

  private parseAnalysis(analysis: string) {
    // Extract information from the analysis text
    const lines = analysis.split('\n');
    let summary = '';
    let keyPoints: string[] = [];
    let sentiment = 'neutral';
    let priority = 'medium';
    let actions: string[] = [];

    let currentSection = '';

    for (const line of lines) {
      if (line.toLowerCase().includes('summary:')) {
        currentSection = 'summary';
        continue;
      } else if (line.toLowerCase().includes('key points:')) {
        currentSection = 'keyPoints';
        continue;
      } else if (line.toLowerCase().includes('sentiment:')) {
        currentSection = 'sentiment';
        sentiment = line.split(':')[1]?.trim().toLowerCase() || 'neutral';
        continue;
      } else if (line.toLowerCase().includes('priority:')) {
        currentSection = 'priority';
        priority = line.split(':')[1]?.trim().toLowerCase() || 'medium';
        continue;
      } else if (line.toLowerCase().includes('suggested actions:')) {
        currentSection = 'actions';
        continue;
      }

      if (line.trim()) {
        switch (currentSection) {
          case 'summary':
            summary += line.trim() + ' ';
            break;
          case 'keyPoints':
            if (line.trim().startsWith('-')) {
              keyPoints.push(line.trim().substring(1).trim());
            }
            break;
          case 'actions':
            if (line.trim().startsWith('-')) {
              actions.push(line.trim().substring(1).trim());
            }
            break;
        }
      }
    }

    return {
      summary: summary.trim(),
      key_points: keyPoints,
      sentiment,
      priority,
      action_items: actions,
    };
  }
} 