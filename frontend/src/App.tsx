import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { FolderList } from './components/Folders/FolderList';

export const App: React.FC = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Routes>
          <Route path="/folders" element={<FolderList />} />
          <Route path="/folders/:folderId" element={<FolderList />} />
          <Route path="/" element={<Navigate to="/folders" replace />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
};
