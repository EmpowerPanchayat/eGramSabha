// File: frontend/src/utils/axiosConfig.js
import axios from 'axios';
import tokenManager from './tokenManager';

// Use environment variable for API URL if available, fallback to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Flag to prevent multiple concurrent refresh attempts
let isRefreshing = false;
// Store of requests to retry after token refresh
let failedQueue = [];

// Process the failed queue either resolving or rejecting based on refresh success
const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });

    failedQueue = [];
};

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
        // Don't add token for refresh token requests to avoid circular dependencies
        if (config.url === '/auth/refresh-token') {
            return config;
        }

        // Add token to request if it exists - use tokenManager instead of direct localStorage access
        const token = tokenManager.getToken();
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

        // Skip for refresh token or login requests to avoid loops
        if (originalRequest.url === '/auth/refresh-token' || originalRequest.url === '/auth/login') {
            return Promise.reject(error);
        }

        // If error is due to token expiry and we haven't tried refreshing the token yet
        if (error.response?.status === 401 &&
            (error.response?.data?.expired || error.response?.data?.message?.includes('expired')) &&
            !originalRequest._retry) {

            if (isRefreshing) {
                // If we're already refreshing, add this request to the queue
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                })
                    .then(token => {
                        originalRequest.headers.Authorization = `Bearer ${token}`;
                        return axiosInstance(originalRequest);
                    })
                    .catch(err => {
                        return Promise.reject(err);
                    });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                // Get refresh token via tokenManager
                const refreshToken = tokenManager.getRefreshToken();
                if (!refreshToken) {
                    isRefreshing = false;
                    processQueue(new Error('No refresh token'));
                    return handleAuthError();
                }

                // Use a standalone axios call to avoid interceptors
                const response = await axios.post(`${API_URL}/auth/refresh-token`, {
                    refreshToken
                });

                // Check for proper response structure
                if (!response.data?.data?.token) {
                    throw new Error('Invalid token refresh response');
                }

                const { token, refreshToken: newRefreshToken } = response.data.data;

                // Update stored tokens using tokenManager
                tokenManager.setTokens(token, newRefreshToken || refreshToken);

                // Update authorization header
                originalRequest.headers.Authorization = `Bearer ${token}`;

                // Process any requests that were waiting
                processQueue(null, token);
                isRefreshing = false;

                // Retry the original request
                return axiosInstance(originalRequest);
            } catch (refreshError) {
                console.error('Token refresh error:', refreshError);

                isRefreshing = false;
                processQueue(refreshError);

                // Handle different error scenarios
                if (refreshError.response?.status === 401 ||
                    refreshError.message?.includes('Invalid token') ||
                    refreshError.message?.includes('expired')) {
                    return handleAuthError();
                }

                // For other errors, just reject the request
                return Promise.reject(refreshError);
            }
        }

        // For other 401 errors that specifically mention token problems
        if (error.response?.status === 401) {
            const errorMsg = error.response?.data?.message || '';
            if (errorMsg.includes('token invalid') ||
                errorMsg.includes('token expired') ||
                errorMsg.includes('Token is invalid')) {
                return handleAuthError();
            }
        }

        return Promise.reject(error);
    }
);

// Function to handle authentication errors
const handleAuthError = () => {
    // Clear auth data using tokenManager
    tokenManager.clearTokens();

    // Store the current location for redirect after login
    const currentPath = window.location.pathname;
    if (currentPath !== '/admin/login' && currentPath !== '/citizen/login') {
        sessionStorage.setItem('redirectAfterLogin', currentPath);
    }

    // Redirect to appropriate login page based on current URL
    if (currentPath.includes('/admin') || currentPath.includes('/official')) {
        window.location.href = '/admin/login';
    } else {
        window.location.href = '/citizen/login';
    }

    return Promise.reject(new Error('Authentication failed. Please login again.'));
};

// Basic error handling
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

export default axiosInstance;