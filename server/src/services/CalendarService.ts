import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Logger } from '../utils/logger';

interface CalendarEvent {
  id: string;
  summary: string;
  description: string;
  start: Date;
  end: Date;
  attendees: string[];
  meetingLink?: string;
}

interface AvailabilitySlot {
  start: Date;
  end: Date;
}

export class CalendarService {
  private calendar: any;
  private logger: Logger;

  constructor(private credentials: {
    clientId: string;
    clientSecret: string;
    redirectUri: string;
  }) {
    this.logger = new Logger('CalendarService');
    this.initializeCalendar();
  }

  private async initializeCalendar() {
    try {
      const auth = new OAuth2Client(
        this.credentials.clientId,
        this.credentials.clientSecret,
        this.credentials.redirectUri
      );
      
      this.calendar = google.calendar({ version: 'v3', auth });
      this.logger.info('Calendar service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize calendar service:', error);
      throw error;
    }
  }

  async checkAvailability(startTime: Date, endTime: Date): Promise<AvailabilitySlot[]> {
    try {
      const response = await this.calendar.freebusy.query({
        requestBody: {
          timeMin: startTime.toISOString(),
          timeMax: endTime.toISOString(),
          items: [{ id: 'primary' }],
        },
      });

      const busySlots = response.data.calendars.primary.busy;
      return this.findAvailableSlots(startTime, endTime, busySlots);
    } catch (error) {
      this.logger.error('Failed to check availability:', error);
      throw error;
    }
  }

  private findAvailableSlots(
    start: Date,
    end: Date,
    busySlots: { start: string; end: string }[]
  ): AvailabilitySlot[] {
    const availableSlots: AvailabilitySlot[] = [];
    let currentTime = new Date(start);

    for (const busy of busySlots) {
      const busyStart = new Date(busy.start);
      if (currentTime < busyStart) {
        availableSlots.push({
          start: new Date(currentTime),
          end: new Date(busyStart),
        });
      }
      currentTime = new Date(busy.end);
    }

    if (currentTime < end) {
      availableSlots.push({
        start: new Date(currentTime),
        end: new Date(end),
      });
    }

    return availableSlots;
  }

  async scheduleMeeting(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    try {
      const response = await this.calendar.events.insert({
        calendarId: 'primary',
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
          },
          end: {
            dateTime: event.end.toISOString(),
          },
          attendees: event.attendees.map(email => ({ email })),
          conferenceData: {
            createRequest: {
              requestId: `meeting-${Date.now()}`,
              conferenceSolutionKey: { type: 'hangoutsMeet' },
            },
          },
        },
        conferenceDataVersion: 1,
      });

      return {
        id: response.data.id,
        summary: response.data.summary,
        description: response.data.description,
        start: new Date(response.data.start.dateTime),
        end: new Date(response.data.end.dateTime),
        attendees: response.data.attendees?.map(a => a.email) || [],
        meetingLink: response.data.hangoutLink,
      };
    } catch (error) {
      this.logger.error('Failed to schedule meeting:', error);
      throw error;
    }
  }

  async updateMeeting(event: CalendarEvent): Promise<CalendarEvent> {
    try {
      const response = await this.calendar.events.update({
        calendarId: 'primary',
        eventId: event.id,
        requestBody: {
          summary: event.summary,
          description: event.description,
          start: {
            dateTime: event.start.toISOString(),
          },
          end: {
            dateTime: event.end.toISOString(),
          },
          attendees: event.attendees.map(email => ({ email })),
        },
      });

      return {
        id: response.data.id,
        summary: response.data.summary,
        description: response.data.description,
        start: new Date(response.data.start.dateTime),
        end: new Date(response.data.end.dateTime),
        attendees: response.data.attendees?.map(a => a.email) || [],
        meetingLink: response.data.hangoutLink,
      };
    } catch (error) {
      this.logger.error('Failed to update meeting:', error);
      throw error;
    }
  }

  async cancelMeeting(eventId: string): Promise<void> {
    try {
      await this.calendar.events.delete({
        calendarId: 'primary',
        eventId,
      });
    } catch (error) {
      this.logger.error('Failed to cancel meeting:', error);
      throw error;
    }
  }

  async getUpcomingMeetings(maxResults: number = 10): Promise<CalendarEvent[]> {
    try {
      const response = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: new Date().toISOString(),
        maxResults,
        singleEvents: true,
        orderBy: 'startTime',
      });

      return response.data.items.map(item => ({
        id: item.id,
        summary: item.summary,
        description: item.description,
        start: new Date(item.start.dateTime),
        end: new Date(item.end.dateTime),
        attendees: item.attendees?.map(a => a.email) || [],
        meetingLink: item.hangoutLink,
      }));
    } catch (error) {
      this.logger.error('Failed to get upcoming meetings:', error);
      throw error;
    }
  }
} 