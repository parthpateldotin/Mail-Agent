import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  CardActions,
  Alert,
} from '@mui/material';

interface VacationResponder {
  enabled: boolean;
  message: string;
  startDate: string;
  endDate: string;
}

interface SettingsState {
  emailNotifications: boolean;
  desktopNotifications: boolean;
  darkMode: boolean;
  signature: string;
  vacationResponder: VacationResponder;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingsState>({
    emailNotifications: true,
    desktopNotifications: false,
    darkMode: false,
    signature: '',
    vacationResponder: {
      enabled: false,
      message: '',
      startDate: '',
      endDate: '',
    },
  });

  const [saveStatus, setSaveStatus] = useState<{
    message: string;
    type: 'success' | 'error' | null;
  }>({ message: '', type: null });

  const handleSwitchChange = (name: keyof SettingsState) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings(prev => ({
        ...prev,
        [name]: event.target.checked,
      }));
    };

  const handleVacationResponderChange = (name: keyof VacationResponder) => 
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setSettings(prev => ({
        ...prev,
        vacationResponder: {
          ...prev.vacationResponder,
          [name]: name === 'enabled' ? event.target.checked : event.target.value,
        },
      }));
    };

  const handleSignatureChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSettings(prev => ({
      ...prev,
      signature: event.target.value,
    }));
  };

  const handleSave = async () => {
    try {
      // TODO: Implement API call to save settings
      setSaveStatus({
        message: 'Settings saved successfully',
        type: 'success',
      });
    } catch (error) {
      setSaveStatus({
        message: 'Failed to save settings',
        type: 'error',
      });
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Settings
      </Typography>

      {saveStatus.type && (
        <Alert severity={saveStatus.type} sx={{ mb: 2 }}>
          {saveStatus.message}
        </Alert>
      )}

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.emailNotifications}
                    onChange={handleSwitchChange('emailNotifications')}
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.desktopNotifications}
                    onChange={handleSwitchChange('desktopNotifications')}
                  />
                }
                label="Desktop Notifications"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Appearance
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.darkMode}
                    onChange={handleSwitchChange('darkMode')}
                  />
                }
                label="Dark Mode"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Email Signature
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={settings.signature}
                onChange={handleSignatureChange}
                placeholder="Enter your email signature"
                variant="outlined"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Vacation Responder
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={settings.vacationResponder.enabled}
                    onChange={handleVacationResponderChange('enabled')}
                  />
                }
                label="Enable Vacation Responder"
              />
              {settings.vacationResponder.enabled && (
                <Box sx={{ mt: 2 }}>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="Start Date"
                        value={settings.vacationResponder.startDate}
                        onChange={handleVacationResponderChange('startDate')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField
                        fullWidth
                        type="date"
                        label="End Date"
                        value={settings.vacationResponder.endDate}
                        onChange={handleVacationResponderChange('endDate')}
                        InputLabelProps={{ shrink: true }}
                      />
                    </Grid>
                    <Grid item xs={12}>
                      <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Auto-Reply Message"
                        value={settings.vacationResponder.message}
                        onChange={handleVacationResponderChange('message')}
                        placeholder="I'm currently out of office..."
                      />
                    </Grid>
                  </Grid>
                </Box>
              )}
            </CardContent>
            <CardActions>
              <Button variant="contained" color="primary" onClick={handleSave}>
                Save Changes
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings; 