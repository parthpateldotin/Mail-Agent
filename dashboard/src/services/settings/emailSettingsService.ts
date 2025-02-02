import axios from 'axios';
import { config } from '../../config';

export interface EmailConfig {
  imap: {
    host: string;
    port: string;
    username: string;
    password: string;
    secure: boolean;
  };
  smtp: {
    host: string;
    port: string;
    username: string;
    password: string;
    secure: boolean;
  };
  autoResponse: {
    enabled: boolean;
    adminEmail: string;
    summaryEnabled: boolean;
    responseDelay: string;
    workingHours: {
      start: string;
      end: string;
    };
    excludedEmails: string;
    customSignature: string;
  };
}

class EmailSettingsService {
  private apiUrl = config.apiUrl;

  async getSettings(): Promise<EmailConfig> {
    try {
      const response = await axios.get(`${this.apiUrl}/api/settings/email`);
      return response.data;
    } catch (error) {
      console.error('Failed to fetch email settings:', error);
      // Return default settings if fetch fails
      return {
        imap: {
          host: '',
          port: '',
          username: '',
          password: '',
          secure: true,
        },
        smtp: {
          host: '',
          port: '',
          username: '',
          password: '',
          secure: true,
        },
        autoResponse: {
          enabled: false,
          adminEmail: '',
          summaryEnabled: true,
          responseDelay: config.defaultResponseDelay,
          workingHours: config.defaultWorkingHours,
          excludedEmails: '',
          customSignature: '',
        },
      };
    }
  }

  async saveSettings(config: EmailConfig): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/api/settings/email`, config);
    } catch (error) {
      console.error('Failed to save email settings:', error);
      throw error;
    }
  }

  async testConnection(config: EmailConfig): Promise<void> {
    try {
      await axios.post(`${this.apiUrl}/api/settings/email/test`, config);
    } catch (error) {
      console.error('Failed to test email connection:', error);
      throw error;
    }
  }
}

export const emailSettingsService = new EmailSettingsService(); 