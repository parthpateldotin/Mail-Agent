import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  AlertTitle,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  Warning,
  Refresh,
  Timeline,
  Speed,
  Memory,
  CloudQueue,
} from '@mui/icons-material';

interface ServiceStatus {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  lastUpdate: Date;
  metrics: {
    requestCount: number;
    errorCount: number;
    averageResponseTime: number;
    successRate: number;
    cpuUsage: number;
    memoryUsage: number;
    activeConnections: number;
  };
  alerts?: Array<{
    level: 'warning' | 'error';
    message: string;
    timestamp: Date;
  }>;
}

const ServiceHealth: React.FC = () => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchServiceHealth = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/dashboard/services');
      const data = await response.json();
      setServices(data);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch service health data');
      console.error('Error fetching service health:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServiceHealth();
    const interval = setInterval(fetchServiceHealth, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'active':
        return 'success.main';
      case 'inactive':
        return 'warning.main';
      case 'error':
        return 'error.main';
      default:
        return 'grey.500';
    }
  };

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'active':
        return <CheckCircle color="success" />;
      case 'inactive':
        return <Warning color="warning" />;
      case 'error':
        return <Error color="error" />;
      default:
        return null;
    }
  };

  const renderServiceCard = (service: ServiceStatus) => (
    <Grid item xs={12} md={6} lg={4} key={service.id}>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={1}>
              <CloudQueue />
              <Typography variant="h6">{service.name}</Typography>
            </Box>
            {getStatusIcon(service.status)}
          </Box>

          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Performance Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Tooltip title="CPU Usage">
                  <Box>
                    <Typography variant="caption" display="block">
                      CPU: {service.metrics.cpuUsage}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={service.metrics.cpuUsage}
                      color={service.metrics.cpuUsage > 80 ? 'error' : 'primary'}
                    />
                  </Box>
                </Tooltip>
              </Grid>
              <Grid item xs={6}>
                <Tooltip title="Memory Usage">
                  <Box>
                    <Typography variant="caption" display="block">
                      Memory: {service.metrics.memoryUsage}%
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={service.metrics.memoryUsage}
                      color={service.metrics.memoryUsage > 80 ? 'error' : 'primary'}
                    />
                  </Box>
                </Tooltip>
              </Grid>
            </Grid>
          </Box>

          <Box mb={2}>
            <Typography variant="subtitle2" color="textSecondary" gutterBottom>
              Request Metrics
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Success Rate: {service.metrics.successRate.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={6}>
                <Typography variant="body2">
                  Avg Response: {service.metrics.averageResponseTime.toFixed(1)}ms
                </Typography>
              </Grid>
            </Grid>
          </Box>

          {service.alerts && service.alerts.length > 0 && (
            <Box mt={2}>
              {service.alerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.level}
                  sx={{ mb: 1 }}
                >
                  <AlertTitle>{alert.level === 'error' ? 'Error' : 'Warning'}</AlertTitle>
                  {alert.message}
                </Alert>
              ))}
            </Box>
          )}

          <Box mt={2} display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="caption" color="textSecondary">
              Last Update: {new Date(service.lastUpdate).toLocaleString()}
            </Typography>
            <Typography variant="caption" color="textSecondary">
              Active Connections: {service.metrics.activeConnections}
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Grid>
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Service Health Monitor</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {lastUpdate && (
            <Typography variant="caption" color="textSecondary">
              Last Updated: {lastUpdate.toLocaleString()}
            </Typography>
          )}
          <IconButton onClick={fetchServiceHealth} size="small">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {services.map(renderServiceCard)}
      </Grid>
    </Box>
  );
};

export default ServiceHealth; 