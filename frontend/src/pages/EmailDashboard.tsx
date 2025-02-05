import React, { useState, useEffect, useCallback } from 'react';
import { Box, useTheme, useMediaQuery, Alert, Snackbar, Pagination } from '@mui/material';
import EmailLayout from '../components/email/EmailLayout';
import EmailSidebar from '../components/email/EmailSidebar';
import EmailList from '../components/email/EmailList';
import EmailView, { Email } from '../components/email/EmailView';
import EmailComposer, { EmailDraft } from '../components/email/EmailComposer';
import SmartReply from '../components/ai/SmartReply';
import EmailAnalytics from '../components/ai/EmailAnalytics';
import LoadingSpinner from '../components/common/LoadingSpinner';
import { EmailItem } from '../components/email/EmailList';
import { FolderItem } from '../components/email/EmailSidebar';
import { EmailAnalytics as EmailAnalyticsType } from '../components/ai/EmailAnalytics';
import { fetchWithRetry, clearCache, getErrorMessage } from '../utils/apiUtils';
import { 
  PaginationParams, 
  PaginatedResponse, 
  createPaginationParams, 
  buildPaginatedUrl,
  DEFAULT_PAGE_SIZE 
} from '../utils/paginationUtils';

const EmailDashboard: React.FC = () => {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up('lg'));

  // Pagination state
  const [paginationParams, setPaginationParams] = useState<PaginationParams>(
    createPaginationParams(1, DEFAULT_PAGE_SIZE, 'date', 'desc')
  );
  const [totalPages, setTotalPages] = useState(1);
  const [totalEmails, setTotalEmails] = useState(0);

  // State
  const [selectedFolder, setSelectedFolder] = useState<string>('inbox');
  const [selectedEmail, setSelectedEmail] = useState<string | null>(null);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerMode, setComposerMode] = useState<'new' | 'reply' | 'forward'>('new');
  const [composerInitialData, setComposerInitialData] = useState<Partial<EmailDraft> | undefined>();

  // Loading and error states
  const [loading, setLoading] = useState(true);
  const [emailLoading, setEmailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'error' as 'error' | 'success'
  });

  // Data states
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [emails, setEmails] = useState<EmailItem[]>([]);
  const [currentEmail, setCurrentEmail] = useState<Email | null>(null);
  const [analytics, setAnalytics] = useState<EmailAnalyticsType | null>(null);

  // Enhanced error handling
  const handleError = useCallback((error: unknown, context: string) => {
    console.error(`Error in ${context}:`, error);
    const message = getErrorMessage(error);
    setSnackbar({
      open: true,
      message: `${context}: ${message}`,
      severity: 'error'
    });
  }, []);

  // Load folders with retry and caching
  useEffect(() => {
    const loadFolders = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchWithRetry('/api/folders', undefined, {
          maxRetries: 3,
          delayMs: 1000
        }, {
          cacheDuration: 5 * 60 * 1000 // Cache folders for 5 minutes
        });

        setFolders(data);
      } catch (error) {
        handleError(error, 'Failed to load folders');
        setError('Failed to load folders. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    loadFolders();
  }, [handleError]);

  // Load emails with pagination, retry, and caching
  useEffect(() => {
    const loadEmails = async () => {
      if (!selectedFolder) return;

      try {
        setEmailLoading(true);
        const url = buildPaginatedUrl(`/api/folders/${selectedFolder}/emails`, paginationParams);
        
        const response: PaginatedResponse<EmailItem> = await fetchWithRetry(
          url,
          undefined,
          {
            maxRetries: 2,
            delayMs: 1000
          },
          {
            cacheDuration: 30 * 1000, // Cache for 30 seconds
            cacheKey: `${selectedFolder}-${paginationParams.page}`
          }
        );

        setEmails(response.items);
        setTotalPages(response.totalPages);
        setTotalEmails(response.total);
      } catch (error) {
        handleError(error, 'Failed to load emails');
      } finally {
        setEmailLoading(false);
      }
    };

    loadEmails();
  }, [selectedFolder, paginationParams, handleError]);

  // Load email details with retry and caching
  useEffect(() => {
    const loadEmail = async () => {
      if (!selectedEmail) return;

      try {
        setEmailLoading(true);
        const [emailData, analyticsData] = await Promise.all([
          fetchWithRetry(
            `/api/emails/${selectedEmail}`,
            undefined,
            { maxRetries: 2 },
            { cacheDuration: 60 * 1000 } // Cache email content for 1 minute
          ),
          fetchWithRetry(
            `/api/ai/analyze/${selectedEmail}`,
            undefined,
            { maxRetries: 1 },
            { cacheDuration: 5 * 60 * 1000 } // Cache analytics for 5 minutes
          )
        ]);

        setCurrentEmail(emailData);
        setAnalytics(analyticsData);
      } catch (error) {
        handleError(error, 'Failed to load email details');
      } finally {
        setEmailLoading(false);
      }
    };

    loadEmail();
  }, [selectedEmail, handleError]);

  // Handle pagination change
  const handlePageChange = (event: React.ChangeEvent<unknown>, page: number) => {
    setPaginationParams(prev => ({
      ...prev,
      page
    }));
    // Clear selection when changing pages
    setSelectedEmail(null);
    setSelectedEmails([]);
  };

  // Enhanced folder selection with cache clearing
  const handleFolderSelect = (folderId: string) => {
    setSelectedFolder(folderId);
    setSelectedEmail(null);
    setSelectedEmails([]);
    setPaginationParams(createPaginationParams(1, DEFAULT_PAGE_SIZE, 'date', 'desc'));
    // Clear cache for the previous folder
    clearCache(`${selectedFolder}-${paginationParams.page}`);
  };

  // Handlers
  const handleEmailSelect = (emailId: string) => {
    setSelectedEmail(emailId);
  };

  const handleEmailsSelect = (emailIds: string[]) => {
    setSelectedEmails(emailIds);
  };

  const handleCompose = () => {
    setComposerMode('new');
    setComposerInitialData(undefined);
    setIsComposerOpen(true);
  };

  const handleReply = () => {
    if (currentEmail) {
      setComposerMode('reply');
      setComposerInitialData({
        to: [{ name: currentEmail.sender.name, email: currentEmail.sender.email }],
        subject: `Re: ${currentEmail.subject}`,
        content: `\n\nOn ${currentEmail.date.toLocaleString()}, ${currentEmail.sender.name} wrote:\n> ${currentEmail.content}`
      });
      setIsComposerOpen(true);
    }
  };

  const handleForward = () => {
    if (currentEmail) {
      setComposerMode('forward');
      setComposerInitialData({
        subject: `Fwd: ${currentEmail.subject}`,
        content: `\n\n---------- Forwarded message ---------\nFrom: ${currentEmail.sender.name} <${currentEmail.sender.email}>\nDate: ${currentEmail.date.toLocaleString()}\nSubject: ${currentEmail.subject}\n\n${currentEmail.content}`
      });
      setIsComposerOpen(true);
    }
  };

  const handleSendEmail = async (draft: EmailDraft) => {
    try {
      const response = await fetch('/api/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error('Failed to send email');
      }

      setIsComposerOpen(false);
      setSnackbar({
        open: true,
        message: 'Email sent successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      setSnackbar({
        open: true,
        message: 'Failed to send email',
        severity: 'error'
      });
    }
  };

  const handleSaveDraft = async (draft: EmailDraft) => {
    try {
      const response = await fetch('/api/drafts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draft),
      });

      if (!response.ok) {
        throw new Error('Failed to save draft');
      }

      setSnackbar({
        open: true,
        message: 'Draft saved successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
      setSnackbar({
        open: true,
        message: 'Failed to save draft',
        severity: 'error'
      });
    }
  };

  const handleSmartReply = (reply: string) => {
    setComposerMode('reply');
    setComposerInitialData({
      to: currentEmail ? [{ name: currentEmail.sender.name, email: currentEmail.sender.email }] : [],
      subject: currentEmail ? `Re: ${currentEmail.subject}` : '',
      content: reply
    });
    setIsComposerOpen(true);
  };

  // Enhanced email star with optimistic update
  const handleStarEmail = async (emailId: string) => {
    try {
      // Optimistic update
      setEmails(prevEmails =>
        prevEmails.map(email =>
          email.id === emailId
            ? { ...email, isStarred: !email.isStarred }
            : email
        )
      );

      const response = await fetchWithRetry(
        `/api/emails/${emailId}/star`,
        { method: 'POST' },
        { maxRetries: 2 }
      );

      if (!response.success) {
        // Revert on failure
        setEmails(prevEmails =>
          prevEmails.map(email =>
            email.id === emailId
              ? { ...email, isStarred: !email.isStarred }
              : email
          )
        );
        throw new Error('Failed to star email');
      }
    } catch (error) {
      handleError(error, 'Failed to star email');
    }
  };

  if (loading) {
    return <LoadingSpinner message="Loading your mailbox..." />;
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <EmailLayout
      sidebar={
        <EmailSidebar
          folders={folders}
          selectedFolder={selectedFolder}
          onFolderSelect={handleFolderSelect}
          onComposeClick={handleCompose}
        />
      }
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <Box sx={{ display: 'flex', flex: 1, minHeight: 0 }}>
          <Box
            sx={{
              width: selectedEmail && isLargeScreen ? '40%' : '100%',
              display: selectedEmail && !isLargeScreen ? 'none' : 'flex',
              flexDirection: 'column',
              borderRight: selectedEmail && isLargeScreen ? 1 : 0,
              borderColor: 'divider'
            }}
          >
            {emailLoading ? (
              <LoadingSpinner message="Loading emails..." />
            ) : (
              <>
                <EmailList
                  emails={emails}
                  selectedEmails={selectedEmails}
                  onEmailSelect={handleEmailSelect}
                  onEmailsSelect={handleEmailsSelect}
                  onStarEmail={handleStarEmail}
                />
                <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                  <Pagination
                    count={totalPages}
                    page={paginationParams.page}
                    onChange={handlePageChange}
                    color="primary"
                    showFirstButton
                    showLastButton
                  />
                </Box>
              </>
            )}
          </Box>

          {selectedEmail && (
            <Box
              sx={{
                width: isLargeScreen ? '60%' : '100%',
                display: !isLargeScreen && !selectedEmail ? 'none' : 'flex',
                flexDirection: 'column'
              }}
            >
              {emailLoading ? (
                <LoadingSpinner message="Loading email details..." />
              ) : currentEmail && (
                <>
                  <EmailView
                    email={currentEmail}
                    onReply={handleReply}
                    onForward={handleForward}
                    onDelete={() => {
                      // Handle delete
                    }}
                    onStar={() => {
                      // Handle star
                    }}
                    onAddLabel={() => {
                      // Handle add label
                    }}
                    onRemoveLabel={() => {
                      // Handle remove label
                    }}
                  />

                  <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                    <SmartReply
                      emailId={selectedEmail}
                      onSelectReply={handleSmartReply}
                    />
                  </Box>

                  {analytics && (
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                      <EmailAnalytics analytics={analytics} />
                    </Box>
                  )}
                </>
              )}
            </Box>
          )}
        </Box>

        {isComposerOpen && (
          <EmailComposer
            mode={composerMode}
            initialData={composerInitialData}
            onClose={() => setIsComposerOpen(false)}
            onSend={handleSendEmail}
            onSaveDraft={handleSaveDraft}
          />
        )}

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            severity={snackbar.severity}
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </Box>
    </EmailLayout>
  );
};

export default EmailDashboard; 