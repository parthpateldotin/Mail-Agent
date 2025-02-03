import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  List,
  ListItem,
  ListItemText,
  Typography,
  IconButton,
  Fab,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  CircularProgress,
  Card,
  LinearProgress,
  Chip,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
  AttachFile as AttachFileIcon,
  Reply as ReplyIcon,
  Psychology as AIIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Pending as PendingIcon,
} from '@mui/icons-material';

interface Email {
  id: number;
  from: string;
  subject: string;
  preview: string;
  timestamp: string;
  isStarred: boolean;
  isRead: boolean;
  body?: string;
  status?: 'processing' | 'analyzed' | 'responded' | 'error';
  analysis?: {
    sentiment: string;
    priority: string;
    category: string;
    summary: string;
  };
  error?: string;
  retryCount?: number;
}

interface ProcessingStep {
  id: string;
  label: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  details?: string;
  timestamp?: string;
  error?: string;
}

// Mock data - replace with actual API data
const mockEmails: Email[] = [
  {
    id: 1,
    from: 'john.doe@example.com',
    subject: 'Project Update',
    preview: 'Here are the latest updates on the project...',
    timestamp: '10:30 AM',
    isStarred: false,
    isRead: false,
    body: `Hi Team,

I wanted to provide an update on the project timeline and budget:

1. Timeline Extension:
   - Current phase needs 2 additional weeks
   - This impacts the overall delivery date
   - New completion date: End of next month

2. Budget Adjustment:
   - 15% increase required
   - Additional costs for mobile development
   - New requirements from stakeholders

3. Mobile Support:
   - Added requirement for iOS and Android
   - Need to plan development sprints
   - Testing resources required

Please review these changes and let me know your thoughts.

Best regards,
John`,
  },
  {
    id: 2,
    from: 'jane.smith@example.com',
    subject: 'Meeting Tomorrow',
    preview: 'Let\'s discuss the upcoming presentation...',
    timestamp: 'Yesterday',
    isStarred: true,
    isRead: true,
    body: 'Meeting details...',
  },
];

