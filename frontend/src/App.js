// File: frontend/src/App.js
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth, AuthProvider } from './utils/authContext';
import { LanguageProvider } from './utils/LanguageContext';

// Import Admin Portal and Citizen Portal
import AdminPortal from './views/AdminPortal';
import CitizenPortal from './views/CitizenPortal';
import OfficialPortalWithLanguage from './views/OfficialPortal';

// Import Auth Views
import AdminLoginView from './views/AdminLoginView';
import ForgotPasswordView from './views/ForgotPasswordView';
import ResetPasswordView from './views/ResetPasswordView';

// Protected Route component
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, hasRole } = useAuth();
  
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // If roles are specified, check if user has required role
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    // Redirect non-admin users to their appropriate dashboard
    if (user.role !== 'ADMIN') {
      return <Navigate to="/official/dashboard" replace />;
    }
    return <Navigate to="/admin/unauthorized" replace />;
  }
  
  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Router>
        <Routes>
          {/* Citizen Portal is the default route */}
          <Route path="/" element={<CitizenPortal />} />
          {/* Auth Routes */}
          <Route path="/admin/login" element={<AdminLoginView />} />
          <Route path="/admin/forgot-password" element={<ForgotPasswordView />} />
          <Route path="/admin/reset-password" element={<ResetPasswordView />} />

          {/* Protected Routes */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRoles={['ADMIN']}>
                <AdminPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/dashboard"
            element={
              <ProtectedRoute requiredRoles={['CITIZEN']}>
                <CitizenPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/official/dashboard"
            element={
              <ProtectedRoute requiredRoles={['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST']}>
                <OfficialPortalWithLanguage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/official/issues"
            element={
              <ProtectedRoute requiredRoles={['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST']}>
                <OfficialPortalWithLanguage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/official/issues/create"
            element={
              <ProtectedRoute requiredRoles={['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST']}>
                <OfficialPortalWithLanguage />
              </ProtectedRoute>
            }
          />

          {/* Default Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </Box>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;