// File: frontend/src/utils/authContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { login, refreshToken } from '../api/auth';
import { getProfile } from '../api/profile';
import { tokenManager } from './tokenManager';

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

    // Handle token refresh
    const handleRefreshToken = useCallback(async () => {
        try {
            const refreshTokenValue = tokenManager.getRefreshToken();
            if (!refreshTokenValue) {
                throw new Error('No refresh token available');
            }

            const response = await refreshToken(refreshTokenValue);
            const { token } = response;

            // We don't need to update refreshToken if it's not in the response
            // tokenManager.setTokens will handle this case

            return true;
        } catch (error) {
            console.error('Error refreshing token:', error);
            clearAuthData();
            return false;
        }
    }, []);

    // Clear auth data
    const clearAuthData = useCallback(() => {
        tokenManager.clearTokens();
        setUser(null);
        setError(null);
    }, []);

    // Set user data safely
    const setUserData = useCallback((userData) => {
        if (!userData) {
            setUser(null);
            return;
        }
        console.log({ userData });
        // For admin or regular officials
        if (['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(userData.role)) {
            setUser({
                id: userData._id || userData.id,
                user: userData.linkedUser ? userData.linkedUser._id || userData.linkedUser.id : null,
                username: userData.username || '',
                name: userData.name || '',
                email: userData.email || '',
                role: userData.role || '',
                panchayatId: userData.panchayatId || null,
                avatarUrl: userData.avatarUrl || '',
                isActive: userData.isActive || false,
                linkedUser: userData.linkedUser ? {
                    id: userData.linkedUser._id || userData.linkedUser.id,
                    name: userData.linkedUser.name || '',
                    voterIdNumber: userData.linkedUser.voterIdNumber || '',
                    panchayatId: userData.linkedUser.panchayatId || null,
                    faceImagePath: userData.linkedUser.faceImagePath || ''
                } : null
            });
        } else {
            setUser({
                id: userData._id || userData.id,
                user: userData._id || userData.id,
                username: userData.username || '',
                name: userData.name || '',
                email: userData.email || '',
                role: userData.role || '',
                panchayatId: userData.panchayatId || null,
                avatarUrl: userData.avatarUrl || '',
                isActive: userData.isActive || false
            });
        }
    }, []);

    // Check for existing token on component mount
    useEffect(() => {
        const checkAuthStatus = async () => {
            if (!tokenManager.hasTokens()) {
                clearAuthData();
                setLoading(false);
                return;
            }

            try {
                // Try to get user data with existing token
                const response = await getProfile();
                if (response?.data?.user) {
                    setUserData(response.data.user);
                    // Start session management
                    startTokenRefreshTimer();
                    startInactivityTimer();
                } else {
                    throw new Error('Invalid user data received');
                }
            } catch (err) {
                console.error('Error verifying authentication:', err);
                // Try to refresh the token if verification fails
                const refreshed = await handleRefreshToken();
                if (!refreshed) {
                    clearAuthData();
                }
            } finally {
                setLoading(false);
            }
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
    }, [handleRefreshToken, clearAuthData, setUserData]);

    // Start token refresh timer
    const startTokenRefreshTimer = useCallback(() => {
        // Clear any existing timer
        if (tokenRefreshTimer) {
            clearInterval(tokenRefreshTimer);
        }

        // Set up a timer to refresh the token every 15 minutes
        const timer = setInterval(async () => {
            await handleRefreshToken();
        }, 15 * 60 * 1000);

        setTokenRefreshTimer(timer);
    }, [handleRefreshToken]);

    // Start inactivity timer
    const startInactivityTimer = useCallback(() => {
        // Clear any existing timer
        if (inactivityTimer) {
            clearInterval(inactivityTimer);
        }

        // Set up a timer to check for inactivity
        const timer = setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > INACTIVITY_TIMEOUT) {
                clearAuthData();
            }
        }, 60000); // Check every minute

        setInactivityTimer(timer);
    }, [lastActivity, clearAuthData]);

    // Login function
    const handleLogin = async (username, password) => {
        try {
            const response = await login(username, password);
            if (!response?.token || !response?.refreshToken || !response?.user) {
                throw new Error('Invalid login response');
            }

            const { token, refreshToken: newRefreshToken, user: userData } = response;

            // Store tokens using token manager
            tokenManager.setTokens(token, newRefreshToken);

            // Set user data
            setUserData(userData);

            // Start session management
            startTokenRefreshTimer();
            startInactivityTimer();

            return true;
        } catch (error) {
            setError(error.message || 'Login failed');
            return false;
        }
    };

    // Logout function
    const handleLogout = () => {
        clearAuthData();
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            login: handleLogin,
            logout: handleLogout,
            hasRole: (roles) => {
                if (!user) return false;
                return roles.includes(user.role);
            }
        }}>
            {children}
        </AuthContext.Provider>
    );
};

// Custom hook to use auth context
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};