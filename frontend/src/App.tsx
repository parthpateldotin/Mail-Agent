import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, CssBaseline, Box } from '@mui/material';
import { theme } from './theme';
import { FolderList } from './components/Folders/FolderList';
import Dashboard from './pages/Dashboard';
import { Navigation } from './components/common/Navigation';
import { LoadingSpinner } from './components/common/LoadingSpinner';
import { Provider } from 'react-redux';
import { store } from './store';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import ComposePage from './pages/ComposePage';

export const App: React.FC = () => {
  return (
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Navigation />
            <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
              <React.Suspense fallback={<LoadingSpinner />}>
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/compose" element={<ComposePage />} />
                  <Route path="/folders" element={<FolderList />} />
                  <Route path="/folders/:folderId" element={<FolderList />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/register" element={<Register />} />
                </Routes>
              </React.Suspense>
            </Box>
          </Box>
        </Router>
      </ThemeProvider>
    </Provider>
  );
};
