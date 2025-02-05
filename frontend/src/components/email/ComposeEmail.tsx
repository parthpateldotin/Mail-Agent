import React, { useState, useRef } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Typography,
  IconButton,
  Chip,
  Stack,
  Divider,
  Tooltip,
  CircularProgress,
  Dialog,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Send as SendIcon,
  AttachFile as AttachFileIcon,
  Save as SaveIcon,
  Close as CloseIcon,
  SmartToy as AIIcon,
} from '@mui/icons-material';
import { Editor } from '@tinymce/tinymce-react';
import { emailService } from '../../services/emailService';

interface ComposeEmailProps {
  onSend: (emailData: EmailData) => Promise<void>;
  onSaveDraft: (emailData: EmailData) => Promise<void>;
  onClose: () => void;
  initialData?: Partial<EmailData>;
}

export interface EmailData {
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  content: string;
  attachments: File[];
}

export const ComposeEmail: React.FC<ComposeEmailProps> = ({
  onSend,
  onSaveDraft,
  onClose,
  initialData,
}) => {
  const [emailData, setEmailData] = useState<EmailData>({
    to: initialData?.to || [],
    cc: initialData?.cc || [],
    bcc: initialData?.bcc || [],
    subject: initialData?.subject || '',
    content: initialData?.content || '',
    attachments: initialData?.attachments || [],
  });

  const [loading, setLoading] = useState(false);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [aiSuggestions, setAISuggestions] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRecipientChange = (
    type: 'to' | 'cc' | 'bcc',
    value: string
  ) => {
    const emails = value.split(/[,;\s]+/).filter(email => email.trim());
    setEmailData(prev => ({ ...prev, [type]: emails }));
  };

  const handleAttachmentClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setEmailData(prev => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const handleRemoveAttachment = (index: number) => {
    setEmailData(prev => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleEditorChange = (content: string) => {
    setEmailData(prev => ({ ...prev, content }));
  };

  const handleSend = async () => {
    setLoading(true);
    try {
      await onSend(emailData);
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      await onSaveDraft(emailData);
    } catch (error) {
      console.error('Failed to save draft:', error);
    }
  };

  const handleGetAISuggestions = async () => {
    setShowAISuggestions(true);
    try {
      const suggestions = await emailService.getAISuggestions(emailData.content);
      setAISuggestions(suggestions);
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      setAISuggestions(['Failed to get AI suggestions. Please try again.']);
    }
  };

  const handleApplySuggestion = (suggestion: string) => {
    setEmailData(prev => ({
      ...prev,
      content: prev.content + '\n\n' + suggestion,
    }));
  };

  return (
    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">New Message</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
        <TextField
          label="To"
          value={emailData.to.join('; ')}
          onChange={(e) => handleRecipientChange('to', e.target.value)}
          fullWidth
        />

        <TextField
          label="Cc"
          value={emailData.cc.join('; ')}
          onChange={(e) => handleRecipientChange('cc', e.target.value)}
          fullWidth
        />

        <TextField
          label="Bcc"
          value={emailData.bcc.join('; ')}
          onChange={(e) => handleRecipientChange('bcc', e.target.value)}
          fullWidth
        />

        <TextField
          label="Subject"
          value={emailData.subject}
          onChange={(e) =>
            setEmailData(prev => ({ ...prev, subject: e.target.value }))
          }
          fullWidth
        />

        <Box sx={{ flex: 1, minHeight: 300 }}>
          <Editor
            apiKey="your-tinymce-api-key"
            value={emailData.content}
            init={{
              height: '100%',
              menubar: false,
              plugins: [
                'advlist', 'autolink', 'lists', 'link', 'image', 'charmap',
                'preview', 'searchreplace', 'visualblocks', 'code', 'fullscreen',
                'insertdatetime', 'media', 'table', 'code', 'help', 'wordcount'
              ],
              toolbar:
                'undo redo | formatselect | bold italic backcolor | \
                alignleft aligncenter alignright alignjustify | \
                bullist numlist outdent indent | removeformat | help'
            }}
            onEditorChange={handleEditorChange}
          />
        </Box>

        <Divider />

        <Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {emailData.attachments.map((file, index) => (
              <Chip
                key={index}
                label={file.name}
                onDelete={() => handleRemoveAttachment(index)}
              />
            ))}
          </Stack>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Box>
            <input
              type="file"
              ref={fileInputRef}
              style={{ display: 'none' }}
              multiple
              onChange={handleFileChange}
            />
            <Button
              startIcon={<AttachFileIcon />}
              onClick={handleAttachmentClick}
            >
              Attach Files
            </Button>
            <Tooltip title="Get AI suggestions">
              <IconButton onClick={handleGetAISuggestions} color="primary">
                <AIIcon />
              </IconButton>
            </Tooltip>
          </Box>
          <Box>
            <Button
              startIcon={<SaveIcon />}
              onClick={handleSaveDraft}
              sx={{ mr: 1 }}
            >
              Save Draft
            </Button>
            <Button
              variant="contained"
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
              onClick={handleSend}
              disabled={loading}
            >
              Send
            </Button>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={showAISuggestions}
        onClose={() => setShowAISuggestions(false)}
        maxWidth="sm"
        fullWidth
      >
        <Box sx={{ p: 2 }}>
          <Typography variant="h6" gutterBottom>
            AI Suggestions
          </Typography>
          <List>
            {aiSuggestions.map((suggestion, index) => (
              <ListItem
                key={index}
                secondaryAction={
                  <Button
                    size="small"
                    onClick={() => handleApplySuggestion(suggestion)}
                  >
                    Apply
                  </Button>
                }
              >
                <ListItemIcon>
                  <AIIcon color="primary" />
                </ListItemIcon>
                <ListItemText primary={suggestion} />
              </ListItem>
            ))}
          </List>
          <Button
            onClick={() => setShowAISuggestions(false)}
            fullWidth
            variant="contained"
            sx={{ mt: 2 }}
          >
            Close
          </Button>
        </Box>
      </Dialog>
    </Paper>
  );
}; 