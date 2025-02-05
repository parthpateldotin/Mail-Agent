import { useState, useEffect } from 'react';
import { EmailSettings, AISettings } from '../components/settings/SettingsPanel';

const defaultEmailSettings: EmailSettings = {
  signature: '',
  replyTo: '',
  defaultFolder: 'inbox',
  autoSaveDrafts: true,
  sendReadReceipts: false,
  useThreadedView: true,
  showNotifications: true
};

const defaultAISettings: AISettings = {
  enableSmartReply: true,
  enableAnalytics: true,
  enableSpamDetection: true,
  defaultReplyStyle: 'formal',
  languagePreference: 'en',
  customCategories: ['Work', 'Personal', 'Shopping', 'Travel', 'Finance']
};

export const useSettings = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings);
  const [aiSettings, setAISettings] = useState<AISettings>(defaultAISettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        setLoading(true);
        setError(null);

        const [emailResponse, aiResponse] = await Promise.all([
          fetch('/api/settings/email'),
          fetch('/api/settings/ai')
        ]);

        if (!emailResponse.ok || !aiResponse.ok) {
          throw new Error('Failed to load settings');
        }

        const [emailData, aiData] = await Promise.all([
          emailResponse.json(),
          aiResponse.json()
        ]);

        setEmailSettings(emailData);
        setAISettings(aiData);
      } catch (error) {
        console.error('Failed to load settings:', error);
        setError('Failed to load settings. Using default settings.');
        setEmailSettings(defaultEmailSettings);
        setAISettings(defaultAISettings);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const updateEmailSettings = async (newSettings: EmailSettings) => {
    try {
      const response = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update email settings');
      }

      setEmailSettings(newSettings);
    } catch (error) {
      console.error('Failed to update email settings:', error);
      throw error;
    }
  };

  const updateAISettings = async (newSettings: AISettings) => {
    try {
      const response = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update AI settings');
      }

      setAISettings(newSettings);
    } catch (error) {
      console.error('Failed to update AI settings:', error);
      throw error;
    }
  };

  return {
    emailSettings,
    aiSettings,
    updateEmailSettings,
    updateAISettings,
    loading,
    error
  };
}; 