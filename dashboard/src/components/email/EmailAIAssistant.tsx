import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Divider,
  CircularProgress,
  Card,
  CardContent,
  IconButton,
  Collapse,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Grid,
  Tooltip,
} from '@mui/material';
import {
  Send as SendIcon,
  ContentCopy as CopyIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Schedule as ScheduleIcon,
  Group as GroupIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { 
  aiService, 
  EmailSummary, 
  EmailResponse, 
  PromptTemplate 
} from '../../services/ai/aiService';

interface EmailAIAssistantProps {
  emailContent: string;
  onResponseGenerated?: (response: EmailResponse) => void;
}

const EmailAIAssistant: React.FC<EmailAIAssistantProps> = ({
  emailContent,
  onResponseGenerated,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<EmailSummary | null>(null);
  const [response, setResponse] = useState<EmailResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(true);
  const [templates, setTemplates] = useState<PromptTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');

  useEffect(() => {
    loadTemplates();
  }, [emailContent]);

  const loadTemplates = async () => {
    try {
      const suggestedTemplates = await aiService.suggestTemplates(emailContent);
      setTemplates(suggestedTemplates);
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

  const handleSummarize = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await aiService.summarizeEmail(emailContent);
      setSummary(result);
    } catch (err) {
      setError('Failed to summarize email');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = aiService.getTemplateById(templateId);
    if (template) {
      setPrompt(template.template);
    }
  };

  const handleGenerateResponse = async () => {
    if (!prompt.trim()) return;

    try {
      setLoading(true);
      setError(null);
      const result = await aiService.generateResponse(emailContent, prompt, selectedTemplate);
      setResponse(result);
      onResponseGenerated?.(result);
    } catch (err) {
      setError('Failed to generate response');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyResponse = () => {
    if (response?.body) {
      navigator.clipboard.writeText(response.body);
    }
  };

  return (
    <Box sx={{ mt: 2 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">AI Assistant</Typography>
            <IconButton
              onClick={() => setShowSummary(!showSummary)}
              sx={{ ml: 'auto' }}
            >
              {showSummary ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Box>

          <Collapse in={showSummary}>
            {!summary && !loading && (
              <Button
                variant="outlined"
                onClick={handleSummarize}
                sx={{ mb: 2 }}
              >
                Analyze Email
              </Button>
            )}

            {summary && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" gutterBottom>
                  Summary
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`Priority: ${summary.priority}`}
                        color={
                          summary.priority === 'high'
                            ? 'error'
                            : summary.priority === 'medium'
                            ? 'warning'
                            : 'default'
                        }
                        size="small"
                      />
                      <Chip
                        label={`Sentiment: ${summary.sentiment}`}
                        color={
                          summary.sentiment === 'positive'
                            ? 'success'
                            : summary.sentiment === 'negative'
                            ? 'error'
                            : 'default'
                        }
                        size="small"
                      />
                      <Chip label={summary.category} size="small" />
                      {summary.deadline && (
                        <Chip
                          icon={<ScheduleIcon />}
                          label={`Deadline: ${summary.deadline}`}
                          size="small"
                        />
                      )}
                    </Box>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <AssignmentIcon fontSize="small" /> Key Points:
                    </Typography>
                    <List dense>
                      {summary.key_points.map((point, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={point} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <GroupIcon fontSize="small" /> Stakeholders:
                    </Typography>
                    <List dense>
                      {summary.stakeholders.map((stakeholder, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={stakeholder} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>

                  <Grid item xs={12}>
                    <Typography variant="subtitle2">Next Steps:</Typography>
                    <List dense>
                      {summary.next_steps.map((step, index) => (
                        <ListItem key={index}>
                          <ListItemText primary={step} />
                        </ListItem>
                      ))}
                    </List>
                  </Grid>
                </Grid>
              </Box>
            )}
          </Collapse>

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle1" gutterBottom>
            Generate Response
          </Typography>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Response Template</InputLabel>
            <Select
              value={selectedTemplate}
              label="Response Template"
              onChange={(e) => handleTemplateSelect(e.target.value)}
            >
              <MenuItem value="">
                <em>Custom Response</em>
              </MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  <Tooltip title={template.description}>
                    <Box>
                      {template.name} - {template.tone}
                    </Box>
                  </Tooltip>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder={selectedTemplate ? "Customize the template or click Generate" : "Enter your prompt (e.g., 'Write a polite response agreeing to the timeline changes')"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            sx={{ mb: 2 }}
          />

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              onClick={handleGenerateResponse}
              disabled={loading || !prompt.trim()}
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            >
              Generate
            </Button>
            {response && (
              <Button
                variant="outlined"
                onClick={handleCopyResponse}
                startIcon={<CopyIcon />}
              >
                Copy Response
              </Button>
            )}
          </Box>

          {error && (
            <Typography color="error" sx={{ mt: 2 }}>
              {error}
            </Typography>
          )}

          {response && (
            <Paper sx={{ mt: 2, p: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                Generated Response:
              </Typography>
              <Typography variant="body2" gutterBottom>
                Subject: {response.subject}
              </Typography>
              {response.cc && response.cc.length > 0 && (
                <Typography variant="body2" gutterBottom>
                  CC: {response.cc.join(', ')}
                </Typography>
              )}
              {response.scheduling_suggestion && (
                <Typography variant="body2" color="primary" gutterBottom>
                  <ScheduleIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />
                  Suggested Time: {response.scheduling_suggestion}
                </Typography>
              )}
              <Typography
                variant="body2"
                sx={{ whiteSpace: 'pre-wrap' }}
              >
                {response.body}
              </Typography>
            </Paper>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default EmailAIAssistant; 