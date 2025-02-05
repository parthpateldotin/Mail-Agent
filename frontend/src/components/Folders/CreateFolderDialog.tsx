import React, { useState } from 'react';
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

interface CreateFolderDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (name: string, color: string) => Promise<void>;
}

export const CreateFolderDialog: React.FC<CreateFolderDialogProps> = ({
  open,
  onClose,
  onSubmit,
}) => {
  const [name, setName] = useState('');
  const [color, setColor] = useState('#808080');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Folder name is required');
      return;
    }

    try {
      setLoading(true);
      await onSubmit(name.trim(), color);
      setName('');
      setColor('#808080');
      setError('');
      onClose();
    } catch (err) {
      setError('Failed to create folder');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setName('');
    setColor('#808080');
    setError('');
    onClose();
  };

  const handleColorChange = (colorResult: ColorResult) => {
    setColor(colorResult.hex);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New Folder</DialogTitle>
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
            Create
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}; 