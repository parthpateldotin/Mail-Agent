import { useState, useEffect } from 'react';
import axios from 'axios';
import { AppError } from '../utils/AppError';

export interface EmailSettings {
  signature: string;
  replyTo: string;
  defaultFolder: string;
  autoSaveDrafts: boolean;
  sendReadReceipts: boolean;
  useThreadedView: boolean;
  showNotifications: boolean;
}

export interface AISettings {
  enableSmartReply: boolean;
  enableAnalytics: boolean;
  enableSpamDetection: boolean;
  defaultReplyStyle: 'formal' | 'casual' | 'friendly';
  languagePreference: string;
  customCategories: string[];
}

interface Settings {
  email: EmailSettings;
  ai: AISettings;
}

export const useSettings = () => {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await axios.get<Settings>('/api/settings');
      setSettings(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load settings');
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const updateEmailSettings = async (newSettings: EmailSettings) => {
    try {
      setLoading(true);
      const response = await axios.patch<Settings>('/api/settings/email', newSettings);
      setSettings(prev => prev ? { ...prev, email: response.data.email } : response.data);
      setError(null);
    } catch (err) {
      setError('Failed to update email settings');
      console.error('Error updating email settings:', err);
      throw new AppError('Failed to update email settings', 500);
    } finally {
      setLoading(false);
    }
  };

  const updateAISettings = async (newSettings: AISettings) => {
    try {
      setLoading(true);
      const response = await axios.patch<Settings>('/api/settings/ai', newSettings);
      setSettings(prev => prev ? { ...prev, ai: response.data.ai } : response.data);
      setError(null);
    } catch (err) {
      setError('Failed to update AI settings');
      console.error('Error updating AI settings:', err);
      throw new AppError('Failed to update AI settings', 500);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  return {
    settings,
    loading,
    error,
    updateEmailSettings,
    updateAISettings
  };
}; 