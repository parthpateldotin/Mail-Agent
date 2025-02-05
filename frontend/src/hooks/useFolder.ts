import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Folder, FolderStats, CreateFolderData, UpdateFolderData } from '../types/folder';
import { useAuth } from './useAuth';

interface UseFolderReturn {
  folders: Folder[];
  folderStats: FolderStats;
  loading: boolean;
  error: string | null;
  createFolder: (name: string, color: string) => Promise<void>;
  updateFolder: (id: string, name: string, color: string) => Promise<void>;
  deleteFolder: (id: string) => Promise<void>;
  moveToFolder: (folderId: string, emailIds: string[]) => Promise<void>;
}

export const useFolder = (): UseFolderReturn => {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderStats, setFolderStats] = useState<FolderStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useAuth();

  const fetchFolders = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get<Folder[]>('/api/folders', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolders(data);
      setError(null);
    } catch (err) {
      setError('Failed to fetch folders');
      console.error('Error fetching folders:', err);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchFolderStats = useCallback(async () => {
    try {
      const { data } = await axios.get<FolderStats>('/api/folders/stats', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFolderStats(data);
    } catch (err) {
      console.error('Error fetching folder stats:', err);
    }
  }, [token]);

  useEffect(() => {
    fetchFolders();
    fetchFolderStats();
  }, [fetchFolders, fetchFolderStats, token]);

  const createFolder = async (name: string, color: string) => {
    try {
      const data: CreateFolderData = { name, color };
      await axios.post('/api/folders', data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchFolders();
      await fetchFolderStats();
    } catch (err) {
      setError('Failed to create folder');
      console.error('Error creating folder:', err);
      throw err;
    }
  };

  const updateFolder = async (id: string, name: string, color: string) => {
    try {
      const data: UpdateFolderData = {};
      if (name) data.name = name;
      if (color) data.color = color;

      await axios.put(`/api/folders/${id}`, data, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchFolders();
    } catch (err) {
      setError('Failed to update folder');
      console.error('Error updating folder:', err);
      throw err;
    }
  };

  const deleteFolder = async (id: string) => {
    try {
      await axios.delete(`/api/folders/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      await fetchFolders();
      await fetchFolderStats();
    } catch (err) {
      setError('Failed to delete folder');
      console.error('Error deleting folder:', err);
      throw err;
    }
  };

  const moveToFolder = async (folderId: string, emailIds: string[]) => {
    try {
      await axios.post(
        `/api/folders/${folderId}/move`,
        { emailIds },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      await fetchFolderStats();
    } catch (err) {
      setError('Failed to move emails');
      console.error('Error moving emails:', err);
      throw err;
    }
  };

  return {
    folders,
    folderStats,
    loading,
    error,
    createFolder,
    updateFolder,
    deleteFolder,
    moveToFolder,
  };
}; 