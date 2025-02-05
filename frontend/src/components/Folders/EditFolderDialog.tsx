import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
} from '@mui/material';
import { ChromePicker, ColorResult } from 'react-color';
import { Folder } from '../../types/folder';

interface EditFolderDialogProps {
  open: boolean;
  folder: Folder;
  onClose: () => void;
  onSubmit: (name: string, color: string) => Promise<void>;
}

export const EditFolderDialog: React.FC<EditFolderDialogProps> = ({
  open,
  folder,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState(folder.name);
  const [color, setColor] = useState(folder.color);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(folder.name);
    setColor(folder.color);
  }, [folder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(name.trim(), color);
      setError('');
      onClose();
    } catch (err) {
      setError('Failed to update folder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName(folder.name);
    setColor(folder.color);
    setError('');
    onClose();
  };

  const handleColorChange = (colorResult: ColorResult) => {
    setColor(colorResult.hex);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Edit Folder</DialogTitle>
        <DialogContent>
          <Box sx={{ my: 2 }}>
            <TextField
              autoFocus
              label="Folder Name"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              error={!!error}
              helperText={error}
              disabled={loading}
            />
          </Box>
          <Box sx={{ my: 2 }}>
            <ChromePicker
              color={color}
              onChange={handleColorChange}
              disableAlpha
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={loading}
          >
            Save
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}; 