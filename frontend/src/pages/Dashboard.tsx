import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Paper,
  Typography,
  Button,
  Divider,
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { FolderList } from '../components/Folders/FolderList';
import { EmailList, EmailItem } from '../components/email/EmailList';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import axios from 'axios';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);

  useEffect(() => {
    const fetchEmails = async () => {
      try {
        const response = await axios.get('/api/emails');
        setEmails(response.data);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch emails:', error);
        // Set some sample data for development
        setEmails([
          {
            id: '1',
            subject: 'Welcome to AiMail',
            sender: 'system@aimail.com',
            preview: 'Welcome to your new email client powered by AI...',
            date: new Date(),
            isRead: false,
            isStarred: false,
            hasAttachments: false,
            labels: ['inbox'],
          },
        ]);
        setLoading(false);
      }
    };

    fetchEmails();
  }, []);

  const handleComposeClick = () => {
    navigate('/compose');
  };

  const handleEmailSelect = (emailId: string) => {
    setSelectedEmails(prev =>
      prev.includes(emailId)
        ? prev.filter(id => id !== emailId)
        : [...prev, emailId]
    );
  };

  const handleEmailsSelect = (emailIds: string[]) => {
    setSelectedEmails(emailIds);
  };

  const handleStarEmail = async (emailId: string) => {
    try {
      const email = emails.find(e => e.id === emailId);
      if (email) {
        const response = await axios.patch(`/api/emails/${emailId}/star`, {
          isStarred: !email.isStarred,
        });
        
        setEmails(prevEmails =>
          prevEmails.map(email =>
            email.id === emailId
              ? { ...email, isStarred: !email.isStarred }
              : email
          )
        );
      }
    } catch (error) {
      console.error('Failed to star email:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      <Grid container spacing={3}>
        {/* Sidebar */}
        <Grid item xs={12} md={3} lg={2}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              height: 'calc(100vh - 100px)',
            }}
          >
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleComposeClick}
              fullWidth
              sx={{ mb: 2 }}
            >
              Compose
            </Button>
            <Divider sx={{ mb: 2 }} />
            <FolderList />
          </Paper>
        </Grid>

        {/* Main content */}
        <Grid item xs={12} md={9} lg={10}>
          <Paper 
            sx={{ 
              p: 2, 
              display: 'flex', 
              flexDirection: 'column',
              height: 'calc(100vh - 100px)',
            }}
          >
            <Typography variant="h6" gutterBottom>
              Inbox ({emails.length})
            </Typography>
            <Box sx={{ mt: 2, flex: 1, overflow: 'hidden' }}>
              <EmailList
                emails={emails}
                selectedEmails={selectedEmails}
                onEmailSelect={handleEmailSelect}
                onEmailsSelect={handleEmailsSelect}
                onStarEmail={handleStarEmail}
              />
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Dashboard;
