import React from 'react';
import {
  List,
  ListItem,
  ListItemText,
  Checkbox,
  IconButton,
  Typography,
  Paper,
  Box,
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  AttachFile as AttachFileIcon,
} from '@mui/icons-material';
import { FixedSizeList, ListChildComponentProps } from 'react-window';
import AutoSizer from 'react-virtualized-auto-sizer';
import { Size } from 'react-virtualized-auto-sizer';

export interface EmailItem {
  id: string;
  subject: string;
  sender: string;
  preview: string;
  date: Date;
  isRead: boolean;
  isStarred: boolean;
  hasAttachments: boolean;
  labels: string[];
}

export interface EmailListProps {
  emails: EmailItem[];
  selectedEmails: string[];
  onEmailSelect: (emailId: string) => void;
  onEmailsSelect: (emailIds: string[]) => void;
  onStarEmail: (emailId: string) => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmails,
  onEmailSelect,
  onEmailsSelect,
  onStarEmail,
}) => {
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onEmailsSelect(emails.map(email => email.id));
    } else {
      onEmailsSelect([]);
    }
  };

  const renderRow = ({ index, style }: ListChildComponentProps) => {
    const email = emails[index];
    const isSelected = selectedEmails.includes(email.id);

    return (
      <ListItem
        style={style}
        key={email.id}
        selected={isSelected}
        onClick={() => onEmailSelect(email.id)}
        sx={{
          cursor: 'pointer',
          '&:hover': {
            backgroundColor: 'action.hover',
          },
          opacity: email.isRead ? 0.8 : 1,
          fontWeight: email.isRead ? 'normal' : 'bold',
        }}
      >
        <Checkbox
          checked={isSelected}
          onChange={() => onEmailSelect(email.id)}
          onClick={e => e.stopPropagation()}
        />
        <IconButton
          size="small"
          onClick={e => {
            e.stopPropagation();
            onStarEmail(email.id);
          }}
        >
          {email.isStarred ? (
            <StarIcon color="warning" />
          ) : (
            <StarBorderIcon />
          )}
        </IconButton>
        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                component="span"
                variant="body1"
                sx={{
                  fontWeight: email.isRead ? 'normal' : 'bold',
                }}
              >
                {email.subject}
              </Typography>
              {email.hasAttachments && (
                <AttachFileIcon fontSize="small" color="action" />
              )}
            </Box>
          }
          secondary={
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>{`${email.sender} - ${email.preview}`}</span>
              <span>
                {new Date(email.date).toLocaleDateString(undefined, {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </Typography>
          }
        />
      </ListItem>
    );
  };

  if (emails.length === 0) {
    return (
      <Paper sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="body1" color="text.secondary">
          No emails to display
        </Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ height: 'calc(100vh - 250px)', width: '100%' }}>
      <Box sx={{ p: 1, borderBottom: 1, borderColor: 'divider' }}>
        <Checkbox
          checked={selectedEmails.length === emails.length}
          indeterminate={
            selectedEmails.length > 0 && selectedEmails.length < emails.length
          }
          onChange={handleSelectAll}
        />
        <Typography
          component="span"
          variant="body2"
          color="text.secondary"
          sx={{ ml: 1 }}
        >
          {selectedEmails.length > 0
            ? `${selectedEmails.length} selected`
            : `${emails.length} emails`}
        </Typography>
      </Box>
      <AutoSizer>
        {({ height, width }: Size) => (
          <FixedSizeList
            height={height}
            width={width}
            itemCount={emails.length}
            itemSize={72}
          >
            {renderRow}
          </FixedSizeList>
        )}
      </AutoSizer>
    </Box>
  );
};

export default EmailList; 