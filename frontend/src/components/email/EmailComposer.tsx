import React, { useState, useEffect } from 'react';
import {
  Box,
  TextField,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Close as CloseIcon,
  Send as SendIcon,
  AttachFile as AttachmentIcon,
  Delete as DeleteIcon,
  Save as SaveIcon
} from '@mui/icons-material';
import ReactQuill, { UnprivilegedEditor } from 'react-quill';
import type { Sources } from 'quill';
import 'react-quill/dist/quill.snow.css';

export interface Recipient {
  name?: string;
  email: string;
}

export interface EmailDraft {
  to: Recipient[];
  cc: Recipient[];
  bcc: Recipient[];
  subject: string;
  content: string;
  attachments: File[];
}

export interface EmailComposerProps {
  mode: 'new' | 'reply' | 'forward';
  initialData?: Partial<EmailDraft>;
  onClose: () => void;
  onSend: (draft: EmailDraft) => Promise<void>;
  onSaveDraft: (draft: EmailDraft) => Promise<void>;
}

const parseRecipients = (input: string): Recipient[] => {
  return input
    .split(',')
    .map((item) => item.trim())
    .filter((item) => item)
    .map((item) => {
      const match = item.match(/^(?:"?([^"]*)"?\s*)?<?([^>]*)>?$/);
      if (match) {
        return {
          name: match[1],
          email: match[2].trim()
        };
      }
      return { email: item };
    });
};

const formatRecipients = (recipients: Recipient[]): string => {
  return recipients
    .map((r) => (r.name ? `"${r.name}" <${r.email}>` : r.email))
    .join(', ');
};

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['link', 'image'],
    ['clean']
  ],
  imageResize: {
    displaySize: true
  },
  imageDrop: true
};

const quillFormats = [
  'header',
  'bold', 'italic', 'underline', 'strike',
  'color', 'background',
  'list', 'bullet',
  'align',
  'link', 'image'
];

const EmailComposerContent: React.FC<EmailComposerProps> = ({
  mode,
  initialData,
  onClose,
  onSend,
  onSaveDraft
}) => {
  const [draft, setDraft] = useState<EmailDraft>({
    to: initialData?.to || [],
    cc: initialData?.cc || [],
    bcc: initialData?.bcc || [],
    subject: initialData?.subject || '',
    content: initialData?.content || '',
    attachments: initialData?.attachments || []
  });

  const [isSending, setIsSending] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (initialData) {
      setDraft(prev => ({
        ...prev,
        ...initialData
      }));
    }
  }, [initialData]);

  // TODO: Fix Delta type when upgrading react-quill or quill packages
  const handleQuillChange = (
    content: string,
    _delta: any, // Temporary fix for type compatibility
    _source: Sources,
    _editor: UnprivilegedEditor
  ) => {
    setDraft((prev: EmailDraft) => ({
      ...prev,
      content
    }));
  };

  const handleSend = async () => {
    try {
      setIsSending(true);
      await onSend(draft);
      onClose();
    } catch (error) {
      console.error('Failed to send email:', error);
      // Show error notification
    } finally {
      setIsSending(false);
    }
  };

  const handleSaveDraft = async () => {
    try {
      setIsSaving(true);
      await onSaveDraft(draft);
    } catch (error) {
      console.error('Failed to save draft:', error);
      // Show error notification
    } finally {
      setIsSaving(false);
    }
  };

  const handleAttachFiles = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setDraft((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files]
    }));
  };

  const handleRemoveAttachment = (index: number) => {
    setDraft((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index)
    }));
  };

  return (
    <Dialog
      open
      fullWidth
      maxWidth="md"
      onClose={onClose}
      sx={{ '& .MuiDialog-paper': { height: '80vh' } }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {mode === 'new'
              ? 'New Message'
              : mode === 'reply'
              ? 'Reply'
              : 'Forward'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent dividers>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="To"
            fullWidth
            value={formatRecipients(draft.to)}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                to: parseRecipients(e.target.value)
              }))
            }
          />

          <TextField
            label="Cc"
            fullWidth
            value={formatRecipients(draft.cc)}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                cc: parseRecipients(e.target.value)
              }))
            }
          />

          <TextField
            label="Bcc"
            fullWidth
            value={formatRecipients(draft.bcc)}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                bcc: parseRecipients(e.target.value)
              }))
            }
          />

          <TextField
            label="Subject"
            fullWidth
            value={draft.subject}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                subject: e.target.value
              }))
            }
          />

          <Box sx={{ flex: 1, minHeight: 300, '& .quill': { height: '100%' } }}>
            <ReactQuill
              theme="snow"
              value={draft.content}
              onChange={handleQuillChange}
              modules={quillModules}
              formats={quillFormats}
            />
          </Box>

          {draft.attachments.length > 0 && (
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {draft.attachments.map((file, index) => (
                <Chip
                  key={index}
                  label={file.name}
                  onDelete={() => handleRemoveAttachment(index)}
                  icon={<AttachmentIcon />}
                />
              ))}
            </Box>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <input
          type="file"
          multiple
          hidden
          onChange={handleAttachFiles}
        />
        <Button
          startIcon={<AttachmentIcon />}
        >
          Attach
        </Button>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Save as draft">
          <Button
            startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSaveDraft}
            disabled={isSaving}
          >
            Save
          </Button>
        </Tooltip>
        <Button
          variant="contained"
          startIcon={isSending ? <CircularProgress size={20} /> : <SendIcon />}
          onClick={handleSend}
          disabled={isSending}
        >
          Send
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export const EmailComposer = EmailComposerContent;

export default EmailComposer; 