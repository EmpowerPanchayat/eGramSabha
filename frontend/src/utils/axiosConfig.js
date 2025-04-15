// File: frontend/src/utils/axiosConfig.js
import axios from 'axios';

// Use environment variable for API URL if available, fallback to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const axiosInstance = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000 // 15 seconds timeout
});

// Request interceptor for adding auth token
axiosInstance.interceptors.request.use(
    (config) => {
        // Add token to request if it exists
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

// Response interceptor for handling token expiry
axiosInstance.interceptors.response.use(
    (response) => {
        return response;
    },
    async (error) => {
        const originalRequest = error.config;

        // If error is due to token expiry and we haven't tried refreshing the token yet
        if (error.response?.status === 401 && 
            error.response?.data?.expired && 
            !originalRequest._retry) {
            
            originalRequest._retry = true;

            try {
                // Try to refresh the token
                const refreshToken = localStorage.getItem('refreshToken');
                if (!refreshToken) {
                    // No refresh token, force re-login
                    return handleAuthError();
                }

                // Call refresh token endpoint
                const response = await axios.post(`${API_URL}/auth/refresh-token`, {
                    refreshToken
                });

                const { token } = response.data.data;
                
                // Update stored token
                localStorage.setItem('token', token);
                
                // Update authorization header
                originalRequest.headers.Authorization = `Bearer ${token}`;
                
                // Retry the original request
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                // If refresh token fails, clear auth data and redirect to login
                return handleAuthError();
            }
        }

        return Promise.reject(error);
    }
);

// Function to handle authentication errors
const handleAuthError = () => {
    // Clear auth data
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    
    // Redirect to login page
    // Note: This is a simple approach - in a more complex app,
    // you might want to use a global event system or context API
    window.location.href = '/admin/login';
    
    return Promise.reject(new Error('Authentication failed. Please login again.'));
};

// Helper functions for API calls

/**
 * Makes a GET request
 * @param {string} url - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise} - API response
 */
export const get = async (url, params = {}) => {
    try {
        const response = await axiosInstance.get(url, { params });
        return response.data;
    } catch (error) {
        handleAxiosError(error);
        throw error;
    }
};

/**
 * Makes a POST request
 * @param {string} url - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise} - API response
 */
export const post = async (url, data = {}) => {
    try {
        const response = await axiosInstance.post(url, data);
        return response.data;
    } catch (error) {
        handleAxiosError(error);
        throw error;
    }
};

/**
 * Makes a PUT request
 * @param {string} url - API endpoint
 * @param {Object} data - Request body
 * @returns {Promise} - API response
 */
export const put = async (url, data = {}) => {
    try {
        const response = await axiosInstance.put(url, data);
        return response.data;
    } catch (error) {
        handleAxiosError(error);
        throw error;
    }
};

/**
 * Makes a DELETE request
 * @param {string} url - API endpoint
 * @param {Object} params - Query parameters
 * @returns {Promise} - API response
 */
export const del = async (url, params = {}) => {
    try {
        const response = await axiosInstance.delete(url, { params });
        return response.data;
    } catch (error) {
        handleAxiosError(error);
        throw error;
    }
};

/**
 * Makes a multipart POST request (for file uploads)
 * @param {string} url - API endpoint
 * @param {FormData} formData - Form data
 * @param {Function} onProgress - Progress callback
 * @returns {Promise} - API response
 */
export const upload = async (url, formData, onProgress = null) => {
    try {
        const response = await axiosInstance.post(url, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            },
            onUploadProgress: onProgress ? (progressEvent) => {
                const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                onProgress(percentCompleted);
            } : undefined
        });
        return response.data;
    } catch (error) {
        handleAxiosError(error);
        throw error;
    }
};

/**
 * Handle and format axios errors
 * @param {Error} error - Axios error
 */
const handleAxiosError = (error) => {
    if (error.response) {
        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        console.error('API Error Response:', error.response.data);
        error.message = error.response.data.message || 'An error occurred with the API response';
    } else if (error.request) {
        // The request was made but no response was received
        console.error('API No Response:', error.request);
        error.message = 'No response received from server. Please check your internet connection.';
    } else {
        // Something happened in setting up the request that triggered an Error
        console.error('API Request Error:', error.message);
    }
};

export default {
    axiosInstance,
    get,
    post,
    put,
    del,
    upload
};