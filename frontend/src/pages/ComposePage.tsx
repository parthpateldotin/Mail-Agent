import React, { useState } from 'react';
import { Container, Box, Snackbar, Alert } from '@mui/material';
import { ComposeEmail, EmailData } from '../components/email/ComposeEmail';
import { useNavigate } from 'react-router-dom';
import { emailService } from '../services/emailService';

const ComposePage: React.FC = () => {
  const navigate = useNavigate();
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error';
  }>({
    open: false,
    message: '',
    severity: 'success',
  });

  const handleSend = async (emailData: EmailData) => {
    try {
      await emailService.sendEmail(emailData);
      setNotification({
        open: true,
        message: 'Email sent successfully!',
        severity: 'success',
      });
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Failed to send email:', error);
      setNotification({
        open: true,
        message: 'Failed to send email. Please try again.',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleSaveDraft = async (emailData: EmailData) => {
    try {
      await emailService.saveDraft(emailData);
      setNotification({
        open: true,
        message: 'Draft saved successfully!',
        severity: 'success',
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
      setNotification({
        open: true,
        message: 'Failed to save draft. Please try again.',
        severity: 'error',
      });
      throw error;
    }
  };

  const handleClose = () => {
    navigate('/');
  };

  const handleCloseNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Box sx={{ height: 'calc(100vh - 128px)' }}>
        <ComposeEmail
          onSend={handleSend}
          onSaveDraft={handleSaveDraft}
          onClose={handleClose}
        />
      </Box>
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default ComposePage; 