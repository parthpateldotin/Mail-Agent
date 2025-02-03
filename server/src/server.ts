import express from 'express';
import cors from 'cors';
import { config } from 'dotenv';
import { EmailManager } from './services/EmailManager';
import { AutoResponseAgent } from './services/AutoResponseAgent';
import { SettingsManager } from './services/SettingsManager';
import { DashboardMonitor } from './services/DashboardMonitor';
import { HandshakeManager } from './services/HandshakeManager';
import { DashboardController } from './controllers/DashboardController';
import { LLMService } from './services/LLMService';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize services
const handshakeManager = new HandshakeManager();
const emailManager = new EmailManager();
const settingsManager = new SettingsManager();
const llmService = new LLMService();
const autoResponseAgent = new AutoResponseAgent(emailManager, settingsManager, llmService);
const dashboardMonitor = new DashboardMonitor(handshakeManager);

// Initialize controllers
const dashboardController = new DashboardController(dashboardMonitor, handshakeManager);

// Start monitoring
dashboardMonitor.start();

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
    const isRunning = autoResponseAgent.status;
    res.json({ isRunning });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get agent status' });
  }
});

// Dashboard endpoints
app.get('/api/dashboard/metrics', (req, res) => dashboardController.getMetrics(req, res));
app.get('/api/dashboard/services', (req, res) => dashboardController.getServiceStatus(req, res));
app.get('/api/dashboard/handshakes', (req, res) => dashboardController.getHandshakeHistory(req, res));
app.get('/api/dashboard/email-metrics', (req, res) => dashboardController.getEmailMetrics(req, res));
app.get('/api/dashboard/performance', (req, res) => dashboardController.getPerformanceMetrics(req, res));

// Cleanup on server shutdown
process.on('SIGTERM', () => {
  dashboardMonitor.stop();
  process.exit(0);
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 