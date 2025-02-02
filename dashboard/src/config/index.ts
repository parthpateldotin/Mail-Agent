export const config = {
  apiUrl: process.env.REACT_APP_API_URL || 'http://localhost:3001',
  wsUrl: process.env.REACT_APP_WEBSOCKET_URL || 'ws://localhost:3001',
  defaultWorkingHours: {
    start: '09:00',
    end: '17:00',
  },
  defaultResponseDelay: '5',
  emailRefreshInterval: 5 * 60 * 1000, // 5 minutes
  maxRetries: 3,
  retryDelay: 1000, // 1 second
  toastDuration: 6000, // 6 seconds
  maxSummaryLength: 500,
  maxAttachmentSize: 10 * 1024 * 1024, // 10MB
  supportedAttachmentTypes: [
    'image/*',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv',
  ],
  emailTemplateCategories: [
    'project-management',
    'information-gathering',
    'scheduling',
    'finance',
    'reporting',
  ],
  tones: [
    'professional',
    'friendly',
    'formal',
    'casual',
    'urgent',
    'apologetic',
    'appreciative',
  ],
}; 