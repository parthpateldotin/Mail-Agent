import React from 'react';
import { Box, Card, Typography } from '@mui/material';

const Login: React.FC = () => {
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
        <Typography variant="h5">Login</Typography>
        <Typography>Login component to be implemented</Typography>
      </Card>
    </Box>
  );
};

export default Login; 