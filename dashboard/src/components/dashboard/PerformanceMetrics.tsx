import React, { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  CircularProgress,
  IconButton,
  useTheme,
} from '@mui/material';
import { Refresh } from '@mui/icons-material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface PerformanceData {
  timestamp: number;
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  requestsPerSecond: number;
  averageResponseTime: number;
  errorRate: number;
}

interface ChartData extends PerformanceData {
  formattedTime: string;
}

const PerformanceMetrics: React.FC = () => {
  const theme = useTheme();
  const [performanceData, setPerformanceData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const fetchPerformanceData = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/dashboard/performance');
      const data: PerformanceData[] = await response.json();
      
      const formattedData: ChartData[] = data.map(item => ({
        ...item,
        formattedTime: formatTimestamp(item.timestamp),
      }));
      
      setPerformanceData(formattedData);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch performance data');
      console.error('Error fetching performance data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPerformanceData();
    const interval = setInterval(fetchPerformanceData, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const renderChart = (
    title: string,
    dataKey: keyof PerformanceData,
    color: string,
    unit: string,
    height: number = 200
  ) => (
    <Card sx={{ mb: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <ResponsiveContainer width="100%" height={height}>
          <LineChart data={performanceData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="formattedTime"
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              unit={unit}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
              }}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              dot={false}
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">System Performance</Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {lastUpdate && (
            <Typography variant="caption" color="textSecondary">
              Last Updated: {lastUpdate.toLocaleString()}
            </Typography>
          )}
          <IconButton onClick={fetchPerformanceData} size="small">
            <Refresh />
          </IconButton>
        </Box>
      </Box>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          {renderChart(
            'CPU Usage',
            'cpuUsage',
            theme.palette.primary.main,
            '%'
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderChart(
            'Memory Usage',
            'memoryUsage',
            theme.palette.secondary.main,
            '%'
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderChart(
            'Active Connections',
            'activeConnections',
            theme.palette.success.main,
            ''
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderChart(
            'Requests per Second',
            'requestsPerSecond',
            theme.palette.info.main,
            '/s'
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderChart(
            'Average Response Time',
            'averageResponseTime',
            theme.palette.warning.main,
            'ms'
          )}
        </Grid>
        <Grid item xs={12} md={6}>
          {renderChart(
            'Error Rate',
            'errorRate',
            theme.palette.error.main,
            '%'
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default PerformanceMetrics; 