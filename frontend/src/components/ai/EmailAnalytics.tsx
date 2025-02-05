import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider
} from '@mui/material';
import {
  Mood as PositiveIcon,
  MoodBad as NegativeIcon,
  SentimentNeutral as NeutralIcon,
  Category as CategoryIcon,
  Assignment as TaskIcon,
  Language as LanguageIcon,
  Report as SpamIcon
} from '@mui/icons-material';

export interface EmailAnalytics {
  sentiment: {
    positive: number;
    negative: number;
    neutral: number;
  };
  categories: string[];
  actionItems: string[];
  language: string;
  spamScore: number;
}

export interface EmailAnalyticsProps {
  analytics: EmailAnalytics;
  loading?: boolean;
}

const SentimentBar: React.FC<{ sentiment: EmailAnalytics['sentiment'] }> = ({
  sentiment
}) => {
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const positivePercent = (sentiment.positive / total) * 100;
  const negativePercent = (sentiment.negative / total) * 100;
  const neutralPercent = (sentiment.neutral / total) * 100;

  return (
    <Box sx={{ width: '100%', mb: 1 }}>
      <Box sx={{ display: 'flex', mb: 0.5 }}>
        <Box sx={{ flex: 1 }}>
          <Typography variant="caption" color="success.main">
            Positive: {positivePercent.toFixed(1)}%
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Neutral: {neutralPercent.toFixed(1)}%
          </Typography>
        </Box>
        <Box sx={{ flex: 1, textAlign: 'right' }}>
          <Typography variant="caption" color="error.main">
            Negative: {negativePercent.toFixed(1)}%
          </Typography>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', height: 8, borderRadius: 1, overflow: 'hidden' }}>
        <Box
          sx={{
            width: `${positivePercent}%`,
            bgcolor: 'success.main'
          }}
        />
        <Box
          sx={{
            width: `${neutralPercent}%`,
            bgcolor: 'grey.400'
          }}
        />
        <Box
          sx={{
            width: `${negativePercent}%`,
            bgcolor: 'error.main'
          }}
        />
      </Box>
    </Box>
  );
};

export const EmailAnalytics: React.FC<EmailAnalyticsProps> = ({
  analytics,
  loading = false
}) => {
  if (loading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  const spamScoreColor =
    analytics.spamScore < 0.3
      ? 'success.main'
      : analytics.spamScore < 0.7
      ? 'warning.main'
      : 'error.main';

  return (
    <Box sx={{ width: '100%' }}>
      <Typography variant="h6" gutterBottom>
        Email Analytics
      </Typography>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Sentiment Analysis */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Sentiment Analysis
            </Typography>
            <SentimentBar sentiment={analytics.sentiment} />
          </CardContent>
        </Card>

        {/* Categories */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Categories
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {analytics.categories.map((category, index) => (
                <Chip
                  key={index}
                  label={category}
                  size="small"
                  icon={<CategoryIcon />}
                />
              ))}
            </Box>
          </CardContent>
        </Card>

        {/* Action Items */}
        <Card variant="outlined">
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Action Items
            </Typography>
            <List dense disablePadding>
              {analytics.actionItems.map((item, index) => (
                <ListItem key={index} disablePadding sx={{ mb: 1 }}>
                  <ListItemIcon sx={{ minWidth: 36 }}>
                    <TaskIcon color="primary" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary={item} />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>

        {/* Language and Spam Score */}
        <Card variant="outlined">
          <CardContent>
            <List dense disablePadding>
              <ListItem disablePadding>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <LanguageIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Language"
                  secondary={analytics.language}
                />
              </ListItem>
              <Divider component="li" sx={{ my: 1 }} />
              <ListItem disablePadding>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <SpamIcon fontSize="small" sx={{ color: spamScoreColor }} />
                </ListItemIcon>
                <ListItemText
                  primary="Spam Score"
                  secondary={`${(analytics.spamScore * 100).toFixed(1)}%`}
                  secondaryTypographyProps={{
                    sx: { color: spamScoreColor }
                  }}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

export default EmailAnalytics; 