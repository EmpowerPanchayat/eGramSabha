// File: frontend/src/utils/authContext.js
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { login, refreshToken } from '../api/auth';
import { getProfile } from '../api/profile';
import tokenManager from './tokenManager';

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

    // Use refs for timers to prevent dependency issues
    const tokenRefreshTimerRef = useRef(null);
    const inactivityTimerRef = useRef(null);
    const isRefreshingRef = useRef(false);
    const initialCheckDoneRef = useRef(false);

    // Clear auth data
    const clearAuthData = useCallback(() => {
        // Clear timers first
        if (tokenRefreshTimerRef.current) {
            clearInterval(tokenRefreshTimerRef.current);
            tokenRefreshTimerRef.current = null;
        }
        if (inactivityTimerRef.current) {
            clearInterval(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }

        // Then clear tokens and user data
        tokenManager.clearTokens();
        setUser(null);
        setError(null);
    }, []);

    // Handle token refresh - with guard against concurrent calls
    const handleRefreshToken = useCallback(async () => {
        // Prevent concurrent refresh attempts
        if (isRefreshingRef.current) {
            console.log('Token refresh already in progress, skipping...');
            return false;
        }

        isRefreshingRef.current = true;

        try {
            const refreshTokenValue = tokenManager.getRefreshToken();
            if (!refreshTokenValue) {
                throw new Error('No refresh token available');
            }

            const response = await refreshToken(refreshTokenValue);

            // Check if the response contains the expected data
            if (!response?.token) {
                throw new Error('Invalid refresh token response');
            }

            // Update tokens using token manager
            tokenManager.setTokens(response.token, response.refreshToken);

            isRefreshingRef.current = false;
            return true;
        } catch (error) {
            console.error('Error refreshing token:', error);
            clearAuthData();
            isRefreshingRef.current = false;
            return false;
        }
    }, [clearAuthData]);

    // Set user data safely
    const setUserData = useCallback((userData) => {
        if (!userData) {
            setUser(null);
            return;
        }

        // For admin or regular officials
        if (['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'ADMIN'].includes(userData.role)) {
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

    // Start token refresh timer
    const startTokenRefreshTimer = useCallback(() => {
        // Clear any existing timer
        if (tokenRefreshTimerRef.current) {
            clearInterval(tokenRefreshTimerRef.current);
            tokenRefreshTimerRef.current = null;
        }

        // Set up a timer to refresh the token every 15 minutes
        const timer = setInterval(() => {
            handleRefreshToken();
        }, 15 * 60 * 1000); // 15 minutes

        tokenRefreshTimerRef.current = timer;
    }, [handleRefreshToken]);

    // Start inactivity timer
    const startInactivityTimer = useCallback(() => {
        // Clear any existing timer
        if (inactivityTimerRef.current) {
            clearInterval(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }

        // Set up a timer to check for inactivity
        const timer = setInterval(() => {
            const now = Date.now();
            if (now - lastActivity > INACTIVITY_TIMEOUT) {
                clearAuthData();
            }
        }, 60000); // Check every minute

        inactivityTimerRef.current = timer;
    }, [lastActivity, clearAuthData]);

    // Check for existing token on component mount - only runs once
    useEffect(() => {
        // Skip if already checked
        if (initialCheckDoneRef.current) {
            return;
        }

        const checkAuthStatus = async () => {
            initialCheckDoneRef.current = true;

            if (!tokenManager.hasTokens()) {
                clearAuthData();
                setLoading(false);
                return;
            }

            try {
                // Try to get user data with existing token
                const response = await getProfile();

                // Correctly navigate the response structure
                if (response?.success && response?.data?.user) {
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
                if (!isRefreshingRef.current) {
                    const refreshed = await handleRefreshToken();

                    if (refreshed) {
                        // Try getting profile again if refresh was successful
                        try {
                            const refreshedResponse = await getProfile();
                            if (refreshedResponse?.success && refreshedResponse?.data?.user) {
                                setUserData(refreshedResponse.data.user);

                                // Start session management
                                startTokenRefreshTimer();
                                startInactivityTimer();
                            } else {
                                throw new Error('Invalid user data after token refresh');
                            }
                        } catch (profileError) {
                            console.error('Failed to get profile after token refresh:', profileError);
                            clearAuthData();
                        }
                    } else {
                        clearAuthData();
                    }
                } else {
                    clearAuthData();
                }
            } finally {
                setLoading(false);
            }
        };

        checkAuthStatus();
    }, [clearAuthData, handleRefreshToken, setUserData, startInactivityTimer, startTokenRefreshTimer]);

    // Setup activity tracking
    useEffect(() => {
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

            if (tokenRefreshTimerRef.current) {
                clearInterval(tokenRefreshTimerRef.current);
                tokenRefreshTimerRef.current = null;
            }

            if (inactivityTimerRef.current) {
                clearInterval(inactivityTimerRef.current);
                inactivityTimerRef.current = null;
            }
        };
    }, []);

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
                return Array.isArray(roles)
                    ? roles.includes(user.role)
                    : user.role === roles;
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