import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  Typography,
  useTheme,
  CircularProgress,
  Tooltip,
  IconButton,
  Paper,
} from '@mui/material';
import {
  Email as EmailIcon,
  Psychology as AIIcon,
  Send as SendIcon,
  Settings as SettingsIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  AdminPanelSettings as AdminIcon,
  FilterAlt as FilterIcon,
  Category as CategoryIcon,
  AccessTime as TimeIcon,
  Assignment as TaskIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { emailProcessingService } from '../../services/email/emailProcessingService';

interface WorkflowStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'idle' | 'processing' | 'success' | 'error';
  position: { x: number; y: number };
  details?: string[];
}

const WorkflowDashboard: React.FC = () => {
  const theme = useTheme();
  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: 'receive',
      title: 'Email Reception',
      description: 'Monitor inbox for new emails',
      icon: <EmailIcon />,
      status: 'idle',
      position: { x: 50, y: 100 },
      details: [
        'Connect to IMAP server',
        'Check for new unread emails',
        'Download email content',
        'Parse email metadata'
      ]
    },
    {
      id: 'filter',
      title: 'Initial Processing',
      description: 'Filter and categorize emails',
      icon: <FilterIcon />,
      status: 'idle',
      position: { x: 250, y: 100 },
      details: [
        'Check sender whitelist/blacklist',
        'Verify email format',
        'Extract attachments',
        'Prepare for analysis'
      ]
    },
    {
      id: 'analyze',
      title: 'AI Analysis',
      description: 'Deep content analysis',
      icon: <AIIcon />,
      status: 'idle',
      position: { x: 450, y: 100 },
      details: [
        'Sentiment analysis',
        'Priority classification',
        'Topic extraction',
        'Intent recognition'
      ]
    },
    {
      id: 'categorize',
      title: 'Categorization',
      description: 'Assign categories and tags',
      icon: <CategoryIcon />,
      status: 'idle',
      position: { x: 650, y: 100 },
      details: [
        'Apply business rules',
        'Tag with categories',
        'Set priority level',
        'Route to appropriate queue'
      ]
    },
    {
      id: 'response',
      title: 'Response Generation',
      description: 'Create AI-powered response',
      icon: <TaskIcon />,
      status: 'idle',
      position: { x: 250, y: 300 },
      details: [
        'Template selection',
        'Context incorporation',
        'Response generation',
        'Quality check'
      ]
    },
    {
      id: 'review',
      title: 'Review & Approval',
      description: 'Quality check and approval',
      icon: <AIIcon />,
      status: 'idle',
      position: { x: 450, y: 300 },
      details: [
        'Content verification',
        'Tone analysis',
        'Compliance check',
        'Final approval'
      ]
    },
    {
      id: 'send',
      title: 'Response Delivery',
      description: 'Send via SMTP',
      icon: <SendIcon />,
      status: 'idle',
      position: { x: 650, y: 300 },
      details: [
        'Format email',
        'Add attachments',
        'Send via SMTP',
        'Update status'
      ]
    },
    {
      id: 'admin',
      title: 'Admin Summary',
      description: 'Report generation',
      icon: <AdminIcon />,
      status: 'idle',
      position: { x: 850, y: 200 },
      details: [
        'Compile statistics',
        'Generate summary',
        'Send to admin',
        'Archive data'
      ]
    },
  ]);

  const [agentStatus, setAgentStatus] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedStep, setSelectedStep] = useState<string | null>(null);

  useEffect(() => {
    checkAgentStatus();
    const interval = setInterval(checkAgentStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  const checkAgentStatus = async () => {
    try {
      const status = await emailProcessingService.getAgentStatus();
      setAgentStatus(status);
      
      // Simulate workflow activity
      if (status) {
        simulateWorkflow();
      }
    } catch (error) {
      console.error('Failed to check agent status:', error);
    }
  };

  const simulateWorkflow = () => {
    let currentStep = 0;
    const workflow = [...steps];
    
    const interval = setInterval(() => {
      if (currentStep < workflow.length) {
        workflow[currentStep].status = 'processing';
        if (currentStep > 0) {
          workflow[currentStep - 1].status = 'success';
        }
        setSteps([...workflow]);
        currentStep++;
      } else {
        clearInterval(interval);
        workflow[workflow.length - 1].status = 'success';
        setSteps([...workflow]);
      }
    }, 2000);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await checkAgentStatus();
    setIsRefreshing(false);
  };

  const getStatusColor = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'processing':
        return theme.palette.warning.main;
      case 'success':
        return theme.palette.success.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const renderConnectingLines = () => {
    const connections = [
      { from: 'receive', to: 'filter' },
      { from: 'filter', to: 'analyze' },
      { from: 'analyze', to: 'categorize' },
      { from: 'categorize', to: 'admin' },
      { from: 'filter', to: 'response' },
      { from: 'response', to: 'review' },
      { from: 'review', to: 'send' },
      { from: 'send', to: 'admin' },
    ];

    return connections.map(({ from, to }) => {
      const fromStep = steps.find(s => s.id === from);
      const toStep = steps.find(s => s.id === to);
      
      if (!fromStep || !toStep) return null;

      const fromX = fromStep.position.x + 100;
      const fromY = fromStep.position.y + 50;
      const toX = toStep.position.x;
      const toY = toStep.position.y + 50;

      return (
        <motion.path
          key={`line-${from}-${to}`}
          d={`M ${fromX} ${fromY} L ${toX} ${toY}`}
          stroke={theme.palette.primary.main}
          strokeWidth={2}
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, repeat: Infinity }}
        />
      );
    });
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5">Email Processing Workflow</Typography>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <Typography>
            Agent Status: {agentStatus ? 'Running' : 'Stopped'}
          </Typography>
          <IconButton onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <CircularProgress size={24} />
            ) : (
              <RefreshIcon />
            )}
          </IconButton>
        </Box>
      </Box>

      <Paper 
        sx={{ 
          p: 3, 
          position: 'relative', 
          minHeight: 600,
          backgroundColor: theme.palette.background.default 
        }}
      >
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}
        >
          {renderConnectingLines()}
        </svg>

        {steps.map((step) => (
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            style={{
              position: 'absolute',
              left: step.position.x,
              top: step.position.y,
            }}
          >
            <Card
              sx={{
                width: 200,
                p: 2,
                cursor: 'pointer',
                transition: 'all 0.3s',
                transform: selectedStep === step.id ? 'scale(1.05)' : 'none',
                '&:hover': {
                  transform: 'scale(1.05)',
                  boxShadow: 6,
                }
              }}
              onClick={() => setSelectedStep(step.id === selectedStep ? null : step.id)}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                {React.cloneElement(step.icon as React.ReactElement, {
                  sx: { color: getStatusColor(step.status), mr: 1 }
                })}
                <Typography variant="subtitle1" sx={{ flex: 1 }}>
                  {step.title}
                </Typography>
                {step.status === 'processing' && (
                  <CircularProgress size={20} sx={{ ml: 1 }} />
                )}
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {step.description}
              </Typography>

              {selectedStep === step.id && step.details && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  transition={{ duration: 0.3 }}
                >
                  <Box sx={{ mt: 2, pl: 2 }}>
                    {step.details.map((detail, index) => (
                      <Typography
                        key={index}
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          mb: 0.5,
                          '&:before': {
                            content: '"•"',
                            mr: 1,
                            color: theme.palette.primary.main,
                          },
                        }}
                      >
                        {detail}
                      </Typography>
                    ))}
                  </Box>
                </motion.div>
              )}
            </Card>
          </motion.div>
        ))}
      </Paper>

      <Box sx={{ mt: 3 }}>
        <Typography variant="h6" gutterBottom>
          Processing Statistics
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Card sx={{ p: 2, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <EmailIcon sx={{ mr: 1, color: theme.palette.primary.main }} />
              <Typography variant="subtitle2" color="textSecondary">
                Processed Emails
              </Typography>
            </Box>
            <Typography variant="h4">247</Typography>
          </Card>
          <Card sx={{ p: 2, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <TimeIcon sx={{ mr: 1, color: theme.palette.success.main }} />
              <Typography variant="subtitle2" color="textSecondary">
                Average Processing Time
              </Typography>
            </Box>
            <Typography variant="h4">2.3s</Typography>
          </Card>
          <Card sx={{ p: 2, flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SuccessIcon sx={{ mr: 1, color: theme.palette.info.main }} />
              <Typography variant="subtitle2" color="textSecondary">
                Success Rate
              </Typography>
            </Box>
            <Typography variant="h4">98.5%</Typography>
          </Card>
        </Box>
      </Box>
    </Box>
  );
};

export default WorkflowDashboard; 