// File: frontend/src/components/RoleBasedContainer.js
import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';

/**
 * Container component that conditionally renders content based on user role
 * 
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - The content to render if authorized
 * @param {string|Array} props.requiredRoles - Required role(s) to access the content
 * @param {React.ReactNode} props.fallback - Content to show if unauthorized (optional)
 * @param {string} props.redirectTo - Path to redirect to if unauthorized (optional)
 * @returns {React.ReactNode} - The rendered component
 */
const RoleBasedContainer = ({
    children,
    requiredRoles,
    fallback = null,
    redirectTo = '/admin/unauthorized'
}) => {
    const { user, hasRole } = useAuth();

    // If no user is logged in, this should be handled by ProtectedRoute
    if (!user) {
        return null;
    }

    // Check if user has the required role(s)
    const isAuthorized = hasRole(requiredRoles);

    // If user is authorized, render the children
    if (isAuthorized) {
        return children;
    }

    // If fallback content is provided, render it
    if (fallback) {
        return fallback;
    }

    // Otherwise redirect to the specified path
    return <Navigate to={redirectTo} replace />;
};

export default RoleBasedContainer;