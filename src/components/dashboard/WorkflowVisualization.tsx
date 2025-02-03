import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Button,
  Paper,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Pending,
  ArrowForward,
  Refresh,
} from '@mui/icons-material';

interface WorkflowStep {
  id: string;
  label: string;
  description: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  details?: string[];
  timestamp?: string;
  error?: string;
}

interface HandshakeEvent {
  id: string;
  type: string;
  source: string;
  target: string;
  status: string;
  timestamp: Date;
  data?: any;
  error?: string;
}

const WorkflowVisualization: React.FC = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [handshakes, setHandshakes] = useState<HandshakeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkflowData = async () => {
    try {
      const [stepsResponse, handshakesResponse] = await Promise.all([
        fetch('http://localhost:3001/api/dashboard/workflow'),
        fetch('http://localhost:3001/api/dashboard/handshakes'),
      ]);

      const stepsData = await stepsResponse.json();
      const handshakesData = await handshakesResponse.json();

      setSteps(stepsData);
      setHandshakes(handshakesData);
      setError(null);
    } catch (err) {
      setError('Failed to fetch workflow data');
      console.error('Error fetching workflow data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflowData();
    const interval = setInterval(fetchWorkflowData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'processing':
        return <CircularProgress size={20} />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Pending color="disabled" />;
    }
  };

  const renderHandshakeFlow = () => (
    <Card sx={{ mt: 3 }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Handshake Flow</Typography>
          <Button
            startIcon={<Refresh />}
            onClick={fetchWorkflowData}
            size="small"
          >
            Refresh
          </Button>
        </Box>
        <Box display="flex" flexDirection="column" gap={2}>
          {handshakes.map((handshake) => (
            <Paper key={handshake.id} sx={{ p: 2 }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="subtitle2">{handshake.source}</Typography>
                <ArrowForward color="action" />
                <Typography variant="subtitle2">{handshake.target}</Typography>
                <Box flexGrow={1} />
                {handshake.status === 'completed' && (
                  <CheckCircle color="success" />
                )}
                {handshake.status === 'failed' && (
                  <Error color="error" />
                )}
                {handshake.status === 'initiated' && (
                  <CircularProgress size={20} />
                )}
              </Box>
              <Typography variant="caption" color="textSecondary">
                {new Date(handshake.timestamp).toLocaleString()}
              </Typography>
              {handshake.error && (
                <Typography variant="body2" color="error" mt={1}>
                  Error: {handshake.error}
                </Typography>
              )}
            </Paper>
          ))}
        </Box>
      </CardContent>
    </Card>
  );

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Email Processing Workflow
          </Typography>
          <Stepper activeStep={activeStep} orientation="vertical">
            {steps.map((step, index) => (
              <Step key={step.id}>
                <StepLabel
                  StepIconComponent={() => getStepIcon(step.status)}
                  optional={
                    step.timestamp && (
                      <Typography variant="caption">
                        {new Date(step.timestamp).toLocaleString()}
                      </Typography>
                    )
                  }
                >
                  {step.label}
                </StepLabel>
                <StepContent>
                  <Typography>{step.description}</Typography>
                  {step.details && (
                    <Box mt={1}>
                      {step.details.map((detail, i) => (
                        <Typography key={i} variant="body2" color="textSecondary">
                          • {detail}
                        </Typography>
                      ))}
                    </Box>
                  )}
                  {step.error && (
                    <Typography color="error" mt={1}>
                      Error: {step.error}
                    </Typography>
                  )}
                </StepContent>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>
      {renderHandshakeFlow()}
    </Box>
  );
};

export default WorkflowVisualization; 