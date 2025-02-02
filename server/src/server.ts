import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { EmailManager } from './services/EmailManager';
import { AutoResponseAgent } from './services/AutoResponseAgent';
import { SettingsManager } from './services/SettingsManager';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const emailManager = new EmailManager();
const autoResponseAgent = new AutoResponseAgent(emailManager);
const settingsManager = new SettingsManager();

// Settings endpoints
app.get('/api/settings/email', async (req, res) => {
  try {
    const settings = await settingsManager.getEmailSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch email settings' });
  }
});

app.post('/api/settings/email', async (req, res) => {
  try {
    await settingsManager.saveEmailSettings(req.body);
    res.json({ message: 'Settings saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save email settings' });
  }
});

app.post('/api/settings/email/test', async (req, res) => {
  try {
    await emailManager.testConnection(req.body);
    res.json({ message: 'Connection test successful' });
  } catch (error) {
    res.status(500).json({ error: 'Connection test failed' });
  }
});

// Email processing endpoints
app.get('/api/emails/process', async (req, res) => {
  try {
    const processedEmails = await emailManager.processNewEmails();
    res.json(processedEmails);
  } catch (error) {
    res.status(500).json({ error: 'Failed to process emails' });
  }
});

app.post('/api/emails/respond', async (req, res) => {
  try {
    const { emailId, response } = req.body;
    await emailManager.sendResponse(emailId, response);
    res.json({ message: 'Response sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send response' });
  }
});

app.post('/api/emails/summary', async (req, res) => {
  try {
    const { summaries } = req.body;
    await emailManager.sendSummaryToAdmin(summaries);
    res.json({ message: 'Summary sent successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send summary' });
  }
});

// Auto-response agent endpoints
app.post('/api/agent/start', async (req, res) => {
  try {
    await autoResponseAgent.start();
    res.json({ message: 'Auto-response agent started' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start auto-response agent' });
  }
});

app.post('/api/agent/stop', async (req, res) => {
  try {
    await autoResponseAgent.stop();
    res.json({ message: 'Auto-response agent stopped' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to stop auto-response agent' });
  }
});

app.get('/api/agent/status', async (req, res) => {
  try {
    const status = await autoResponseAgent.getStatus();
    res.json({ isRunning: status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 