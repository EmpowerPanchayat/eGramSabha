// File: frontend/src/api/auth.js
import axios from 'axios';

// Base URL from environment variables or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add request interceptor to handle tokens
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If error is 401 and we haven't tried to refresh token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    throw new Error('No refresh token available');
                }

                const response = await api.post('/auth/refresh-token', { refreshToken });
                const { token, refreshToken: newRefreshToken } = response.data;

                // Update tokens in localStorage
                localStorage.setItem('token', token);
                localStorage.setItem('refreshToken', newRefreshToken);

                // Update the failed request with new token
                originalRequest.headers.Authorization = `Bearer ${token}`;
                return api(originalRequest);
            } catch (refreshError) {
                // If refresh token fails, clear auth data and redirect to login
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/admin/login';
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    }
);

/**
 * Login with username and password
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Promise} - API response with token and user data
 */
export const login = async (username, password) => {
    try {
        const response = await api.post('/auth/login', {
            username,
            password
        });

        if (!response.data?.data?.token || !response.data?.data?.refreshToken) {
            throw new Error('Invalid login response: missing tokens');
        }

        // Store tokens
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);

        return response.data.data;
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
        const response = await api.post('/auth/refresh-token', { refreshToken });

        if (!response.data?.data?.token || !response.data?.data?.refreshToken) {
            throw new Error('Invalid refresh response: missing tokens');
        }

        // Store new tokens
        localStorage.setItem('token', response.data.data.token);
        localStorage.setItem('refreshToken', response.data.data.refreshToken);

        return response.data.data;
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
        const response = await api.post('/auth/register-admin', adminData);
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
        const response = await api.post('/auth/forgot-password', { email });
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
        const response = await api.post('/auth/reset-password', { token, password });
        return response.data;
    } catch (error) {
        console.error('API Error in resetPassword:', error);
        throw error.response?.data || { message: 'Failed to reset password' };
    }
};

export default api;