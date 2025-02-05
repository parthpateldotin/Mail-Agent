import { EmailManager } from './EmailManager';
import { CalendarService } from './CalendarService';
import { ProcessedEmail, EmailResponse, EmailAnalysis } from '../types/email';
import { AppError } from '../utils/AppError';

export class IntegrationService {
  private emailManager: EmailManager;
  private calendarService: CalendarService;

  constructor(emailManager: EmailManager, calendarService: CalendarService) {
    this.emailManager = emailManager;
    this.calendarService = calendarService;
  }

  public async processEmailWithAnalysis(email: ProcessedEmail, analysis: EmailAnalysis): Promise<void> {
    try {
      if (analysis.requiresMeeting && analysis.suggestedTimeRange) {
        await this.calendarService.createMeeting(
          analysis.suggestedTimeRange.start,
          analysis.suggestedTimeRange.end,
          analysis.meetingContext || 'Follow-up meeting',
          analysis.additionalAttendees
        );
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to process email with analysis: ${error.message}`, 500);
      }
      throw new AppError('Failed to process email with analysis with unknown error', 500);
    }
  }

  public async sendEmailResponse(email: ProcessedEmail, response: EmailResponse): Promise<void> {
    try {
      if (!response.body) {
        throw new AppError('Response body is required', 400);
      }
      await this.emailManager.sendResponse(email.id, response.body);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to send email response: ${error.message}`, 500);
      }
      throw new AppError('Failed to send email response with unknown error', 500);
    }
  }
} 