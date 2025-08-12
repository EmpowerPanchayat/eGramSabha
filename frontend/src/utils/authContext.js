// File: frontend/src/utils/authContext.js (Updated with better linkedUser handling)
import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { login as genericLogin, adminLogin, officialLogin, citizenLogin, refreshToken as apiRefreshToken } from '../api/auth';
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
        localStorage.removeItem('user');
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

            // Get the user type from the stored user if available
            const storedUser = JSON.parse(localStorage.getItem('citizenUser') || 'null');
            const userType = storedUser?.userType || null;

            const response = await apiRefreshToken(refreshTokenValue, userType);

            // Check if the response contains the expected data
            if (!response?.token) {
                throw new Error('Invalid refresh token response');
            }

            // Update tokens using token manager
            tokenManager.setTokens(response.token, response.refreshToken);

            // If we got updated user data, update it in state
            if (response.user) {
                setUserData(response.user);
            }

            isRefreshingRef.current = false;
            return true;
        } catch (error) {
            console.error('Error refreshing token:', error);
            clearAuthData();
            isRefreshingRef.current = false;
            return false;
        }
    }, [clearAuthData]);

    // Set user data safely with improved linkedUser handling
    const setUserData = useCallback((userData) => {
        if (!userData) {
            setUser(null);
            localStorage.removeItem('user');
            return;
        }

        // Store the user type
        let userType = 'CITIZEN'; // Default

        // For admin or official users
        if (['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST'].includes(userData.role)) {
            userType = 'OFFICIAL';
        } else if (userData.role === 'ADMIN') {
            userType = 'ADMIN';
        }

        // Enhanced user object with proper type and structured data
        const enhancedUserData = {
            ...userData,
            userType
        };

        // Store complete user data in localStorage for persistence
        localStorage.setItem('user', JSON.stringify(enhancedUserData));
        // Set user state with appropriate structure based on role
        if (['ADMIN', 'SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST'].includes(userData.role)) {
            // Handle linkedUser data carefully
            let linkedUserData = null;

            // Process linked user data if it exists
            if (userData.linkedCitizenId && userData.linkedUser) {
                // Safe access to linkedUser properties
                linkedUserData = {
                    id: userData.linkedUser._id || userData.linkedUser.id || null,
                    name: userData.linkedUser.name || '',
                    voterIdNumber: userData.linkedUser.voterIdNumber || '',
                    panchayatId: userData.linkedUser.panchayatId || null,
                    faceImageId: userData.linkedUser.faceImageId || null,
                    thumbnailImageId: userData.linkedUser.thumbnailImageId || null,
                };
            }

            setUser({
                id: userData._id || userData.id,
                user: linkedUserData ? linkedUserData.id : null,
                username: userData.username || '',
                name: userData.name || '',
                email: userData.email || '',
                role: userData.role || '',
                panchayatId: userData.panchayatId || null,
                avatarUrl: userData.avatarUrl || '',
                isActive: userData.isActive !== false, // Default to true if not specified
                linkedCitizenId: userData.linkedCitizenId || null,
                linkedUser: linkedUserData,
                wardId: userData.wardId || null,
                userType: userType
            });
        } else {
            // For citizen users
            setUser({
                id: userData._id || userData.id,
                user: userData._id || userData.id,
                name: userData.name || '',
                voterIdNumber: userData.voterIdNumber || '',
                panchayatId: userData.panchayatId || null,
                wardId: userData.wardId || null,
                panchayat: userData.panchayat || null,
                userType: userType
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
                // Get stored user info to determine user type
                const storedUser = JSON.parse(localStorage.getItem('user') || 'null');

                if (!storedUser) {
                    throw new Error('No stored user data');
                }

                // Determine which profile endpoint to use based on user type
                let profileEndpoint = '/auth/me'; // Default
                if (storedUser.userType) {
                    switch (storedUser.userType) {
                        case 'ADMIN':
                            profileEndpoint = '/auth/admin/me';
                            break;
                        case 'OFFICIAL':
                            profileEndpoint = '/auth/official/me';
                            break;
                        case 'CITIZEN':
                            profileEndpoint = '/auth/citizen/me';
                            break;
                        default:
                            break;
                    }
                }

                // Try to get user profile with existing token
                const response = await getProfile(profileEndpoint);

                // Update user state if successful
                if (response?.success && response?.data?.user) {
                    // Preserve userType from stored data
                    const userData = response.data.user;

                    // Combine the fresh data from API with stored user type
                    setUserData({
                        ...userData,
                        userType: storedUser.userType
                    });

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
                            const storedUser = JSON.parse(localStorage.getItem('user') || 'null');
                            let profileEndpoint = '/auth/me';

                            if (storedUser?.userType) {
                                switch (storedUser.userType) {
                                    case 'ADMIN':
                                        profileEndpoint = '/auth/admin/me';
                                        break;
                                    case 'OFFICIAL':
                                        profileEndpoint = '/auth/official/me';
                                        break;
                                    case 'CITIZEN':
                                        profileEndpoint = '/auth/citizen/me';
                                        break;
                                    default:
                                        break;
                                }
                            }

                            const refreshedResponse = await getProfile(profileEndpoint);

                            if (refreshedResponse?.success && refreshedResponse?.data?.user) {
                                // Combine the fresh data with stored user type
                                setUserData({
                                    ...refreshedResponse.data.user,
                                    userType: storedUser?.userType
                                });

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

    // Enhanced login function that supports multiple user types
    const handleLogin = async (username, password, userType = null) => {
        try {
            setError(null);
            let response;

            // Use the appropriate login function based on user type
            if (userType) {
                switch (userType.toUpperCase()) {
                    case 'ADMIN':
                        response = await adminLogin(username, password);
                        break;
                    case 'OFFICIAL':
                        response = await officialLogin(username, password);
                        break;
                    default:
                        // Fall back to generic login if type is not recognized
                        response = await genericLogin(username, password);
                        break;
                }
            } else {
                // If no specific user type, use generic login
                response = await genericLogin(username, password);
            }

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
            console.error('Login error:', error);
            setError(error.message || 'Login failed');
            return false;
        }
    };

    // Modified citizen login function
    const handleCitizenLogin = async (faceLoginData) => {
        try {
            setError(null);

            // Use the citizen-specific login function
            const response = await citizenLogin(faceLoginData);

            if (!response?.token || !response?.refreshToken || !response?.user) {
                throw new Error('Invalid login response');
            }

            const { token, refreshToken: newRefreshToken, user: userData } = response;

            // Store tokens using token manager
            tokenManager.setTokens(token, newRefreshToken);

            // Set user data
            setUserData({
                ...userData,
                userType: 'CITIZEN'
            });

            // Start session management
            startTokenRefreshTimer();
            startInactivityTimer();

            return true;
        } catch (error) {
            console.error('Citizen login error:', error);
            setError(error.message || 'Facial recognition login failed');
            return false;
        }
    };

    // Logout function
    const handleLogout = () => {
        clearAuthData();
    };

    // Get linked citizen data helper function
    const getLinkedCitizen = () => {
        if (!user || !user.linkedUser) {
            return null;
        }
        return user.linkedUser;
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            error,
            login: handleLogin,
            citizenLogin: handleCitizenLogin,
            logout: handleLogout,
            refreshToken: handleRefreshToken,
            hasRole: (roles) => {
                if (!user) return false;
                return Array.isArray(roles)
                    ? roles.includes(user.role)
                    : user.role === roles;
            },
            getUserType: () => user?.userType || null,
            getLinkedCitizen,
            // Helper to check if user is linked to a citizen
            hasLinkedCitizen: () => !!user?.linkedCitizenId && !!user?.linkedUser
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