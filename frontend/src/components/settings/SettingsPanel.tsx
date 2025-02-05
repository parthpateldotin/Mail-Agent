import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Snackbar,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Add as AddIcon,
  Save as SaveIcon
} from '@mui/icons-material';

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

export interface SettingsPanelProps {
  emailSettings: EmailSettings;
  aiSettings: AISettings;
  onSaveEmailSettings: (settings: EmailSettings) => Promise<void>;
  onSaveAISettings: (settings: AISettings) => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  emailSettings: initialEmailSettings,
  aiSettings: initialAISettings,
  onSaveEmailSettings,
  onSaveAISettings
}) => {
  const [emailSettings, setEmailSettings] = useState<EmailSettings>(initialEmailSettings);
  const [aiSettings, setAISettings] = useState<AISettings>(initialAISettings);
  const [newCategory, setNewCategory] = useState('');
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const handleEmailSettingChange = (
    key: keyof EmailSettings,
    value: string | boolean
  ) => {
    setEmailSettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAISettingChange = (
    key: keyof AISettings,
    value: string | boolean | string[]
  ) => {
    setAISettings((prev) => ({
      ...prev,
      [key]: value
    }));
  };

  const handleAddCategory = () => {
    if (newCategory && !aiSettings.customCategories.includes(newCategory)) {
      handleAISettingChange('customCategories', [
        ...aiSettings.customCategories,
        newCategory
      ]);
      setNewCategory('');
    }
  };

  const handleRemoveCategory = (category: string) => {
    handleAISettingChange(
      'customCategories',
      aiSettings.customCategories.filter((c) => c !== category)
    );
  };

  const handleSaveEmailSettings = async () => {
    try {
      await onSaveEmailSettings(emailSettings);
      setSnackbar({
        open: true,
        message: 'Email settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to save email settings',
        severity: 'error'
      });
    }
  };

  const handleSaveAISettings = async () => {
    try {
      await onSaveAISettings(aiSettings);
      setSnackbar({
        open: true,
        message: 'AI settings saved successfully',
        severity: 'success'
      });
    } catch (error) {
      setSnackbar({
        open: true,
        message: 'Failed to save AI settings',
        severity: 'error'
      });
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>

      {/* Email Settings */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Email Settings
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="Email Signature"
              multiline
              rows={4}
              value={emailSettings.signature}
              onChange={(e) =>
                handleEmailSettingChange('signature', e.target.value)
              }
              fullWidth
            />

            <TextField
              label="Reply-To Address"
              value={emailSettings.replyTo}
              onChange={(e) =>
                handleEmailSettingChange('replyTo', e.target.value)
              }
              fullWidth
            />

            <FormControl fullWidth>
              <InputLabel>Default Folder</InputLabel>
              <Select
                value={emailSettings.defaultFolder}
                onChange={(e) =>
                  handleEmailSettingChange('defaultFolder', e.target.value)
                }
              >
                <MenuItem value="inbox">Inbox</MenuItem>
                <MenuItem value="archive">Archive</MenuItem>
                <MenuItem value="sent">Sent</MenuItem>
              </Select>
            </FormControl>

            <FormControlLabel
              control={
                <Switch
                  checked={emailSettings.autoSaveDrafts}
                  onChange={(e) =>
                    handleEmailSettingChange('autoSaveDrafts', e.target.checked)
                  }
                />
              }
              label="Auto-save drafts"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={emailSettings.sendReadReceipts}
                  onChange={(e) =>
                    handleEmailSettingChange('sendReadReceipts', e.target.checked)
                  }
                />
              }
              label="Send read receipts"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={emailSettings.useThreadedView}
                  onChange={(e) =>
                    handleEmailSettingChange('useThreadedView', e.target.checked)
                  }
                />
              }
              label="Use threaded view"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={emailSettings.showNotifications}
                  onChange={(e) =>
                    handleEmailSettingChange('showNotifications', e.target.checked)
                  }
                />
              }
              label="Show notifications"
            />

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveEmailSettings}
            >
              Save Email Settings
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            AI Settings
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={aiSettings.enableSmartReply}
                  onChange={(e) =>
                    handleAISettingChange('enableSmartReply', e.target.checked)
                  }
                />
              }
              label="Enable Smart Reply"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={aiSettings.enableAnalytics}
                  onChange={(e) =>
                    handleAISettingChange('enableAnalytics', e.target.checked)
                  }
                />
              }
              label="Enable Email Analytics"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={aiSettings.enableSpamDetection}
                  onChange={(e) =>
                    handleAISettingChange('enableSpamDetection', e.target.checked)
                  }
                />
              }
              label="Enable Spam Detection"
            />

            <FormControl fullWidth>
              <InputLabel>Default Reply Style</InputLabel>
              <Select
                value={aiSettings.defaultReplyStyle}
                onChange={(e) =>
                  handleAISettingChange('defaultReplyStyle', e.target.value)
                }
              >
                <MenuItem value="formal">Formal</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
                <MenuItem value="friendly">Friendly</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Language Preference</InputLabel>
              <Select
                value={aiSettings.languagePreference}
                onChange={(e) =>
                  handleAISettingChange('languagePreference', e.target.value)
                }
              >
                <MenuItem value="en">English</MenuItem>
                <MenuItem value="es">Spanish</MenuItem>
                <MenuItem value="fr">French</MenuItem>
                <MenuItem value="de">German</MenuItem>
                <MenuItem value="it">Italian</MenuItem>
                <MenuItem value="pt">Portuguese</MenuItem>
                <MenuItem value="ru">Russian</MenuItem>
                <MenuItem value="zh">Chinese</MenuItem>
                <MenuItem value="ja">Japanese</MenuItem>
                <MenuItem value="ko">Korean</MenuItem>
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            <Typography variant="subtitle1" gutterBottom>
              Custom Categories
            </Typography>

            <Box sx={{ display: 'flex', gap: 1 }}>
              <TextField
                label="New Category"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
                fullWidth
              />
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleAddCategory}
                disabled={!newCategory}
              >
                Add
              </Button>
            </Box>

            <List>
              {aiSettings.customCategories.map((category) => (
                <ListItem key={category}>
                  <ListItemText primary={category} />
                  <ListItemSecondaryAction>
                    <IconButton
                      edge="end"
                      onClick={() => handleRemoveCategory(category)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>

            <Button
              variant="contained"
              startIcon={<SaveIcon />}
              onClick={handleSaveAISettings}
            >
              Save AI Settings
            </Button>
          </Box>
        </CardContent>
      </Card>

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
    </Box>
  );
};

export default SettingsPanel; 