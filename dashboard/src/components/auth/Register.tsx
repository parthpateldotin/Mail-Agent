import React from 'react';
import { Box, Card, Typography } from '@mui/material';

const Register: React.FC = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
      }}
    >
      <Card sx={{ p: 4 }}>
        <Typography variant="h5">Register</Typography>
        <Typography>Register component to be implemented</Typography>
      </Card>
    </Box>
  );
};

export default Register; 