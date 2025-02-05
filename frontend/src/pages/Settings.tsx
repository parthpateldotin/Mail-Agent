import React from 'react';
import {
  Container,
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Divider
} from '@mui/material';
import { SettingsPanel } from '../components/settings/SettingsPanel';
import { useSettings } from '../hooks/useSettings';

export const Settings: React.FC = () => {
  const [tab, setTab] = React.useState(0);
  const { emailSettings, aiSettings, updateEmailSettings, updateAISettings } = useSettings();

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        <Paper sx={{ mt: 3 }}>
          <Tabs
            value={tab}
            onChange={handleTabChange}
            indicatorColor="primary"
            textColor="primary"
            variant="fullWidth"
          >
            <Tab label="Email Settings" />
            <Tab label="AI Preferences" />
          </Tabs>
          <Divider />
          <Box sx={{ p: 3 }}>
            <SettingsPanel
              emailSettings={emailSettings}
              aiSettings={aiSettings}
              onSaveEmailSettings={updateEmailSettings}
              onSaveAISettings={updateAISettings}
            />
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};
