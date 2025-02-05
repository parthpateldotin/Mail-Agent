import React, { useState, useEffect } from 'react';
import { Container, Alert, Snackbar } from '@mui/material';
import SettingsPanel, {
  EmailSettings,
  AISettings
} from '../components/settings/SettingsPanel';
import LoadingSpinner from '../components/common/LoadingSpinner';

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

const Settings: React.FC = () => {
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(defaultEmailSettings);
  const [aiSettings, setAISettings] = useState<AISettings>(defaultAISettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error' as 'error' | 'success'
  });

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

  const handleSaveEmailSettings = async (settings: EmailSettings) => {
    try {
      const response = await fetch('/api/settings/email', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save email settings');
      }

      setEmailSettings(settings);
      setSnackbar({
        open: true,
        message: 'Email settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to save email settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save email settings',
        severity: 'error'
      });
      throw error;
    }
  };

  const handleSaveAISettings = async (settings: AISettings) => {
    try {
      const response = await fetch('/api/settings/ai', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) {
        throw new Error('Failed to save AI settings');
      }

      setAISettings(settings);
      setSnackbar({
        open: true,
        message: 'AI settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to save AI settings:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save AI settings',
        severity: 'error'
      });
      throw error;
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading settings..." />;
  }

  return (
    <Container maxWidth="lg">
      {error && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <SettingsPanel
        emailSettings={emailSettings}
        aiSettings={aiSettings}
        onSaveEmailSettings={handleSaveEmailSettings}
        onSaveAISettings={handleSaveAISettings}
      />

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
