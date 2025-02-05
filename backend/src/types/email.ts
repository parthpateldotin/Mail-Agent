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

export interface EmailAnalytics {
  openCount: number;
  lastOpened?: Date;
  clickCount: number;
  lastClicked?: Date;
  replyCount: number;
  lastReplied?: Date;
  aiAnalysis?: EmailAnalysis;
}

export interface EmailAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  urgency: 'high' | 'medium' | 'low';
  category: string;
  summary: string;
  priority?: number;
  autoResponseSent?: boolean;
  requiresMeeting?: boolean;
  suggestedTimeRange?: {
    start: string;
    end: string;
  };
  meetingContext?: string;
  additionalAttendees?: string[];
  key_points?: string[];
}

export interface ProcessedEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  content: string;
  timestamp: string;
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  folderId?: string;
  labels?: string[];
  analytics?: EmailAnalytics;
  metadata?: EmailMetadata;
  priority?: string;
  sentiment?: string;
  summary?: string;
  autoResponseSent?: boolean;
}

export interface EmailAttachment {
  filename: string;
  content: string;
  contentType: string;
  size: number;
}

export interface EmailMetadata {
  messageId: string;
  inReplyTo?: string;
  references?: string[];
  headers: Record<string, string>;
}

export interface EmailResponse {
  id: string;
  content: string;
  subject: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  attachments?: EmailAttachment[];
  body?: string;
}

export interface EmailSearchParams {
  q?: string;
  folder?: string;
  from?: Date;
  to?: Date;
  isRead?: boolean;
  isStarred?: boolean;
  hasAttachments?: boolean;
  page?: number;
  limit?: number;
  sort?: 'date' | '-date' | 'subject' | '-subject';
}

export interface EmailMetrics {
  totalProcessed: number;
  successfulResponses: number;
  failedResponses: number;
  averageResponseTime: number;
  responseRate: number;
  categories: Record<string, number>;
  priorities: Record<string, number>;
  hourlyDistribution: Record<string, number>;
} 