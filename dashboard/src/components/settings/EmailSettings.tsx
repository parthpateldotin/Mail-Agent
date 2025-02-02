import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Switch,
  Button,
  Grid,
  FormControlLabel,
  Alert,
  Divider,
  CircularProgress,
  Snackbar,
  IconButton,
  Collapse,
  Paper,
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as TestIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
} from '@mui/icons-material';
import { emailSettingsService } from '../../services/settings/emailSettingsService';

interface EmailConfig {
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

const EmailSettings: React.FC = () => {
  const [config, setConfig] = useState<EmailConfig>({
    imap: {
      host: '',
      port: '',
      username: '',
      password: '',
      secure: true,
    },
    smtp: {
      host: '',
      port: '',
      username: '',
      password: '',
      secure: true,
    },
    autoResponse: {
      enabled: false,
      adminEmail: '',
      summaryEnabled: true,
      responseDelay: '5',
      workingHours: {
        start: '09:00',
        end: '17:00',
      },
      excludedEmails: '',
      customSignature: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const settings = await emailSettingsService.getSettings();
      setConfig(settings);
    } catch (err) {
      setError('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      await emailSettingsService.saveSettings(config);
      setSuccess('Settings saved successfully');
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    try {
      setTesting(true);
      setError(null);
      await emailSettingsService.testConnection(config);
      setSuccess('Connection test successful');
    } catch (err) {
      setError('Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleChange = (section: keyof EmailConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  return (
    <Box sx={{ maxWidth: 800, mx: 'auto', p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Email Settings
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Snackbar
        open={!!success}
        autoHideDuration={6000}
        onClose={() => setSuccess(null)}
        message={success}
      />

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            IMAP Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="IMAP Host"
                value={config.imap.host}
                onChange={(e) => handleChange('imap', 'host', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="IMAP Port"
                value={config.imap.port}
                onChange={(e) => handleChange('imap', 'port', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={config.imap.username}
                onChange={(e) => handleChange('imap', 'username', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={config.imap.password}
                onChange={(e) => handleChange('imap', 'password', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.imap.secure}
                    onChange={(e) => handleChange('imap', 'secure', e.target.checked)}
                  />
                }
                label="Use SSL/TLS"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            SMTP Configuration
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SMTP Host"
                value={config.smtp.host}
                onChange={(e) => handleChange('smtp', 'host', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="SMTP Port"
                value={config.smtp.port}
                onChange={(e) => handleChange('smtp', 'port', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Username"
                value={config.smtp.username}
                onChange={(e) => handleChange('smtp', 'username', e.target.value)}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="password"
                label="Password"
                value={config.smtp.password}
                onChange={(e) => handleChange('smtp', 'password', e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.smtp.secure}
                    onChange={(e) => handleChange('smtp', 'secure', e.target.checked)}
                  />
                }
                label="Use SSL/TLS"
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">Auto-Response Settings</Typography>
            <IconButton
              onClick={() => setShowAdvanced(!showAdvanced)}
              sx={{ ml: 'auto' }}
            >
              {showAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={config.autoResponse.enabled}
                    onChange={(e) =>
                      handleChange('autoResponse', 'enabled', e.target.checked)
                    }
                  />
                }
                label="Enable Auto-Response"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Admin Email (for summaries)"
                value={config.autoResponse.adminEmail}
                onChange={(e) =>
                  handleChange('autoResponse', 'adminEmail', e.target.value)
                }
              />
            </Grid>
          </Grid>

          <Collapse in={showAdvanced}>
            <Box sx={{ mt: 2 }}>
              <Divider sx={{ my: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={config.autoResponse.summaryEnabled}
                        onChange={(e) =>
                          handleChange('autoResponse', 'summaryEnabled', e.target.checked)
                        }
                      />
                    }
                    label="Send Email Summaries to Admin"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Response Delay (minutes)"
                    value={config.autoResponse.responseDelay}
                    onChange={(e) =>
                      handleChange('autoResponse', 'responseDelay', e.target.value)
                    }
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Working Hours Start"
                    type="time"
                    value={config.autoResponse.workingHours.start}
                    onChange={(e) =>
                      handleChange('autoResponse', 'workingHours', {
                        ...config.autoResponse.workingHours,
                        start: e.target.value,
                      })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Working Hours End"
                    type="time"
                    value={config.autoResponse.workingHours.end}
                    onChange={(e) =>
                      handleChange('autoResponse', 'workingHours', {
                        ...config.autoResponse.workingHours,
                        end: e.target.value,
                      })
                    }
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={2}
                    label="Excluded Email Addresses (comma-separated)"
                    value={config.autoResponse.excludedEmails}
                    onChange={(e) =>
                      handleChange('autoResponse', 'excludedEmails', e.target.value)
                    }
                    helperText="Emails that won't receive auto-responses"
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Custom Email Signature"
                    value={config.autoResponse.customSignature}
                    onChange={(e) =>
                      handleChange('autoResponse', 'customSignature', e.target.value)
                    }
                  />
                </Grid>
              </Grid>
            </Box>
          </Collapse>
        </CardContent>
      </Card>

      <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} /> : <SaveIcon />}
        >
          Save Settings
        </Button>
        <Button
          variant="outlined"
          onClick={handleTest}
          disabled={testing}
          startIcon={testing ? <CircularProgress size={20} /> : <TestIcon />}
        >
          Test Connection
        </Button>
      </Box>
    </Box>
  );
};

export default EmailSettings; 