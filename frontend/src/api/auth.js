// File: frontend/src/api/auth.js (Updated with missing exports)
import axiosInstance from '../utils/axiosConfig';
import tokenManager from '../utils/tokenManager';

/**
 * Login with username and password for admin users
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise} - API response with token and user data
 */
export const adminLogin = async (username, password) => {
    try {
        const response = await axiosInstance.post('/auth/admin/login', {
            username,
            password
        });

        // Check if response has the expected structure
        if (!response.data?.success || !response.data?.data) {
            throw new Error('Invalid API response format');
        }

        const { token, refreshToken, user } = response.data.data;

        if (!token || !refreshToken || !user) {
            throw new Error('Invalid login response: missing tokens or user data');
        }

        // Add userType explicitly to user object if not present
        const enhancedUser = {
            ...user,
            userType: 'ADMIN'
        };

        // Store tokens using tokenManager
        tokenManager.setTokens(token, refreshToken);

        return { token, refreshToken, user: enhancedUser };
    } catch (error) {
        console.error('API Error in admin login:', error);
        throw error.response?.data || { message: 'Login failed' };
    }
};

/**
 * Login with username and password for official users
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise} - API response with token and user data
 */
export const officialLogin = async (username, password) => {
    try {
        const response = await axiosInstance.post('/auth/official/login', {
            username,
            password
        });

        // Check if response has the expected structure
        if (!response.data?.success || !response.data?.data) {
            throw new Error('Invalid API response format');
        }

        const { token, refreshToken, user } = response.data.data;

        if (!token || !refreshToken || !user) {
            throw new Error('Invalid login response: missing tokens or user data');
        }

        // Add userType explicitly to user object if not present
        const enhancedUser = {
            ...user,
            userType: 'OFFICIAL'
        };

        // Store tokens using tokenManager
        tokenManager.setTokens(token, refreshToken);

        return { token, refreshToken, user: enhancedUser };
    } catch (error) {
        console.error('API Error in official login:', error);
        throw error.response?.data || { message: 'Login failed' };
    }
};

/**
 * Login with face recognition for citizens
 * @param {Object} voterIdLastFour - Last 4 digits of voter ID
 * @param {string} panchayatId - Panchayat ID
 * @param {Array} faceDescriptor - Face descriptor array
 * @returns {Promise} - API response with token and user data
 */
export const citizenLogin = async ({ voterIdLastFour, panchayatId, faceDescriptor }) => {
    try {
        // Step 1: Initiate the face login process
        const initResponse = await axiosInstance.post('/auth/citizen/face-login/init', {
            voterIdLastFour,
            panchayatId
        });

        // Check if response has the expected structure
        if (!initResponse.data?.success || !initResponse.data?.data) {
            throw new Error('Invalid API response format');
        }

        const initData = initResponse.data.data;

        // Step 2: Verify with face descriptor
        let verifyData;

        // Check if we have a single user or multiple potential users
        if (initData.userId && initData.securityToken) {
            // Single user case
            verifyData = {
                userId: initData.userId,
                securityToken: initData.securityToken,
                faceDescriptor
            };
        } else if (initData.potentialUserIds && initData.userSecurityTokens) {
            // Multiple potential users case
            verifyData = {
                potentialUserIds: initData.potentialUserIds,
                userSecurityTokens: initData.userSecurityTokens,
                faceDescriptor
            };
        } else {
            throw new Error('Invalid init response data');
        }

        const verifyResponse = await axiosInstance.post('/auth/citizen/face-login/verify', verifyData);

        // Check if response has the expected structure
        if (!verifyResponse.data?.success || !verifyResponse.data?.data) {
            throw new Error('Invalid API response format');
        }

        const { token, refreshToken, user } = verifyResponse.data.data;

        if (!token || !refreshToken || !user) {
            throw new Error('Invalid login response: missing tokens or user data');
        }

        // Add userType explicitly to user object if not present
        const enhancedUser = {
            ...user,
            userType: 'CITIZEN'
        };

        // Store tokens using tokenManager
        tokenManager.setTokens(token, refreshToken);

        return { token, refreshToken, user: enhancedUser };
    } catch (error) {
        console.error('API Error in citizen login:', error);
        throw error.response?.data || { message: 'Login failed' };
    }
};

