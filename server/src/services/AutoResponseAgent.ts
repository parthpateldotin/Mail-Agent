import { EmailManager } from './EmailManager';
import { SettingsManager } from './SettingsManager';
import { ProcessedEmail } from '../types/email';
import { LLMService } from './LLMService';
import { Logger } from '../utils/logger';

// Add missing properties to ProcessedEmail interface
interface ExtendedProcessedEmail extends ProcessedEmail {
  processed?: boolean;
  autoResponseSent?: boolean;
}

interface ProcessingMetrics {
  totalEmails: number;
  successfulResponses: number;
  failedResponses: number;
  averageProcessingTime: number;
  errorRate: number;
}

interface WorkingHours {
  start: string;
  end: string;
}

export class AutoResponseAgent {
  private isRunning: boolean = false;
  private processingInterval: any = null;
  private metrics: ProcessingMetrics = {
    totalEmails: 0,
    successfulResponses: 0,
    failedResponses: 0,
    averageProcessingTime: 0,
    errorRate: 0,
  };
  private retryQueue: Map<string, { email: ExtendedProcessedEmail; retries: number }> = new Map();
  private readonly MAX_RETRIES = 3;
  private readonly BATCH_SIZE = 5;
  private readonly PROCESSING_TIMEOUT = 30000; // 30 seconds
  private readonly logger: Logger;

  constructor(
    private emailManager: EmailManager,
    private settings: SettingsManager,
    private llmService: LLMService
  ) {
    this.logger = new Logger('AutoResponseAgent');
  }

  get status(): boolean {
    return this.isRunning;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.processingInterval = global.setInterval(
      () => this.processEmails().catch(this.handleProcessingError),
      60000
    );

    // Start processing immediately
    await this.processEmails().catch(this.handleProcessingError);
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.processingInterval) {
      global.clearInterval(this.processingInterval);
      this.processingInterval = null;
    }
  }

  private async processEmails(): Promise<void> {
    const startTime = Date.now();

    try {
      const config = await this.settings.getEmailSettings();
      if (!config.autoResponse.enabled) {
        return;
      }

      if (!this.isWithinWorkingHours(config.autoResponse.workingHours)) {
        return;
      }

      const emails = await this.emailManager.processNewEmails();
      const processedEmails: ExtendedProcessedEmail[] = [];
      const batches = this.createBatches(emails, this.BATCH_SIZE);

      for (const batch of batches) {
        const batchPromises = batch.map(email => this.processEmailWithTimeout(email, config));
        const results = await Promise.allSettled(batchPromises);

        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            processedEmails.push(result.value);
            this.metrics.successfulResponses++;
          } else {
            this.handleEmailError(batch[index], result.reason as Error);
            this.metrics.failedResponses++;
          }
          this.metrics.totalEmails++;
        });
      }

      // Process retry queue
      await this.processRetryQueue();

      // Update metrics
      const endTime = Date.now();
      this.updateMetrics(endTime - startTime);

      // Send summary if enabled and there are processed emails
      if (config.autoResponse.summaryEnabled && processedEmails.length > 0) {
        await this.emailManager.sendSummaryToAdmin(processedEmails);
      }
    } catch (error) {
      this.handleProcessingError(error as Error);
      throw error;
    }
  }

  private async processEmailWithTimeout(
    email: ExtendedProcessedEmail,
    config: any
  ): Promise<ExtendedProcessedEmail> {
    return new Promise((resolve, reject) => {
      const timeoutId = global.setTimeout(() => {
        reject(new Error(`Processing timeout for email ${email.id}`));
      }, this.PROCESSING_TIMEOUT);

      this.processEmail(email, config)
        .then(result => {
          global.clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          global.clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private async processEmail(
    email: ExtendedProcessedEmail,
    config: any
  ): Promise<ExtendedProcessedEmail> {
    // Skip excluded email addresses
    const excludedEmails = config.autoResponse.excludedEmails
      .split(',')
      .map((e: string) => e.trim().toLowerCase());

    if (excludedEmails.includes(email.from.toLowerCase())) {
      return { ...email, processed: false };
    }

    try {
      // Generate and send auto-response
      const response = await this.llmService.generateResponse(email);
      await this.emailManager.sendResponse(email.id, response);

      return { ...email, processed: true, autoResponseSent: true };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to process email ${email.id}: ${error.message}`);
      }
      throw new Error(`Failed to process email ${email.id}: Unknown error`);
    }
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    return items.reduce((batches: T[][], item: T, index: number) => {
      const batchIndex = Math.floor(index / batchSize);
      if (!batches[batchIndex]) {
        batches[batchIndex] = [];
      }
      batches[batchIndex].push(item);
      return batches;
    }, []);
  }

  private async processRetryQueue(): Promise<void> {
    for (const [emailId, { email, retries }] of this.retryQueue.entries()) {
      if (retries >= this.MAX_RETRIES) {
        this.retryQueue.delete(emailId);
        continue;
      }

      try {
        const config = await this.settings.getEmailSettings();
        await this.processEmail(email, config);
        this.retryQueue.delete(emailId);
        this.metrics.successfulResponses++;
      } catch (error) {
        this.retryQueue.set(emailId, { email, retries: retries + 1 });
      }
    }
  }

  private handleEmailError(email: ExtendedProcessedEmail, error: Error): void {
    this.logger.error(`Error processing email ${email.id}:`, error);
    if (!this.retryQueue.has(email.id)) {
      this.retryQueue.set(email.id, { email, retries: 0 });
    }
  }

  private handleProcessingError(error: Error): void {
    this.logger.error('Error in email processing:', error);
    // Implement error reporting/monitoring here
  }

  private updateMetrics(processingTime: number): void {
    this.metrics.averageProcessingTime =
      (this.metrics.averageProcessingTime * (this.metrics.totalEmails - 1) +
        processingTime) /
      this.metrics.totalEmails;
    this.metrics.errorRate =
      this.metrics.failedResponses / this.metrics.totalEmails;
  }

  private isWithinWorkingHours(workingHours: WorkingHours): boolean {
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

  public getMetrics(): ProcessingMetrics {
    return { ...this.metrics };
  }
} 