// File: frontend/src/components/auth/ProtectedRoute.js (Updated)
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress, Typography, Paper } from '@mui/material';
import { useAuth } from '../../utils/authContext';

/**
 * Enhanced protected route component that redirects to login if user is not authenticated
 * Optionally restricts access based on user roles and types
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The content to render if authorized
 * @param {Array|string} props.requiredRoles - Required role(s) to access the page
 * @param {Array|string} props.requiredUserTypes - Required user type(s) to access the page
 * @param {string} props.redirectPath - Path to redirect to if unauthorized
 * @returns {React.ReactNode} - The rendered component
 */
const ProtectedRoute = ({
    children,
    requiredRoles = [],
    requiredUserTypes = [],
    redirectPath = '/unauthorized'
}) => {
    const { user, loading, hasRole, getUserType } = useAuth();
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

    // If not logged in, redirect to appropriate login page based on requested resource
    if (!user) {
        // Determine which login path to use based on the route or required roles/types
        let loginPath = '/login/admin'; // Default

        // Check if this is a citizen route
        if (
            (Array.isArray(requiredUserTypes) && requiredUserTypes.includes('CITIZEN')) ||
            requiredUserTypes === 'CITIZEN'
        ) {
            loginPath = '/'; // Citizen portal
        }
        // Check if this is an official route
        else if (
            (Array.isArray(requiredRoles) && requiredRoles.some(role =>
                ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST'].includes(role)
            )) ||
            ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST'].includes(requiredRoles) ||
            (Array.isArray(requiredUserTypes) && requiredUserTypes.includes('OFFICIAL')) ||
            requiredUserTypes === 'OFFICIAL'
        ) {
            loginPath = '/login/official';
        }

        return <Navigate to={loginPath} state={{ from: location }} replace />;
    }

    // Check role requirements if specified
    if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
        return <Navigate to={redirectPath} replace />;
    }

    // Check user type requirements if specified
    if (requiredUserTypes.length > 0) {
        const userType = getUserType();
        const isAuthorized = Array.isArray(requiredUserTypes)
            ? requiredUserTypes.includes(userType)
            : userType === requiredUserTypes;

        if (!isAuthorized) {
            return <Navigate to={redirectPath} replace />;
        }
    }

    // User is authenticated and authorized, render the protected component
    return children;
};

export default ProtectedRoute;