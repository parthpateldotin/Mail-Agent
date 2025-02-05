import React from 'react';
import {
  Box,
  Button,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography
} from '@mui/material';
import {
  Inbox as InboxIcon,
  Send as SendIcon,
  Drafts as DraftsIcon,
  Delete as DeleteIcon,
  Report as SpamIcon,
  Star as StarIcon,
  Label as LabelIcon,
  Add as AddIcon
} from '@mui/icons-material';

export interface FolderItem {
  id: string;
  name: string;
  count: number;
  icon: React.ReactNode;
  type: 'system' | 'custom';
}

export interface EmailSidebarProps {
  folders: FolderItem[];
  selectedFolder: string;
  onFolderSelect: (folderId: string) => void;
  onComposeClick: () => void;
}

const systemFolders: FolderItem[] = [
  { id: 'inbox', name: 'Inbox', count: 0, icon: <InboxIcon />, type: 'system' },
  { id: 'sent', name: 'Sent', count: 0, icon: <SendIcon />, type: 'system' },
  { id: 'drafts', name: 'Drafts', count: 0, icon: <DraftsIcon />, type: 'system' },
  { id: 'starred', name: 'Starred', count: 0, icon: <StarIcon />, type: 'system' },
  { id: 'spam', name: 'Spam', count: 0, icon: <SpamIcon />, type: 'system' },
  { id: 'trash', name: 'Trash', count: 0, icon: <DeleteIcon />, type: 'system' }
];

export const EmailSidebar: React.FC<EmailSidebarProps> = ({
  folders = systemFolders,
  selectedFolder,
  onFolderSelect,
  onComposeClick
}) => {
  const customFolders = folders.filter(folder => folder.type === 'custom');
  const systemFoldersList = folders.filter(folder => folder.type === 'system');

  return (
    <Box
      sx={{
        backgroundColor: 'background.paper',
        height: '100%',
        p: 2
      }}
    >
      <Button
        fullWidth
        size="large"
        color="primary"
        variant="contained"
        startIcon={<AddIcon />}
        onClick={onComposeClick}
        sx={{ mb: 3 }}
      >
        Compose
      </Button>

      <List>
        {systemFoldersList.map((folder) => (
          <ListItem key={folder.id} disablePadding>
            <ListItemButton
              selected={selectedFolder === folder.id}
              onClick={() => onFolderSelect(folder.id)}
            >
              <ListItemIcon>{folder.icon}</ListItemIcon>
              <ListItemText
                primary={folder.name}
                secondary={folder.count > 0 ? `${folder.count}` : undefined}
              />
            </ListItemButton>
          </ListItem>
        ))}
      </List>

      {customFolders.length > 0 && (
        <>
          <Divider sx={{ my: 2 }} />
          <Typography
            color="textSecondary"
            variant="overline"
            sx={{ ml: 2, mb: 1, display: 'block' }}
          >
            Labels
          </Typography>
          <List>
            {customFolders.map((folder) => (
              <ListItem key={folder.id} disablePadding>
                <ListItemButton
                  selected={selectedFolder === folder.id}
                  onClick={() => onFolderSelect(folder.id)}
                >
                  <ListItemIcon>
                    <LabelIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={folder.name}
                    secondary={folder.count > 0 ? `${folder.count}` : undefined}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </>
      )}
    </Box>
  );
};

export default EmailSidebar; 