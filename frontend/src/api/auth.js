// File: frontend/src/api/auth.js
import axiosInstance from '../utils/axiosConfig';
import tokenManager from '../utils/tokenManager';

/**
 * Login with username and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise} - API response with token and user data
 */
export const login = async (username, password) => {
    try {
        const response = await axiosInstance.post('/auth/login', {
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

        // Store tokens using tokenManager (not directly in localStorage)
        tokenManager.setTokens(token, refreshToken);

        return { token, refreshToken, user };
    } catch (error) {
        console.error('API Error in login:', error);
        throw error.response?.data || { message: 'Login failed' };
    }
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Promise} - API response with new access token
 */
export const refreshToken = async (refreshToken) => {
    try {
        const response = await axiosInstance.post('/auth/refresh-token', { refreshToken });

        // Check if response has the expected structure
        if (!response.data?.success || !response.data?.data) {
            throw new Error('Invalid API response format');
        }

        const { token, refreshToken: newRefreshToken } = response.data.data;

        if (!token) {
            throw new Error('Invalid refresh response: missing token');
        }

        // Note: We don't store the tokens here, that's the responsibility of the caller
        // This separation of concerns makes the code more maintainable

        return {
            token,
            refreshToken: newRefreshToken || refreshToken, // Use new refresh token if provided, otherwise keep the old one
            user: response.data.data.user
        };
    } catch (error) {
        console.error('API Error in refreshToken:', error);
        throw error.response?.data || { message: 'Failed to refresh token' };
    }
};

/**
 * Register a new admin (initial setup only)
 * @param {Object} adminData - Admin registration data
 * @returns {Promise} - API response with token and user data
 */
export const registerAdmin = async (adminData) => {
    try {
        const response = await axiosInstance.post('/auth/register-admin', adminData);
        return response.data;
    } catch (error) {
        console.error('API Error in registerAdmin:', error);
        throw error.response?.data || { message: 'Failed to register admin' };
    }
};

/**
 * Request password reset
 * @param {string} email - User's email
 * @returns {Promise} - API response
 */
export const forgotPassword = async (email) => {
    try {
        const response = await axiosInstance.post('/auth/forgot-password', { email });
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
 * @returns {Promise} - API response
 */
export const resetPassword = async (token, password) => {
    try {
        const response = await axiosInstance.post(`/auth/reset-password/${token}`, { password });
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
    refreshToken,
    registerAdmin,
    forgotPassword,
    resetPassword,
    logout
};