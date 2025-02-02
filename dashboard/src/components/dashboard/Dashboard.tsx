import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  useTheme,
  CircularProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  Psychology as AIIcon,
  CheckCircle as SuccessIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';

const Dashboard: React.FC = () => {
  const theme = useTheme();

  const stats = [
    {
      title: 'Total Emails',
      value: '0',
      icon: <EmailIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.primary.main,
    },
    {
      title: 'AI Responses',
      value: '0',
      icon: <AIIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.secondary.main,
    },
    {
      title: 'Success Rate',
      value: '0%',
      icon: <SuccessIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.success.main,
    },
    {
      title: 'Avg Response Time',
      value: '0s',
      icon: <TimerIcon sx={{ fontSize: 40 }} />,
      color: theme.palette.warning.main,
    },
  ];

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      <Grid container spacing={3}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Box
                    sx={{
                      p: 1.5,
                      borderRadius: 2,
                      display: 'flex',
                      bgcolor: `${stat.color}22`,
                      color: stat.color,
                    }}
                  >
                    {stat.icon}
                  </Box>
                </Box>
                <Typography variant="h4" component="div">
                  {stat.value}
                </Typography>
                <Typography
                  variant="subtitle2"
                  sx={{ color: theme.palette.text.secondary }}
                >
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4 }}>
        <Typography variant="h5" gutterBottom>
          Recent Activity
        </Typography>
        <Card>
          <CardContent>
            <Typography color="textSecondary">
              No recent activity to display
            </Typography>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default Dashboard; 