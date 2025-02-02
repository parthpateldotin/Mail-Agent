import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  useTheme,
} from '@mui/material';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface EmailVolume {
  name: string;
  sent: number;
  received: number;
}

interface ResponseTime {
  name: string;
  time: number;
}

interface EmailCategory {
  name: string;
  value: number;
}

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
}

// Mock data - replace with actual API data
const emailVolumeData: EmailVolume[] = [
  { name: 'Mon', sent: 45, received: 78 },
  { name: 'Tue', sent: 52, received: 71 },
  { name: 'Wed', sent: 48, received: 80 },
  { name: 'Thu', sent: 61, received: 65 },
  { name: 'Fri', sent: 55, received: 58 },
  { name: 'Sat', sent: 28, received: 42 },
  { name: 'Sun', sent: 22, received: 35 },
];

const responseTimeData: ResponseTime[] = [
  { name: 'Mon', time: 25 },
  { name: 'Tue', time: 18 },
  { name: 'Wed', time: 22 },
  { name: 'Thu', time: 15 },
  { name: 'Fri', time: 20 },
  { name: 'Sat', time: 30 },
  { name: 'Sun', time: 28 },
];

const emailCategoryData: EmailCategory[] = [
  { name: 'Important', value: 35 },
  { name: 'Work', value: 45 },
  { name: 'Personal', value: 20 },
  { name: 'Promotions', value: 15 },
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const StatCard: React.FC<StatCardProps> = ({ title, value, description }) => (
  <Card>
    <CardContent>
      <Typography color="textSecondary" gutterBottom>
        {title}
      </Typography>
      <Typography variant="h4" component="div">
        {value}
      </Typography>
      {description && (
        <Typography variant="body2" color="textSecondary">
          {description}
        </Typography>
      )}
    </CardContent>
  </Card>
);

const Analytics: React.FC = () => {
  const theme = useTheme();

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Grid container spacing={3}>
        {/* Stat Cards */}
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Emails"
            value="1,234"
            description="Last 30 days"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Average Response Time"
            value="22m"
            description="Last 7 days"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="AI-Assisted Replies"
            value="45%"
            description="Of total replies"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Storage Used"
            value="2.4GB"
            description="Of 15GB total"
          />
        </Grid>

        {/* Email Volume Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Email Volume
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={emailVolumeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="sent" fill={theme.palette.primary.main} />
                    <Bar dataKey="received" fill={theme.palette.secondary.main} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Email Categories Chart */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Email Categories
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={emailCategoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      fill="#8884d8"
                      paddingAngle={5}
                      dataKey="value"
                      label
                    >
                      {emailCategoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Response Time Chart */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Average Response Time
              </Typography>
              <Box sx={{ height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={responseTimeData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="time"
                      stroke={theme.palette.primary.main}
                      activeDot={{ r: 8 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics; 