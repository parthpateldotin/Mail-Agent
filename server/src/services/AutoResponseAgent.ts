import { EmailManager } from './EmailManager';
import { ProcessedEmail } from '../types/email';
import { SettingsManager } from './SettingsManager';

export class AutoResponseAgent {
  private isRunning: boolean = false;
  private processingInterval: NodeJS.Timeout | null = null;
  private settings: SettingsManager;

  constructor(
    private emailManager: EmailManager,
  ) {
    this.settings = new SettingsManager();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    await this.processEmails();

    // Set up interval for continuous processing
    this.processingInterval = setInterval(
      () => this.processEmails(),
      5 * 60 * 1000 // Process every 5 minutes
    );
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  getStatus(): boolean {
    return this.isRunning;
  }

  private async processEmails(): Promise<void> {
    try {
      const config = await this.settings.getEmailSettings();
      if (!config.autoResponse.enabled) {
        return;
      }

      // Check if within working hours
      if (!this.isWithinWorkingHours(config.autoResponse.workingHours)) {
        return;
      }

      const emails = await this.emailManager.processNewEmails();
      const processedEmails: ProcessedEmail[] = [];

      for (const email of emails) {
        // Skip excluded email addresses
        const excludedEmails = config.autoResponse.excludedEmails
          .split(',')
          .map(e => e.trim().toLowerCase());
        
        if (excludedEmails.includes(email.from.toLowerCase())) {
          continue;
        }

        try {
          // Generate and send auto-response
          const response = await this.emailManager.generateAutoResponse(email);
          await this.emailManager.sendResponse(email.id, response);
          
          email.autoResponseSent = true;
          processedEmails.push(email);

          // Add delay between responses if configured
          const delay = parseInt(config.autoResponse.responseDelay) * 60 * 1000;
          if (delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } catch (error) {
          console.error(`Failed to process email ${email.id}:`, error);
          email.autoResponseSent = false;
          processedEmails.push(email);
        }
      }

      // Send summary to admin if enabled
      if (config.autoResponse.summaryEnabled && processedEmails.length > 0) {
        await this.emailManager.sendSummaryToAdmin(processedEmails);
      }
    } catch (error) {
      console.error('Error in email processing:', error);
    }
  }

  private isWithinWorkingHours(workingHours: { start: string; end: string }): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    const [startHour, startMinute] = workingHours.start.split(':').map(Number);
    const [endHour, endMinute] = workingHours.end.split(':').map(Number);
    
    const currentTime = currentHour * 60 + currentMinute;
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;
    
    return currentTime >= startTime && currentTime <= endTime;
  }
} 