export interface Attachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
  content: Buffer;
}

export interface ThreadInfo {
  id: string;
  subject: string;
  participants: string[];
  messageCount: number;
  lastMessageDate: Date;
}

export interface EmailMetadata {
  categories: string[];
  priority: 'high' | 'medium' | 'low';
  language: string;
  sentiment?: 'positive' | 'neutral' | 'negative';
  isAutoReply: boolean;
  requiresResponse: boolean;
}

export interface ProcessingInfo {
  attempts: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  error?: string;
  processingTime?: number;
  completedSteps: string[];
  nextStep?: string;
}

export interface EmailContext {
  intent: string;
  entities: Record<string, any>;
  requiredActions: string[];
  suggestedResponse?: string;
  confidence: number;
  metadata: EmailMetadata;
}

export interface EmailResponse {
  id: string;
  inReplyTo: string;
  subject: string;
  content: string;
  attachments?: Attachment[];
  metadata: EmailMetadata;
  context: EmailContext;
  status: 'draft' | 'ready' | 'sent' | 'failed';
}

export interface ValidationResult {
  isValid: boolean;
  errors?: string[];
  warnings?: string[];
  suggestions?: string[];
}

export interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  content: string;
  variables: string[];
  metadata: {
    category: string;
    language: string;
    tone: string;
    useCase: string;
  };
}

export type EmailStatus = 
  | 'received'
  | 'parsed'
  | 'analyzed'
  | 'generating_response'
  | 'response_ready'
  | 'sending'
  | 'sent'
  | 'failed';

export interface IncomingEmail {
  id: string;
  from: string;
  to: string[];
  subject: string;
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
  thread?: ThreadInfo;
  metadata?: EmailMetadata;
}

export interface EmailServiceConfig {
  imap: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  smtp: {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    password: string;
  };
  polling: {
    interval: number;
    maxRetries: number;
    retryDelay: number;
  };
  processing: {
    maxConcurrent: number;
    timeout: number;
    retryStrategy: 'exponential' | 'linear';
  };
} 