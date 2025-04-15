// File: frontend/src/utils/authContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { login, refreshToken } from '../api/auth';
import { getProfile } from '../api/profile';

// Create the auth context
const AuthContext = createContext();

// Maximum inactivity time before auto-logout (in milliseconds)
const INACTIVITY_TIMEOUT = 30 * 60 * 1000; // 30 minutes

// Auth provider component
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastActivity, setLastActivity] = useState(Date.now());
    const [tokenRefreshTimer, setTokenRefreshTimer] = useState(null);
    const [inactivityTimer, setInactivityTimer] = useState(null);

    // Check for existing token on component mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            const token = localStorage.getItem('token');

            if (token) {
                try {
                    // Try to get user data with existing token
                    const response = await getProfile();
                    const userData = response.data.user;

                    setUser({
                        id: userData._id,
                        username: userData.username,
                        name: userData.name,
                        email: userData.email,
                        role: userData.role,
                        panchayatId: userData.panchayatId,
                        avatarUrl: userData.avatarUrl,
                        isActive: userData.isActive
                    });

                    // Start session management
                    startTokenRefreshTimer();
                    startInactivityTimer();
                } catch (err) {
                    console.error('Error verifying authentication:', err);
                    // Try to refresh the token if verification fails
                    const refreshed = await handleRefreshToken();
                    if (!refreshed) {
                        // If refresh fails, clear auth data
                        clearAuthData();
                    }
                }
            }

            setLoading(false);
        };

        checkAuthStatus();

        // Track user activity
        const activityEvents = ['mousedown', 'keydown', 'touchstart', 'scroll'];
        const handleUserActivity = () => {
            setLastActivity(Date.now());
        };

        // Add event listeners for user activity
        activityEvents.forEach(event => {
            window.addEventListener(event, handleUserActivity);
        });

        // Cleanup function
        return () => {
            activityEvents.forEach(event => {
                window.removeEventListener(event, handleUserActivity);
            });

            if (tokenRefreshTimer) {
                clearInterval(tokenRefreshTimer);
            }

            if (inactivityTimer) {
                clearInterval(inactivityTimer);
            }
        };
    }, []);

    // Start token refresh timer
    const startTokenRefreshTimer = () => {
        // Clear any existing timer
        if (tokenRefreshTimer) {
            clearInterval(tokenRefreshTimer);
        }

        // Set up a timer to refresh the token every 15 minutes
        const timer = setInterval(async () => {
            await handleRefreshToken();
        }, 15 * 60 * 1000);

        setTokenRefreshTimer(timer);
    };

    // Start inactivity timer
    const startInactivityTimer = () => {
        // Clear any existing timer
        if (inactivityTimer) {
            clearInterval(inactivityTimer);
        }

        // Set up a timer to check for inactivity every minute
        const timer = setInterval(() => {
            const currentTime = Date.now();
            if (currentTime - lastActivity > INACTIVITY_TIMEOUT) {
                // User has been inactive for too long, log them out
                handleLogout();
            }
        }, 60 * 1000); // Check every minute

        setInactivityTimer(timer);
    };

    // Login function
    const handleLogin = useCallback(async (username, password) => {
        setLoading(true);
        setError(null);

        try {
            const response = await login(username, password);

            const { token, refreshToken } = response.data;
            const userData = response.data.user;

            // Save tokens to local storage
            localStorage.setItem('token', token);
            localStorage.setItem('refreshToken', refreshToken);

            // Set user in state
            setUser(userData);

            // Start session management
            startTokenRefreshTimer();
            startInactivityTimer();

            return userData;
        } catch (err) {
            console.error('Login error:', err);
            setError(err.message || 'Login failed. Please check your credentials.');
            throw err;
        } finally {
            setLoading(false);
        }
    }, []);

    // Logout function
    const handleLogout = useCallback(() => {
        clearAuthData();
    }, []);

    // Clear all auth data
    const clearAuthData = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        setUser(null);

        // Clear timers
        if (tokenRefreshTimer) {
            clearInterval(tokenRefreshTimer);
            setTokenRefreshTimer(null);
        }

        if (inactivityTimer) {
            clearInterval(inactivityTimer);
            setInactivityTimer(null);
        }
    };

    // Token refresh function
    const handleRefreshToken = useCallback(async () => {
        const currentRefreshToken = localStorage.getItem('refreshToken');

        if (!currentRefreshToken) {
            return false;
        }

        try {
            const response = await refreshToken(currentRefreshToken);
            const { token } = response.data;

            // Update token in local storage
            localStorage.setItem('token', token);

            return true;
        } catch (err) {
            console.error('Error refreshing token:', err);
            // Clear all auth data on refresh error
            clearAuthData();
            return false;
        }
    }, []);

    // Check if user has specific role
    const hasRole = useCallback((requiredRoles) => {
        if (!user) return false;

        // Convert single role to array
        const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

        // If roles array is empty or undefined, allow access
        if (!roles || roles.length === 0) return true;

        // Admin has access to everything
        if (user.role === 'ADMIN') return true;

        // Check if user's role is in the required roles
        return roles.includes(user.role);
    }, [user]);

    // Check if user belongs to specific panchayat
    const belongsToPanchayat = useCallback((panchayatId) => {
        if (!user) return false;

        // Admin can access any panchayat
        if (user.role === 'ADMIN') return true;

        // Check if user belongs to the specified panchayat
        return user.panchayatId === panchayatId;
    }, [user]);

    // Context value
    const value = {
        user,
        loading,
        error,
        login: handleLogin,
        logout: handleLogout,
        refreshToken: handleRefreshToken,
        hasRole,
        belongsToPanchayat
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);

    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }

    return context;
};