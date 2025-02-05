import React from 'react';
import {
  Box,
  Typography,
  IconButton,
  Chip,
  Divider,
  Button,
  Avatar,
  Tooltip
} from '@mui/material';
import {
  Reply as ReplyIcon,
  Forward as ForwardIcon,
  Delete as DeleteIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Label as LabelIcon,
  AttachFile as AttachmentIcon,
  MoreVert as MoreIcon
} from '@mui/icons-material';
import { format } from 'date-fns';

export interface Attachment {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
}

export interface Email {
  id: string;
  subject: string;
  sender: {
    name: string;
    email: string;
    avatar?: string;
  };
  recipients: Array<{
    name: string;
    email: string;
  }>;
  date: Date;
  content: string;
  isStarred: boolean;
  labels: string[];
  attachments: Attachment[];
}

export interface EmailViewProps {
  email: Email;
  onReply: () => void;
  onForward: () => void;
  onDelete: () => void;
  onStar: () => void;
  onAddLabel: (label: string) => void;
  onRemoveLabel: (label: string) => void;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const EmailView: React.FC<EmailViewProps> = ({
  email,
  onReply,
  onForward,
  onDelete,
  onStar,
  onAddLabel,
  onRemoveLabel
}) => {
  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Email Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flex: 1 }}>
            {email.subject}
          </Typography>
          <Box>
            <IconButton onClick={onStar}>
              {email.isStarred ? <StarIcon color="warning" /> : <StarBorderIcon />}
            </IconButton>
            <IconButton onClick={onDelete}>
              <DeleteIcon />
            </IconButton>
            <IconButton>
              <MoreIcon />
            </IconButton>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar
            src={email.sender.avatar}
            alt={email.sender.name}
            sx={{ width: 40, height: 40, mr: 2 }}
          >
            {email.sender.name[0]}
          </Avatar>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1">
              {email.sender.name} &lt;{email.sender.email}&gt;
            </Typography>
            <Typography variant="caption" color="textSecondary">
              to{' '}
              {email.recipients
                .map((recipient) => `${recipient.name} <${recipient.email}>`)
                .join(', ')}
            </Typography>
          </Box>
          <Typography variant="caption" color="textSecondary">
            {format(email.date, 'MMM d, yyyy h:mm a')}
          </Typography>
        </Box>

        {email.labels.length > 0 && (
          <Box sx={{ mt: 1 }}>
            {email.labels.map((label) => (
              <Chip
                key={label}
                label={label}
                size="small"
                onDelete={() => onRemoveLabel(label)}
                icon={<LabelIcon />}
                sx={{ mr: 1 }}
              />
            ))}
          </Box>
        )}
      </Box>

      {/* Email Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
        <Typography
          component="div"
          dangerouslySetInnerHTML={{ __html: email.content }}
        />

        {email.attachments.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Attachments ({email.attachments.length})
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {email.attachments.map((attachment) => (
                <Tooltip key={attachment.id} title={attachment.name}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<AttachmentIcon />}
                    href={attachment.url}
                    download
                  >
                    {attachment.name.length > 20
                      ? attachment.name.substring(0, 20) + '...'
                      : attachment.name}{' '}
                    ({formatFileSize(attachment.size)})
                  </Button>
                </Tooltip>
              ))}
            </Box>
          </>
        )}
      </Box>

      {/* Action Buttons */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1
        }}
      >
        <Button
          variant="contained"
          startIcon={<ReplyIcon />}
          onClick={onReply}
        >
          Reply
        </Button>
        <Button
          variant="outlined"
          startIcon={<ForwardIcon />}
          onClick={onForward}
        >
          Forward
        </Button>
      </Box>
    </Box>
  );
};

export default EmailView; 