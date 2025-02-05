import React from 'react';
import { Box, Typography } from '@mui/material';

const Emails: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Emails
      </Typography>
      <Typography variant="body1">
        Your emails will be displayed here with AI-powered organization.
      </Typography>
    </Box>
  );
};

export default Emails;
