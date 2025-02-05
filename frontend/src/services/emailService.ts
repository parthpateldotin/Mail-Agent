import axios from 'axios';
import { EmailData } from '../components/email/ComposeEmail';

const API_BASE_URL = '/api';

export const emailService = {
  async sendEmail(emailData: EmailData): Promise<void> {
    const formData = new FormData();
    
    // Add email data
    formData.append('to', JSON.stringify(emailData.to));
    formData.append('cc', JSON.stringify(emailData.cc));
    formData.append('bcc', JSON.stringify(emailData.bcc));
    formData.append('subject', emailData.subject);
    formData.append('content', emailData.content);
    
    // Add attachments
    emailData.attachments.forEach((file, index) => {
      formData.append(`attachment${index}`, file);
    });

    await axios.post(`${API_BASE_URL}/email/send`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async saveDraft(emailData: EmailData): Promise<void> {
    const formData = new FormData();
    
    formData.append('to', JSON.stringify(emailData.to));
    formData.append('cc', JSON.stringify(emailData.cc));
    formData.append('bcc', JSON.stringify(emailData.bcc));
    formData.append('subject', emailData.subject);
    formData.append('content', emailData.content);
    
    emailData.attachments.forEach((file, index) => {
      formData.append(`attachment${index}`, file);
    });

    await axios.post(`${API_BASE_URL}/email/draft`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  async getAISuggestions(content: string): Promise<string[]> {
    const response = await axios.post(`${API_BASE_URL}/email/ai-suggestions`, {
      content,
    });
    return response.data.suggestions;
  },
}; 