const EmailDashboard: React.FC = () => {
  const [emails, setEmails] = useState<Email[]>(mockEmails);
  const [selectedEmail, setSelectedEmail] = useState<Email | null>(null);
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [showComposeDialog, setShowComposeDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [composeData, setComposeData] = useState({
    to: '',
    subject: '',
    body: '',
  });

  useEffect(() => {
    if (selectedEmail?.status === 'processing') {
      simulateEmailProcessing(selectedEmail.id);
    }
  }, [selectedEmail]);

  const simulateEmailProcessing = async (emailId: number) => {
    const steps: ProcessingStep[] = [
      { id: 'receive', label: 'Email Reception', status: 'pending' },
      { id: 'validate', label: 'Validation & Filtering', status: 'pending' },
      { id: 'analyze', label: 'AI Analysis', status: 'pending' },
      { id: 'categorize', label: 'Categorization', status: 'pending' },
      { id: 'response', label: 'Response Generation', status: 'pending' },
      { id: 'review', label: 'Quality Check', status: 'pending' },
      { id: 'send', label: 'Response Delivery', status: 'pending' },
    ];

    setProcessingSteps(steps);
    let currentStep = 0;

    try {
      const processInterval = setInterval(async () => {
        if (currentStep < steps.length) {
          steps[currentStep].status = 'processing';
          
          if (currentStep > 0) {
            steps[currentStep - 1].status = 'completed';
            steps[currentStep - 1].timestamp = new Date().toLocaleTimeString();
          }

          // Simulate API call for each step
          try {
            await processStep(steps[currentStep], emailId);
            setProcessingSteps([...steps]);
            currentStep++;
          } catch (error) {
            clearInterval(processInterval);
            handleProcessingError(error, currentStep, steps, emailId);
          }
        } else {
          clearInterval(processInterval);
          completeProcessing(steps, emailId);
        }
      }, 2000);

      return () => clearInterval(processInterval);
    } catch (error) {
      handleProcessingError(error, currentStep, steps, emailId);
    }
  };

  const processStep = async (step: ProcessingStep, emailId: number) => {
    // Simulate API call for each step
    const response = await fetch(`/api/process/${step.id}/${emailId}`);
    if (!response.ok) {
      throw new Error(`Failed to process step ${step.id}`);
    }
    return response.json();
  };

  const handleProcessingError = (error: any, step: number, steps: ProcessingStep[], emailId: number) => {
    steps[step].status = 'error';
    steps[step].error = error.message;
    setProcessingSteps([...steps]);
    
    setEmails(prevEmails =>
      prevEmails.map(email =>
        email.id === emailId
          ? {
              ...email,
              status: 'error',
              error: error.message,
              retryCount: (email.retryCount || 0) + 1
            }
          : email
      )
    );

    setError(`Processing failed at ${steps[step].label}: ${error.message}`);
  };

  const completeProcessing = (steps: ProcessingStep[], emailId: number) => {
    steps[steps.length - 1].status = 'completed';
    steps[steps.length - 1].timestamp = new Date().toLocaleTimeString();
    setProcessingSteps([...steps]);
    
    setEmails(prevEmails =>
      prevEmails.map(email =>
        email.id === emailId
          ? {
              ...email,
              status: 'analyzed',
              analysis: {
                sentiment: 'Positive',
                priority: 'High',
                category: 'Support',
                summary: 'Customer requesting assistance with product setup.',
              },
            }
          : email
      )
    );
  };

  const retryProcessing = async (emailId: number) => {
    setError(null);
    const email = emails.find(e => e.id === emailId);
    if (email && email.retryCount && email.retryCount < 3) {
      setEmails(prevEmails =>
        prevEmails.map(e =>
          e.id === emailId
            ? { ...e, status: 'processing', error: undefined }
            : e
        )
      );
      await simulateEmailProcessing(emailId);
    } else {
      setError('Maximum retry attempts reached. Please contact support.');
    }
  };

  const handleStarEmail = (emailId: number) => {
    setEmails(emails.map(email => 
      email.id === emailId 
        ? { ...email, isStarred: !email.isStarred }
        : email
    ));
  };

  const handleDeleteEmail = (emailId: number) => {
    setEmails(emails.filter(email => email.id !== emailId));
    if (selectedEmail?.id === emailId) {
      setSelectedEmail(null);
      setShowEmailDialog(false);
    }
  };

  const handleEmailClick = (email: Email) => {
    setSelectedEmail(email);
    setShowEmailDialog(true);
    if (!email.isRead) {
      setEmails(emails.map(e => 
        e.id === email.id 
          ? { ...e, isRead: true }
          : e
      ));
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1500);
  };

  const handleCompose = () => {
    setShowComposeDialog(true);
  };

  const handleSendEmail = async () => {
    console.log('Sending email:', composeData);
    setShowComposeDialog(false);
    setComposeData({ to: '', subject: '', body: '' });
  };

  const getStepIcon = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckIcon color="success" />;
      case 'processing':
        return <CircularProgress size={20} />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <PendingIcon color="disabled" />;
    }
  };

  const renderProcessingSteps = () => (
    <Box sx={{ mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Processing Steps
      </Typography>
      <List>
        {processingSteps.map((step, index) => (
          <React.Fragment key={step.id}>
            {index > 0 && <Divider />}
            <ListItem>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                {getStepIcon(step.status)}
                <Box sx={{ ml: 2, flex: 1 }}>
                  <Typography variant="subtitle2">{step.label}</Typography>
                  {step.details && (
                    <Typography variant="body2" color="text.secondary">
                      {step.details}
                    </Typography>
                  )}
                </Box>
                {step.timestamp && (
                  <Typography variant="caption" color="text.secondary">
                    {step.timestamp}
                  </Typography>
                )}
              </Box>
            </ListItem>
          </React.Fragment>
        ))}
      </List>
    </Box>
  );

  const renderAnalysis = () => {
    if (!selectedEmail?.analysis) return null;

    return (
      <Box sx={{ mt: 2 }}>
        <Typography variant="h6" gutterBottom>
          AI Analysis Results
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Card sx={{ p: 2, flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Sentiment
            </Typography>
            <Typography variant="h6">{selectedEmail.analysis.sentiment}</Typography>
          </Card>
          <Card sx={{ p: 2, flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Priority
            </Typography>
            <Typography variant="h6">{selectedEmail.analysis.priority}</Typography>
          </Card>
          <Card sx={{ p: 2, flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle2" color="text.secondary">
              Category
            </Typography>
            <Typography variant="h6">{selectedEmail.analysis.category}</Typography>
          </Card>
        </Box>
        <Card sx={{ p: 2, mt: 2 }}>
          <Typography variant="subtitle2" color="text.secondary">
            Summary
          </Typography>
          <Typography variant="body1">{selectedEmail.analysis.summary}</Typography>
        </Card>
      </Box>
    );
  };

  const renderError = () => {
    if (!error) return null;
    return (
      <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      {renderError()}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5">
          Email Processing Dashboard
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <IconButton onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? <CircularProgress size={24} /> : <RefreshIcon />}
          </IconButton>
          <Button
            variant="contained"
            startIcon={<EditIcon />}
            onClick={handleCompose}
          >
            Compose
          </Button>
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, flex: 1 }}>
        <Paper sx={{ flex: 1, overflow: 'auto' }}>
          <List>
            {emails.map((email, index) => (
              <React.Fragment key={email.id}>
                {index > 0 && <Divider />}
                <ListItem
                  sx={{
                    bgcolor: email.isRead ? 'inherit' : 'action.hover',
                    '&:hover': {
                      bgcolor: 'action.hover',
                      cursor: 'pointer',
                    },
                  }}
                  onClick={() => handleEmailClick(email)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography
                          variant="subtitle2"
                          sx={{
                            fontWeight: email.isRead ? 'normal' : 'bold',
                          }}
                        >
                          {email.from}
                        </Typography>
                        {email.status && (
                          <Chip
                            size="small"
                            label={email.status}
                            color={
                              email.status === 'analyzed'
                                ? 'success'
                                : email.status === 'processing'
                                ? 'warning'
                                : 'error'
                            }
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2">{email.subject}</Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {email.preview}
                        </Typography>
                      </Box>
                    }
                  />
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      {email.timestamp}
                    </Typography>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStarEmail(email.id);
                      }}
                    >
                      {email.isStarred ? (
                        <StarIcon color="primary" />
                      ) : (
                        <StarBorderIcon />
                      )}
                    </IconButton>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEmail(email.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </Paper>

        {selectedEmail && (
          <Paper sx={{ flex: 1, p: 3, overflow: 'auto' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="h6">Email Details</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="outlined"
                  startIcon={<AIIcon />}
                  onClick={() => {
                    setEmails(prevEmails =>
                      prevEmails.map(email =>
                        email.id === selectedEmail.id
                          ? { ...email, status: 'processing' }
                          : email
                      )
                    );
                  }}
                >
                  Analyze
                </Button>
                <Button
                  variant="contained"
                  startIcon={<ReplyIcon />}
                >
                  Reply
                </Button>
              </Box>
            </Box>

            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" color="text.secondary">
                From
              </Typography>
              <Typography>{selectedEmail.from}</Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                Subject
              </Typography>
              <Typography>{selectedEmail.subject}</Typography>
            </Box>

            <Typography
              variant="body1"
              sx={{
                whiteSpace: 'pre-wrap',
                mb: 3,
              }}
            >
              {selectedEmail.body}
            </Typography>

            {selectedEmail.status === 'processing' && renderProcessingSteps()}
            {renderAnalysis()}
          </Paper>
        )}
      </Box>

      <Dialog
        open={showComposeDialog}
        onClose={() => setShowComposeDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Compose Email</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="To"
            margin="normal"
            value={composeData.to}
            onChange={(e) =>
              setComposeData({ ...composeData, to: e.target.value })
            }
          />
          <TextField
            fullWidth
            label="Subject"
            margin="normal"
            value={composeData.subject}
            onChange={(e) =>
              setComposeData({ ...composeData, subject: e.target.value })
            }
          />
          <TextField
            fullWidth
            label="Message"
            margin="normal"
            multiline
            rows={6}
            value={composeData.body}
            onChange={(e) =>
              setComposeData({ ...composeData, body: e.target.value })
            }
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowComposeDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSendEmail}
            startIcon={<SendIcon />}
          >
            Send
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default EmailDashboard; 