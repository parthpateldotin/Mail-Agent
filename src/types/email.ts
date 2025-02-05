export interface EmailAnalytics {
  sentiment: 'positive' | 'negative' | 'neutral';
  priority: 'high' | 'normal' | 'low';
  category: string;
  summary: string;
  key_points: string[];
}

export interface EmailMetadata {
  priority: 'high' | 'normal' | 'low';
  category: string;
  sentiment?: string;
}

export interface EmailAttachment {
  filename: string;
  content: string | ArrayBuffer;
  contentType: string;
}

export interface EmailAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  priority: 'high' | 'normal' | 'low';
  category: string;
  summary: string;
  key_points: string[];
  suggestedTimeRange?: {
    start: string;
    end: string;
  };
  requiresMeeting: boolean;
  meetingContext?: string;
  additionalAttendees?: string[];
}

export interface ProcessedEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  content: string;
  timestamp: string;
  analytics?: EmailAnalytics;
  attachments?: EmailAttachment[];
}

export interface EmailResponse {
  to: string[];
  subject: string;
  body: string;
  analytics: EmailAnalytics;
}

export interface EmailSearchParams {
  from?: string;
  to?: string;
  subject?: string;
  startDate?: string;
  endDate?: string;
  category?: string;
  priority?: 'high' | 'normal' | 'low';
}

export interface EmailMetrics {
  totalEmails: number;
  averageResponseTime: number;
  categoryCounts: Record<string, number>;
  priorityCounts: Record<string, number>;
  sentimentCounts: Record<string, number>;
} 