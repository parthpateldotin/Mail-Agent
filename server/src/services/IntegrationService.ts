import { HandshakeManager } from './HandshakeManager';
import { EmailManager } from './EmailManager';
import { CalendarService } from './CalendarService';
import { LLMService } from './LLMService';
import { Logger } from '../utils/logger';
import { ProcessedEmail, EmailAnalysis, EmailResponse } from '../types/email';

interface MeetingRequest {
  subject: string;
  description: string;
  attendees: string[];
  suggestedTimeSlots: Array<{
    start: Date;
    end: Date;
  }>;
}

interface HandshakeError extends Error {
  code?: string;
  details?: any;
}

export class IntegrationService {
  private logger: Logger;

  constructor(
    private handshakeManager: HandshakeManager,
    private emailManager: EmailManager,
    private calendarService: CalendarService,
    private llmService: LLMService
  ) {
    this.logger = new Logger('IntegrationService');
    this.setupHandshakeListeners();
  }

  private setupHandshakeListeners() {
    this.handshakeManager.on('handshake:completed', (handshake) => {
      this.logger.info(`Handshake completed: ${handshake.id}`);
      this.processNextStep(handshake);
    });

    this.handshakeManager.on('handshake:failed', (handshake) => {
      this.logger.error(`Handshake failed: ${handshake.id}`, handshake.error);
      this.handleFailure(handshake);
    });
  }

  async processEmail(email: ProcessedEmail): Promise<void> {
    try {
      // H1: Email Processing Start
      const h1 = this.handshakeManager.initiateHandshake(
        'EmailProcessor',
        'HandshakeManager',
        'START_PROCESSING',
        { emailId: email.id }
      );

      // Request AI Analysis
      const h2 = this.handshakeManager.initiateHandshake(
        'EmailProcessor',
        'AIService',
        'REQUEST_ANALYSIS',
        { emailId: email.id }
      );

      const analysis = await this.llmService.analyzeEmail(email.content);
      this.handshakeManager.completeHandshake(h2, { analysis });

      // Check if meeting scheduling is needed
      if (analysis.requiresMeeting && analysis.suggestedTimeRange) {
        const h3 = this.handshakeManager.initiateHandshake(
          'EmailProcessor',
          'CalendarService',
          'CHECK_AVAILABILITY',
          { timeRange: analysis.suggestedTimeRange }
        );

        const availability = await this.calendarService.checkAvailability(
          analysis.suggestedTimeRange.start,
          analysis.suggestedTimeRange.end
        );
        this.handshakeManager.completeHandshake(h3, { availability });

        // Generate meeting proposal
        const h4 = this.handshakeManager.initiateHandshake(
          'EmailProcessor',
          'AIService',
          'GENERATE_MEETING_PROPOSAL',
          { analysis, availability }
        );

        const meetingProposal = await this.generateMeetingProposal(email, analysis, availability);
        this.handshakeManager.completeHandshake(h4, { meetingProposal });
      }

      // Generate response
      const h5 = this.handshakeManager.initiateHandshake(
        'EmailProcessor',
        'AIService',
        'GENERATE_RESPONSE',
        { analysis }
      );

      const response = await this.llmService.generateResponse(email);
      this.handshakeManager.completeHandshake(h5, { response });

      // Send response
      const h6 = this.handshakeManager.initiateHandshake(
        'EmailProcessor',
        'EmailManager',
        'SEND_RESPONSE',
        { response }
      );

      await this.emailManager.sendResponse(email.id, response.body);
      this.handshakeManager.completeHandshake(h6);

      // Complete initial handshake
      this.handshakeManager.completeHandshake(h1, {
        status: 'completed',
        completedAt: new Date(),
      });
    } catch (error) {
      const handshakeError = error as HandshakeError;
      this.logger.error('Failed to process email:', handshakeError);
      throw handshakeError;
    }
  }

  private async generateMeetingProposal(
    email: ProcessedEmail,
    analysis: EmailAnalysis,
    availability: Array<{ start: Date; end: Date }>
  ): Promise<MeetingRequest> {
    const meetingRequest: MeetingRequest = {
      subject: `Meeting: ${email.subject}`,
      description: analysis.meetingContext || email.content,
      attendees: [email.from, ...(analysis.additionalAttendees || [])],
      suggestedTimeSlots: availability.slice(0, 3), // Suggest top 3 time slots
    };

    return meetingRequest;
  }

