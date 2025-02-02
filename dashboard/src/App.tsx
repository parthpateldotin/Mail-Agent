import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';

// Layout components
import Layout from './components/Layout';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Dashboard from './components/dashboard/Dashboard';
import WorkflowDashboard from './components/dashboard/WorkflowDashboard';

// Lazy-loaded page components
const Login = React.lazy(() => import('./components/auth/Login'));
const Register = React.lazy(() => import('./components/auth/Register'));
const EmailDashboard = React.lazy(() => import('./components/email/EmailDashboard'));
const Settings = React.lazy(() => import('./components/settings/Settings'));
const Analytics = React.lazy(() => import('./components/analytics/Analytics'));

const LoadingFallback = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
    }}
  >
    <CircularProgress />
  </Box>
);

function App() {
  return (
    <Box sx={{ height: '100vh', display: 'flex' }}>
      <React.Suspense fallback={<LoadingFallback />}>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<EmailDashboard />} />
            <Route path="settings" element={<Settings />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="workflow" element={<WorkflowDashboard />} />
          </Route>
        </Routes>
      </React.Suspense>
    </Box>
  );
}

export default App; 