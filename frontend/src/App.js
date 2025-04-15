// File: frontend/src/App.js
import React from 'react';
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from 'react-router-dom';
import { Box } from '@mui/material';
import { useAuth } from './utils/authContext';

// Import Admin Portal and Citizen Portal
import AdminPortal from './views/AdminPortal';
import CitizenPortal from './views/CitizenPortal';

// Import Auth Provider
import { AuthProvider } from './utils/authContext';

// Import Auth Views
import AdminLoginView from './views/AdminLoginView';
import ForgotPasswordView from './views/ForgotPasswordView';
import ResetPasswordView from './views/ResetPasswordView';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }
  
  return children;
};

const App = () => {
  return (
    <AuthProvider>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <Router>
          <Routes>
            {/* Citizen Portal is the default route */}
            <Route path="/" element={<CitizenPortal />} />

            {/* Admin Auth Routes */}
            <Route path="/admin/login" element={<AdminLoginView />} />
            <Route path="/admin/forgot-password" element={<ForgotPasswordView />} />
            <Route path="/admin/reset-password/:token" element={<ResetPasswordView />} />

            {/* Protected Admin Portal routes */}
            <Route path="/admin/*" element={
              <ProtectedRoute>
                <AdminPortal />
              </ProtectedRoute>
            } />

            {/* Redirect any other routes to the default */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </Box>
    </AuthProvider>
  );
};

export default App;