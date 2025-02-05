import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Typography,
  Checkbox,
  IconButton,
  Box,
  Chip
} from '@mui/material';
import {
  Star as StarIcon,
  StarBorder as StarBorderIcon,
  Attachment as AttachmentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { AutoSizer, List as VirtualList, ListRowProps } from 'react-virtualized';

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
  onStarEmail
}) => {
  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      onEmailsSelect(emails.map(email => email.id));
    } else {
      onEmailsSelect([]);
    }
  };

  const renderRow = ({ index, style }: ListRowProps) => {
    const email = emails[index];
    const isSelected = selectedEmails.includes(email.id);

    return (
      <ListItem
        disablePadding
        style={style}
        sx={{
          backgroundColor: isSelected ? 'action.selected' : 'background.paper',
          '&:hover': {
            backgroundColor: 'action.hover'
          }
        }}
      >
        <ListItemButton onClick={() => onEmailSelect(email.id)}>
          <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <Checkbox
              checked={isSelected}
              onChange={(event) => {
                event.stopPropagation();
                if (event.target.checked) {
                  onEmailsSelect([...selectedEmails, email.id]);
                } else {
                  onEmailsSelect(selectedEmails.filter(id => id !== email.id));
                }
              }}
            />
            <IconButton
              size="small"
              onClick={(event) => {
                event.stopPropagation();
                onStarEmail(email.id);
              }}
            >
              {email.isStarred ? <StarIcon color="warning" /> : <StarBorderIcon />}
            </IconButton>
            <Box sx={{ ml: 2, flex: 1, minWidth: 0 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                <Typography
                  variant="subtitle2"
                  sx={{
                    fontWeight: email.isRead ? 'normal' : 'bold',
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {email.subject}
                </Typography>
                <Typography variant="caption" sx={{ ml: 2, whiteSpace: 'nowrap' }}>
                  {format(email.date, 'MMM d')}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Typography
                  variant="body2"
                  color="textSecondary"
                  sx={{
                    flex: 1,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}
                >
                  {email.sender} - {email.preview}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                  {email.hasAttachments && (
                    <AttachmentIcon fontSize="small" color="action" sx={{ ml: 1 }} />
                  )}
                  {email.labels.map((label) => (
                    <Chip
                      key={label}
                      label={label}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  ))}
                </Box>
              </Box>
            </Box>
          </Box>
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Box sx={{ width: '100%', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Checkbox
          checked={selectedEmails.length === emails.length}
          indeterminate={selectedEmails.length > 0 && selectedEmails.length < emails.length}
          onChange={handleSelectAll}
        />
        <Typography variant="subtitle1" component="span">
          {selectedEmails.length > 0
            ? `Selected ${selectedEmails.length} emails`
            : `${emails.length} emails`}
        </Typography>
      </Box>
      <Box sx={{ flex: 1, height: 'calc(100% - 64px)' }}>
        <AutoSizer>
          {({ width, height }) => (
            <VirtualList
              width={width}
              height={height}
              rowCount={emails.length}
              rowHeight={88}
              rowRenderer={renderRow}
            />
          )}
        </AutoSizer>
      </Box>
    </Box>
  );
};

export default EmailList; 