import { AppError } from '../utils/AppError';

interface CalendarAttendee {
  email: string;
  responseStatus?: 'accepted' | 'declined' | 'tentative' | 'needsAction';
}

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  attendees?: CalendarAttendee[];
  location?: string;
  conferenceData?: {
    conferenceId: string;
    entryPoints: Array<{
      entryPointType: string;
      uri: string;
      label?: string;
    }>;
  };
}

interface CalendarResponse {
  data: {
    items: CalendarEvent[];
    nextPageToken?: string;
    attendees?: CalendarAttendee[];
  };
}

export class CalendarService {
  private calendar: any; // Replace with proper Google Calendar client type

  constructor() {
    // Initialize Google Calendar client
  }

  public async createMeeting(
    startDate: string,
    endDate: string,
    context: string,
    additionalAttendees?: string[]
  ): Promise<CalendarEvent> {
    try {
      const event = {
        summary: `Meeting: ${context}`,
        description: context,
        start: {
          dateTime: startDate,
          timeZone: 'UTC'
        },
        end: {
          dateTime: endDate,
          timeZone: 'UTC'
        },
        attendees: additionalAttendees?.map(email => ({ email })) || [],
        conferenceData: {
          createRequest: {
            requestId: `${Date.now()}`
          }
        }
      };

      const response: CalendarResponse = await this.calendar.events.insert({
        calendarId: 'primary',
        resource: event,
        conferenceDataVersion: 1
      });

      return {
        id: response.data.id,
        summary: response.data.summary,
        description: response.data.description,
        start: response.data.start,
        end: response.data.end,
        attendees: response.data.attendees?.map((a: CalendarAttendee) => ({
          email: a.email,
          responseStatus: a.responseStatus
        })) || [],
        location: response.data.location,
        conferenceData: response.data.conferenceData
      };
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to create meeting: ${error.message}`, 500);
      }
      throw new AppError('Failed to create meeting with unknown error', 500);
    }
  }

  public async listMeetings(
    timeMin?: string,
    timeMax?: string,
    maxResults = 10
  ): Promise<CalendarEvent[]> {
    try {
      const response: CalendarResponse = await this.calendar.events.list({
        calendarId: 'primary',
        timeMin: timeMin || new Date().toISOString(),
        timeMax,
        maxResults,
        singleEvents: true,
        orderBy: 'startTime'
      });

      return response.data.items.map((item: CalendarEvent) => ({
        id: item.id,
        summary: item.summary,
        description: item.description,
        start: item.start,
        end: item.end,
        attendees: item.attendees?.map((a: CalendarAttendee) => ({
          email: a.email,
          responseStatus: a.responseStatus
        })) || [],
        location: item.location,
        conferenceData: item.conferenceData
      }));
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AppError(`Failed to list meetings: ${error.message}`, 500);
      }
      throw new AppError('Failed to list meetings with unknown error', 500);
    }
  }
} 