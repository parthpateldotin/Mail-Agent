import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton,
  Menu,
  MenuItem,
  Typography,
  Badge,
} from '@mui/material';
import {
  Inbox as InboxIcon,
  Send as SendIcon,
  Drafts as DraftsIcon,
  Delete as DeleteIcon,
  Report as SpamIcon,
  Archive as ArchiveIcon,
  Folder as FolderIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import { SystemFolderType, Folder } from '../../types/folder';
import { useFolder } from '../../hooks/useFolder';
import { CreateFolderDialog } from './CreateFolderDialog';
import { EditFolderDialog } from './EditFolderDialog';

const systemFolderIcons: Record<SystemFolderType, React.ComponentType> = {
  [SystemFolderType.INBOX]: InboxIcon,
  [SystemFolderType.SENT]: SendIcon,
  [SystemFolderType.DRAFTS]: DraftsIcon,
  [SystemFolderType.TRASH]: DeleteIcon,
  [SystemFolderType.SPAM]: SpamIcon,
  [SystemFolderType.ARCHIVE]: ArchiveIcon,
};

export const FolderList: React.FC = () => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  const {
    folders,
    folderStats,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
  } = useFolder();

  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [folderToEdit, setFolderToEdit] = useState<Folder | null>(null);

  useEffect(() => {
    if (folderId) {
      setSelectedFolder(folderId);
    }
  }, [folderId]);

  const handleFolderClick = (folderId: string) => {
    navigate(`/folders/${folderId}`);
    setSelectedFolder(folderId);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, folder: Folder) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
    setFolderToEdit(folder);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setFolderToEdit(null);
  };

  const handleEditClick = () => {
    setEditDialogOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = async () => {
    if (folderToEdit) {
      await deleteFolder(folderToEdit.id);
      handleMenuClose();
    }
  };

  const handleCreateFolder = async (name: string, color: string) => {
    await createFolder(name, color);
    setCreateDialogOpen(false);
  };

  const handleUpdateFolder = async (name: string, color: string) => {
    if (folderToEdit) {
      await updateFolder(folderToEdit.id, name, color);
      setEditDialogOpen(false);
    }
  };

  if (loading) {
    return <Typography>Loading folders...</Typography>;
  }

  if (error) {
    return <Typography color="error">Error loading folders: {error}</Typography>;
  }

  return (
    <>
      <List>
        {/* System Folders */}
        {folders
          .filter((folder) => folder.type === 'system')
          .map((folder) => {
            const Icon = folder.systemType ? systemFolderIcons[folder.systemType] : FolderIcon;
            const emailCount = folderStats[folder.id]?.emailCount || 0;

            return (
              <ListItem
                key={folder.id}
                button
                selected={selectedFolder === folder.id}
                onClick={() => handleFolderClick(folder.id)}
              >
                <ListItemIcon>
                  <Badge badgeContent={emailCount} color="primary">
                    <Icon style={{ color: folder.color }} />
                  </Badge>
                </ListItemIcon>
                <ListItemText primary={folder.name} />
              </ListItem>
            );
          })}

        {/* Custom Folders */}
        {folders
          .filter((folder) => folder.type === 'custom')
          .map((folder) => {
            const emailCount = folderStats[folder.id]?.emailCount || 0;

            return (
              <ListItem
                key={folder.id}
                button
                selected={selectedFolder === folder.id}
                onClick={() => handleFolderClick(folder.id)}
              >
                <ListItemIcon>
                  <Badge badgeContent={emailCount} color="primary">
                    <FolderIcon style={{ color: folder.color }} />
                  </Badge>
                </ListItemIcon>
                <ListItemText primary={folder.name} />
                <IconButton
                  edge="end"
                  onClick={(e) => handleMenuOpen(e, folder)}
                  size="small"
                >
                  <MoreVertIcon />
                </IconButton>
              </ListItem>
            );
          })}

        {/* Add Folder Button */}
        <ListItem button onClick={() => setCreateDialogOpen(true)}>
          <ListItemIcon>
            <FolderIcon />
          </ListItemIcon>
          <ListItemText primary="Create New Folder" />
        </ListItem>
      </List>

      {/* Folder Menu */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Edit" />
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <ListItemIcon>
            <DeleteIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Delete" />
        </MenuItem>
      </Menu>

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        onSubmit={handleCreateFolder}
      />

      {/* Edit Folder Dialog */}
      {folderToEdit && (
        <EditFolderDialog
          open={editDialogOpen}
          folder={folderToEdit}
          onClose={() => setEditDialogOpen(false)}
          onSubmit={handleUpdateFolder}
        />
      )}
    </>
  );
}; 