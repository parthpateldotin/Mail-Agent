import fs from 'fs/promises';
import path from 'path';
import { EmailConfig } from '../types/email';

export class SettingsManager {
  private settingsPath: string;

  constructor() {
    this.settingsPath = path.join(process.cwd(), 'data', 'settings.json');
  }

  async getEmailSettings(): Promise<EmailConfig> {
    try {
      await this.ensureSettingsFile();
      const data = await fs.readFile(this.settingsPath, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.error('Failed to read settings:', error);
      return this.getDefaultSettings();
    }
  }

  async saveEmailSettings(settings: EmailConfig): Promise<void> {
    try {
      await this.ensureSettingsFile();
      await fs.writeFile(
        this.settingsPath,
        JSON.stringify(settings, null, 2),
        'utf8'
      );
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  }

  private async ensureSettingsFile(): Promise<void> {
    try {
      // Ensure data directory exists
      const dataDir = path.dirname(this.settingsPath);
      await fs.mkdir(dataDir, { recursive: true });

      // Create settings file with default values if it doesn't exist
      try {
        await fs.access(this.settingsPath);
      } catch {
        const defaultSettings = this.getDefaultSettings();
        await fs.writeFile(
          this.settingsPath,
          JSON.stringify(defaultSettings, null, 2),
          'utf8'
        );
      }
    } catch (error) {
      console.error('Failed to ensure settings file:', error);
      throw error;
    }
  }

  private getDefaultSettings(): EmailConfig {
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
        responseDelay: '5',
        workingHours: {
          start: '09:00',
          end: '17:00',
        },
        excludedEmails: '',
        customSignature: '',
      },
    };
  }
} 