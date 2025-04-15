// File: frontend/src/components/auth/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { useAuth } from '../../utils/authContext';

/**
 * Enhanced protected route component that redirects to login if user is not authenticated
 * Optionally restricts access based on user roles
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The content to render if authorized
 * @param {Array|string} props.requiredRoles - Required role(s) to access the page
 * @param {string} props.redirectPath - Path to redirect to if unauthorized
 * @returns {React.ReactNode} - The rendered component
 */
const ProtectedRoute = ({
    children,
    requiredRoles = [],
    redirectPath = '/admin/unauthorized'
}) => {
    const { user, loading, hasRole } = useAuth();
    const location = useLocation();

    // Show loading indicator while auth state is being checked
    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    bgcolor: 'background.default'
                }}
            >
                <Paper
                    elevation={3}
                    sx={{
                        p: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: 2
                    }}
                >
                    <CircularProgress size={60} color="primary" sx={{ mb: 2 }} />
                    <Typography variant="h6" color="text.secondary">
                        Verifying authentication...
                    </Typography>
                </Paper>
            </Box>
        );
    }

    // If not logged in, redirect to login page with return path
    if (!user) {
        return <Navigate to="/admin/login" state={{ from: location }} replace />;
    }

    // If roles are specified, check if user has the required role
    if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
        // Redirect to unauthorized page
        return <Navigate to={redirectPath} replace />;
    }

    // User is authenticated and authorized, render the protected component
    return children;
};

export default ProtectedRoute;