/**
 * Legacy login function (kept for backward compatibility)
 * Will try to determine correct endpoint based on provided credentials
 */
export const login = async (username, password) => {
    try {
        // Check if this is for admin by attempting admin login first
        try {
            const adminResult = await adminLogin(username, password);
            return adminResult;
        } catch (adminError) {
            // If admin login fails, try official login
            try {
                const officialResult = await officialLogin(username, password);
                return officialResult;
            } catch (officialError) {
                // If both fail, throw the official error (more likely to be relevant)
                throw officialError;
            }
        }
    } catch (error) {
        console.error('API Error in login:', error);
        throw error.response?.data || { message: 'Login failed' };
    }
};

/**
 * Refresh token based on user type
 * @param {string} refreshToken - Refresh token
 * @param {string} userType - Type of user (ADMIN, OFFICIAL, CITIZEN)
 * @returns {Promise} - API response with new access token
 */
export const refreshToken = async (refreshToken, userType = null) => {
    try {
        // Determine the appropriate endpoint based on user type
        let endpoint = '/auth/refresh-token'; // Default/legacy endpoint

        if (userType) {
            switch (userType.toUpperCase()) {
                case 'ADMIN':
                    endpoint = '/auth/admin/refresh-token';
                    break;
                case 'OFFICIAL':
                    endpoint = '/auth/official/refresh-token';
                    break;
                case 'CITIZEN':
                    endpoint = '/auth/citizen/refresh-token';
                    break;
                default:
                    // Use default endpoint
                    break;
            }
        }

        const response = await axiosInstance.post(endpoint, { refreshToken });

        // Check if response has the expected structure
        if (!response.data?.success || !response.data?.data) {
            throw new Error('Invalid API response format');
        }

        const { token, refreshToken: newRefreshToken } = response.data.data;

        if (!token) {
            throw new Error('Invalid refresh response: missing token');
        }

        return {
            token,
            refreshToken: newRefreshToken || refreshToken,
            user: response.data.data.user
        };
    } catch (error) {
        console.error('API Error in refreshToken:', error);
        throw error.response?.data || { message: 'Failed to refresh token' };
    }
};

/**
 * Request password reset
 * @param {string} email - User's email
 * @param {string} userType - Type of user (ADMIN, OFFICIAL)
 * @returns {Promise} - API response
 */
export const forgotPassword = async (email, userType = null) => {
    try {
        // Determine the appropriate endpoint based on user type
        let endpoint = '/auth/forgot-password'; // Default/legacy endpoint

        if (userType) {
            switch (userType.toUpperCase()) {
                case 'ADMIN':
                    endpoint = '/auth/admin/forgot-password';
                    break;
                case 'OFFICIAL':
                    endpoint = '/auth/official/forgot-password';
                    break;
                default:
                    // Use default endpoint
                    break;
            }
        }

        const response = await axiosInstance.post(endpoint, { email });
        return response.data;
    } catch (error) {
        console.error('API Error in forgotPassword:', error);
        throw error.response?.data || { message: 'Failed to request password reset' };
    }
};

/**
 * Reset password with token
 * @param {string} token - Reset token
 * @param {string} password - New password
 * @param {string} userType - Type of user (ADMIN, OFFICIAL)
 * @returns {Promise} - API response
 */
export const resetPassword = async (token, password, userType = null) => {
    try {
        // Determine the appropriate endpoint based on user type
        let endpoint = `/auth/reset-password/${token}`; // Default/legacy endpoint

        if (userType) {
            switch (userType.toUpperCase()) {
                case 'ADMIN':
                    endpoint = `/auth/admin/reset-password/${token}`;
                    break;
                case 'OFFICIAL':
                    endpoint = `/auth/official/reset-password/${token}`;
                    break;
                default:
                    // Use default endpoint
                    break;
            }
        }

        const response = await axiosInstance.post(endpoint, { password });
        return response.data;
    } catch (error) {
        console.error('API Error in resetPassword:', error);
        throw error.response?.data || { message: 'Failed to reset password' };
    }
};

/**
 * Logout - clears tokens from storage
 * @returns {void}
 */
export const logout = () => {
    tokenManager.clearTokens();
};

export default {
    login,
    adminLogin,
    officialLogin,
    citizenLogin,
    refreshToken,
    forgotPassword,
    resetPassword,
    logout
};