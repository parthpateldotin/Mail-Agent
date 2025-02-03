import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  Chip,
  useTheme,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Timeline,
  Email,
  Speed,
  CloudQueue,
  Refresh,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material';

interface MetricsData {
  email: {
    totalProcessed: number;
    successfulResponses: number;
    failedResponses: number;
    averageResponseTime: number;
    responseRate: number;
    categories: Record<string, number>;
    priorities: Record<string, number>;
    hourlyDistribution: Record<string, number>;
  };
  services: Record<string, {
    status: 'active' | 'inactive' | 'error';
    lastUpdate: Date;
    metrics: {
      requestCount: number;
      errorCount: number;
      averageResponseTime: number;
      successRate: number;
    };
  }>;
  handshakes: {
    total: number;
    successful: number;
    failed: number;
    averageTime: number;
    recentHandshakes: Array<{
      id: string;
      type: string;
      status: string;
      timestamp: Date;
    }>;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
    requestsPerMinute: number;
  };
}

const MetricsDashboard: React.FC = () => {
  const theme = useTheme();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMetrics = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/dashboard/metrics');
      const data = await response.json();
      setMetrics(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch metrics');
      console.error('Error fetching metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: 'active' | 'inactive' | 'error') => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'inactive':
        return theme.palette.warning.main;
      case 'error':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const renderEmailMetrics = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            <Email sx={{ mr: 1 }} /> Email Processing
          </Typography>
          <Chip
            label={`${metrics?.email.responseRate.toFixed(1)}% Success Rate`}
            color="success"
          />
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Total Processed
            </Typography>
            <Typography variant="h4">{metrics?.email.totalProcessed}</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Successful
            </Typography>
            <Typography variant="h4" color="success.main">
              {metrics?.email.successfulResponses}
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Failed
            </Typography>
            <Typography variant="h4" color="error.main">
              {metrics?.email.failedResponses}
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Avg Response Time
            </Typography>
            <Typography variant="h4">
              {metrics?.email.averageResponseTime.toFixed(1)}s
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderServiceStatus = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            <CloudQueue sx={{ mr: 1 }} /> Service Status
          </Typography>
          <IconButton onClick={fetchMetrics} size="small">
            <Refresh />
          </IconButton>
        </Box>
        <Grid container spacing={2}>
          {metrics && Object.entries(metrics.services).map(([service, data]) => (
            <Grid item xs={4} key={service}>
              <Box
                p={2}
                border={1}
                borderColor="divider"
                borderRadius={1}
                display="flex"
                alignItems="center"
              >
                {data.status === 'active' && <CheckCircle color="success" />}
                {data.status === 'inactive' && <Warning color="warning" />}
                {data.status === 'error' && <Error color="error" />}
                <Box ml={1}>
                  <Typography variant="subtitle2">{service}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    Success Rate: {data.metrics.successRate.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );

  const renderHandshakeMetrics = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            <Timeline sx={{ mr: 1 }} /> Handshake Metrics
          </Typography>
          <Chip
            label={`${metrics?.handshakes.successful} Successful`}
            color="success"
          />
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Total Handshakes
            </Typography>
            <Typography variant="h4">{metrics?.handshakes.total}</Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Success Rate
            </Typography>
            <Typography variant="h4">
              {((metrics?.handshakes.successful || 0) / (metrics?.handshakes.total || 1) * 100).toFixed(1)}%
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Failed
            </Typography>
            <Typography variant="h4" color="error.main">
              {metrics?.handshakes.failed}
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Avg Time
            </Typography>
            <Typography variant="h4">
              {metrics?.handshakes.averageTime.toFixed(1)}ms
            </Typography>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );

  const renderPerformanceMetrics = () => (
    <Card>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6" component="div">
            <Speed sx={{ mr: 1 }} /> System Performance
          </Typography>
        </Box>
        <Grid container spacing={2}>
          <Grid item xs={3}>
            <Tooltip title="CPU Usage">
              <Box textAlign="center">
                <CircularProgress
                  variant="determinate"
                  value={metrics?.performance.cpuUsage || 0}
                  size={80}
                />
                <Typography variant="body2" mt={1}>
                  CPU: {metrics?.performance.cpuUsage.toFixed(1)}%
                </Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={3}>
            <Tooltip title="Memory Usage">
              <Box textAlign="center">
                <CircularProgress
                  variant="determinate"
                  value={metrics?.performance.memoryUsage || 0}
                  size={80}
                  color="secondary"
                />
                <Typography variant="body2" mt={1}>
                  Memory: {metrics?.performance.memoryUsage.toFixed(1)}%
                </Typography>
              </Box>
            </Tooltip>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Active Connections
            </Typography>
            <Typography variant="h4">
              {metrics?.performance.activeConnections}
            </Typography>
          </Grid>
          <Grid item xs={3}>
            <Typography variant="subtitle2" color="textSecondary">
              Requests/min
            </Typography>
            <Typography variant="h4">
              {metrics?.performance.requestsPerMinute}
            </Typography>
          </Grid>
        </Grid>
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
      <Grid container spacing={3}>
        <Grid item xs={12}>
          {renderEmailMetrics()}
        </Grid>
        <Grid item xs={12}>
          {renderServiceStatus()}
        </Grid>
        <Grid item xs={12}>
          {renderHandshakeMetrics()}
        </Grid>
        <Grid item xs={12}>
          {renderPerformanceMetrics()}
        </Grid>
      </Grid>
    </Box>
  );
};

export default MetricsDashboard; 