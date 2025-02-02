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

export interface ProcessedEmail {
  id: string;
  from: string;
  subject: string;
  content: string;
  timestamp: string;
  summary?: string;
  sentiment?: string;
  priority?: string;
  autoResponseSent?: boolean;
}

export interface EmailAnalysis {
  summary: string;
  key_points: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  priority: 'high' | 'medium' | 'low';
  action_items: string[];
}

export interface EmailResponse {
  subject: string;
  body: string;
  tone?: string;
  attachments?: string[];
  cc?: string[];
  scheduling_suggestion?: string;
} 