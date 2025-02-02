import { aiService } from '../ai/aiService';
import axios from 'axios';
import { config } from '../../config';

export interface ProcessedEmail {
  id: string;
  from: string;
  subject: string;
  content: string;
  timestamp: string;
  summary?: string;
  sentiment?: string;
  priority?: string;
  autoResponseSent?: boolean;
}

class EmailProcessingService {
  private apiUrl = config.apiUrl;
  private retryCount = 0;

  private async retryOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (this.retryCount < config.maxRetries) {
        this.retryCount++;
        await new Promise(resolve => setTimeout(resolve, config.retryDelay));
        return this.retryOperation(operation);
      }
      throw error;
    } finally {
      this.retryCount = 0;
    }
  }

  async processNewEmails(): Promise<ProcessedEmail[]> {
    return this.retryOperation(async () => {
      try {
        const response = await axios.get(`${this.apiUrl}/api/emails/process`);
        return response.data;
      } catch (error) {
        console.error('Failed to process new emails:', error);
        throw error;
      }
    });
  }

  async generateAutoResponse(email: ProcessedEmail): Promise<string> {
    return this.retryOperation(async () => {
      try {
        // Get AI-generated response
        const response = await aiService.generateResponse(
          email.content,
          'Generate a professional response',
          'auto-response'
        );

        // Send the auto-response
        await axios.post(`${this.apiUrl}/api/emails/respond`, {
          emailId: email.id,
          response: response.body,
        });

        return response.body;
      } catch (error) {
        console.error('Failed to generate auto-response:', error);
        throw error;
      }
    });
  }

  async sendSummaryToAdmin(emails: ProcessedEmail[]): Promise<void> {
    return this.retryOperation(async () => {
      try {
        const summaries = await Promise.all(
          emails.map(async (email) => {
            const summary = await aiService.summarizeEmail(email.content);
            return {
              ...email,
              summary: summary.key_points.join('\n'),
              sentiment: summary.sentiment,
              priority: summary.priority,
            };
          })
        );

        await axios.post(`${this.apiUrl}/api/emails/summary`, {
          summaries,
        });
      } catch (error) {
        console.error('Failed to send summary to admin:', error);
        throw error;
      }
    });
  }

  async startAutoResponseAgent(): Promise<void> {
    return this.retryOperation(async () => {
      try {
        await axios.post(`${this.apiUrl}/api/agent/start`);
      } catch (error) {
        console.error('Failed to start auto-response agent:', error);
        throw error;
      }
    });
  }

  async stopAutoResponseAgent(): Promise<void> {
    return this.retryOperation(async () => {
      try {
        await axios.post(`${this.apiUrl}/api/agent/stop`);
      } catch (error) {
        console.error('Failed to stop auto-response agent:', error);
        throw error;
      }
    });
  }

  async getAgentStatus(): Promise<boolean> {
    return this.retryOperation(async () => {
      try {
        const response = await axios.get(`${this.apiUrl}/api/agent/status`);
        return response.data.isRunning;
      } catch (error) {
        console.error('Failed to get agent status:', error);
        throw error;
      }
    });
  }
}

export const emailProcessingService = new EmailProcessingService(); 