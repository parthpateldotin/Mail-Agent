import { HandshakeManager } from '../services/HandshakeManager';
import { IntegrationService } from '../services/IntegrationService';
import { EmailManager } from '../services/EmailManager';
import { CalendarService } from '../services/CalendarService';
import { LLMService } from '../services/LLMService';
import { ProcessedEmail } from '../types/email';

describe('Integration Service Tests', () => {
  let handshakeManager: HandshakeManager;
  let emailManager: EmailManager;
  let calendarService: CalendarService;
  let llmService: LLMService;
  let integrationService: IntegrationService;

  beforeEach(() => {
    handshakeManager = new HandshakeManager();
    emailManager = new EmailManager();
    calendarService = new CalendarService({
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      redirectUri: 'http://localhost:3000/auth/callback',
    });
    llmService = new LLMService('test-api-key');
    integrationService = new IntegrationService(
      handshakeManager,
      emailManager,
      calendarService,
      llmService
    );
  });

  describe('Email Processing', () => {
    const mockEmail: ProcessedEmail = {
      id: 'test-email-1',
      from: 'sender@example.com',
      to: ['recipient@example.com'],
      subject: 'Test Meeting Request',
      content: 'Can we schedule a meeting to discuss the project next week?',
      timestamp: new Date().toISOString(),
      status: 'new',
    };

    it('should process email and detect meeting request', async () => {
      // Mock LLM service responses
      jest.spyOn(llmService, 'analyzeEmail').mockResolvedValue({
        summary: 'Meeting request for project discussion',
        key_points: ['Schedule meeting', 'Project discussion'],
        sentiment: 'neutral',
        priority: 'high',
        action_items: ['Schedule meeting'],
        category: 'meeting',
        requiresMeeting: true,
        suggestedTimeRange: {
          start: new Date('2024-02-10T10:00:00Z'),
          end: new Date('2024-02-10T11:00:00Z'),
        },
        confidence: 0.95,
        tags: ['meeting', 'project'],
      });

      // Mock calendar service
      jest.spyOn(calendarService, 'checkAvailability').mockResolvedValue([
        {
          start: new Date('2024-02-10T10:00:00Z'),
          end: new Date('2024-02-10T11:00:00Z'),
        },
      ]);

      // Process the email
      await integrationService.processEmail(mockEmail);

      // Verify handshakes were initiated
      expect(handshakeManager.getHandshakeHistory()).toHaveLength(6); // H1 through H6
      
      // Verify services were called
      expect(llmService.analyzeEmail).toHaveBeenCalled();
      expect(calendarService.checkAvailability).toHaveBeenCalled();
      expect(emailManager.sendResponse).toHaveBeenCalled();
    });

    it('should handle email without meeting request', async () => {
      // Mock LLM service responses
      jest.spyOn(llmService, 'analyzeEmail').mockResolvedValue({
        summary: 'Project update email',
        key_points: ['Status update'],
        sentiment: 'positive',
        priority: 'medium',
        action_items: ['Review update'],
        category: 'update',
        requiresMeeting: false,
        confidence: 0.9,
        tags: ['update', 'project'],
      });

      // Process the email
      await integrationService.processEmail(mockEmail);

      // Verify only necessary handshakes were initiated
      expect(handshakeManager.getHandshakeHistory()).toHaveLength(4); // H1, H2, H5, H6
      
      // Verify calendar service was not called
      expect(calendarService.checkAvailability).not.toHaveBeenCalled();
    });

    it('should handle errors and retry failed handshakes', async () => {
      // Mock service error
      jest.spyOn(llmService, 'analyzeEmail').mockRejectedValueOnce(new Error('API Error'));
      
      // Mock retry success
      jest.spyOn(llmService, 'analyzeEmail').mockResolvedValueOnce({
        summary: 'Retry success',
        key_points: [],
        sentiment: 'neutral',
        priority: 'medium',
        action_items: [],
        category: 'general',
        requiresMeeting: false,
        confidence: 0.8,
        tags: [],
      });

      // Process the email
      await integrationService.processEmail(mockEmail);

      // Verify retry was attempted
      const handshakes = handshakeManager.getHandshakeHistory();
      const failedHandshakes = handshakes.filter(h => h.status === 'failed');
      const retriedHandshakes = handshakes.filter(h => h.type === 'REQUEST_ANALYSIS');
      
      expect(failedHandshakes).toHaveLength(1);
      expect(retriedHandshakes).toHaveLength(2); // Original + retry
    });
  });

  describe('Context Management', () => {
    it('should maintain context across email thread', async () => {
      const threadEmails: ProcessedEmail[] = [
        {
          id: 'email-1',
          from: 'sender@example.com',
          to: ['recipient@example.com'],
          subject: 'Meeting Request',
          content: 'Can we meet next week?',
          timestamp: new Date('2024-02-01T10:00:00Z').toISOString(),
          status: 'new',
        },
        {
          id: 'email-2',
          from: 'recipient@example.com',
          to: ['sender@example.com'],
          subject: 'Re: Meeting Request',
          content: 'Sure, how about Tuesday?',
          timestamp: new Date('2024-02-01T11:00:00Z').toISOString(),
          status: 'new',
        },
      ];

      // Set context for the thread
      llmService.setContext('email-2', {
        previousEmails: [threadEmails[0]],
        userPreferences: {
          workingHours: {
            start: '09:00',
            end: '17:00',
          },
          timezone: 'UTC',
          meetingDuration: 60,
        },
      });

      // Process the reply
      await integrationService.processEmail(threadEmails[1]);

      // Verify context was used
      expect(llmService.analyzeEmail).toHaveBeenCalledWith(
        threadEmails[1].content,
        expect.objectContaining({
          previousEmails: [threadEmails[0]],
        })
      );
    });
  });

  describe('Meeting Scheduling', () => {
    it('should handle complex meeting requirements', async () => {
      const mockEmail: ProcessedEmail = {
        id: 'meeting-email',
        from: 'organizer@example.com',
        to: ['attendee1@example.com', 'attendee2@example.com'],
        subject: 'Project Kickoff Meeting',
        content: 'Let\'s schedule a 2-hour kickoff meeting next week. We need the whole team.',
        timestamp: new Date().toISOString(),
        status: 'new',
      };

      // Mock analysis with specific meeting requirements
      jest.spyOn(llmService, 'analyzeEmail').mockResolvedValue({
        summary: 'Project kickoff meeting request',
        key_points: ['2-hour meeting', 'Next week', 'Whole team required'],
        sentiment: 'neutral',
        priority: 'high',
        action_items: ['Schedule kickoff', 'Prepare agenda'],
        category: 'meeting',
        requiresMeeting: true,
        suggestedTimeRange: {
          start: new Date('2024-02-12T09:00:00Z'),
          end: new Date('2024-02-16T17:00:00Z'),
        },
        meetingContext: 'Project kickoff discussion',
        additionalAttendees: ['team@example.com'],
        confidence: 0.95,
        tags: ['meeting', 'kickoff', 'important'],
      });

      // Mock available time slots
      jest.spyOn(calendarService, 'checkAvailability').mockResolvedValue([
        {
          start: new Date('2024-02-13T14:00:00Z'),
          end: new Date('2024-02-13T16:00:00Z'),
        },
        {
          start: new Date('2024-02-14T10:00:00Z'),
          end: new Date('2024-02-14T12:00:00Z'),
        },
      ]);

      // Process the email
      await integrationService.processEmail(mockEmail);

      // Verify meeting proposal was generated
      expect(calendarService.checkAvailability).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );

      // Verify response includes meeting options
      expect(emailManager.sendResponse).toHaveBeenCalledWith(
        mockEmail.id,
        expect.stringContaining('available time slots')
      );
    });
  });
}); 