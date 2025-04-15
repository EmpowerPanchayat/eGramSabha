// File: frontend/src/api/auth.js
import axios from 'axios';

// Base URL from environment variables or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Login with username and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise} - API response with token and user data
 */
export const login = async (username, password) => {
    try {
        const response = await axios.post(`${API_URL}/auth/login`, {
            username,
            password
        });

        return response.data;
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
        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
            refreshToken
        });

        return response.data;
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
        const response = await axios.post(`${API_URL}/auth/register-admin`, adminData);

        return response.data;
    } catch (error) {
        console.error('API Error in registerAdmin:', error);
        throw error.response?.data || { message: 'Failed to register admin' };
    }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Promise} - API response
 */
export const forgotPassword = async (email) => {
    try {
        const response = await axios.post(`${API_URL}/auth/forgot-password`, {
            email
        });

        return response.data;
    } catch (error) {
        console.error('API Error in forgotPassword:', error);
        throw error.response?.data || { message: 'Failed to process password reset request' };
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
        const response = await axios.post(`${API_URL}/auth/reset-password/${token}`, {
            password
        });

        return response.data;
    } catch (error) {
        console.error('API Error in resetPassword:', error);
        throw error.response?.data || { message: 'Failed to reset password' };
    }
};