  private async processNextStep(handshake: any) {
    try {
      switch (handshake.type) {
        case 'REQUEST_ANALYSIS':
          // AI analysis completed, check for next steps
          if (handshake.data.analysis.requiresMeeting) {
            await this.initiateCalendarCheck(handshake.data);
          }
          break;

        case 'CHECK_AVAILABILITY':
          // Calendar availability received, generate meeting proposal
          await this.generateMeetingResponse(handshake.data);
          break;

        case 'GENERATE_RESPONSE':
          // Response generated, send email
          await this.sendResponse(handshake.data);
          break;
      }
    } catch (error) {
      const handshakeError = error as HandshakeError;
      this.logger.error('Failed to process next step:', handshakeError);
      this.handshakeManager.failHandshake(handshake.id, handshakeError.message || 'Unknown error');
    }
  }

  private async initiateCalendarCheck(data: any) {
    const h3 = this.handshakeManager.initiateHandshake(
      'EmailProcessor',
      'CalendarService',
      'CHECK_AVAILABILITY',
      { timeRange: data.analysis.suggestedTimeRange }
    );

    try {
      const availability = await this.calendarService.checkAvailability(
        data.analysis.suggestedTimeRange.start,
        data.analysis.suggestedTimeRange.end
      );
      this.handshakeManager.completeHandshake(h3, { availability });
    } catch (error) {
      const handshakeError = error as HandshakeError;
      this.handshakeManager.failHandshake(h3, handshakeError.message || 'Calendar check failed');
    }
  }

  private async generateMeetingResponse(data: any) {
    const h4 = this.handshakeManager.initiateHandshake(
      'EmailProcessor',
      'AIService',
      'GENERATE_MEETING_PROPOSAL',
      data
    );

    try {
      const meetingProposal = await this.generateMeetingProposal(
        data.email,
        data.analysis,
        data.availability
      );
      this.handshakeManager.completeHandshake(h4, { meetingProposal });
    } catch (error) {
      const handshakeError = error as HandshakeError;
      this.handshakeManager.failHandshake(h4, handshakeError.message || 'Failed to generate meeting proposal');
    }
  }

  private async sendResponse(data: any) {
    const h6 = this.handshakeManager.initiateHandshake(
      'EmailProcessor',
      'EmailManager',
      'SEND_RESPONSE',
      { response: data.response }
    );

    try {
      await this.emailManager.sendResponse(data.emailId, data.response.body);
      this.handshakeManager.completeHandshake(h6);
    } catch (error) {
      const handshakeError = error as HandshakeError;
      this.handshakeManager.failHandshake(h6, handshakeError.message || 'Failed to send response');
    }
  }

  private handleFailure(handshake: any) {
    this.logger.error(`Handshake ${handshake.id} failed:`, handshake.error);
    // Implement retry logic here
    if (handshake.retryCount < 3) {
      this.logger.info(`Retrying handshake ${handshake.id}`);
      // Implement retry mechanism
      this.retryHandshake(handshake);
    } else {
      this.logger.error(`Max retries reached for handshake ${handshake.id}`);
      // Implement fallback mechanism
      this.handleMaxRetriesReached(handshake);
    }
  }

  private async retryHandshake(handshake: any) {
    // Implement retry logic
    try {
      await new Promise(resolve => setTimeout(resolve, 1000 * (handshake.retryCount || 1)));
      // Re-initiate the failed handshake
      const newHandshake = this.handshakeManager.initiateHandshake(
        handshake.source,
        handshake.target,
        handshake.type,
        handshake.data
      );
      this.logger.info(`Initiated retry handshake ${newHandshake}`);
    } catch (error) {
      const handshakeError = error as HandshakeError;
      this.logger.error(`Retry failed for handshake ${handshake.id}:`, handshakeError);
    }
  }

  private handleMaxRetriesReached(handshake: any) {
    // Implement fallback mechanism
    this.logger.error(`Implementing fallback for failed handshake ${handshake.id}`);
    // Add fallback logic here
  }
} 