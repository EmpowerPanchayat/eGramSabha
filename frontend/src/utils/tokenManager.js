// File: frontend/src/utils/tokenManager.js
import axios from 'axios';

const TOKEN_KEY = 'token';
const REFRESH_TOKEN_KEY = 'refreshToken';

export const tokenManager = {
    // Get tokens
    getToken: () => localStorage.getItem(TOKEN_KEY),
    getRefreshToken: () => localStorage.getItem(REFRESH_TOKEN_KEY),

    // Set tokens
    setTokens: (token, refreshToken) => {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            // Update the default axios authorization header
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
        if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
    },

    // Set just the access token
    setToken: (token) => {
        if (token) {
            localStorage.setItem(TOKEN_KEY, token);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
    },

    // Set just the refresh token
    setRefreshToken: (refreshToken) => {
        if (refreshToken) {
            localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
    },

    // Clear tokens
    clearTokens: () => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        delete axios.defaults.headers.common['Authorization'];
    },

    // Check if tokens exist
    hasTokens: () => {
        return !!localStorage.getItem(TOKEN_KEY) && !!localStorage.getItem(REFRESH_TOKEN_KEY);
    },

    // Update axios headers
    updateAxiosHeaders: () => {
        const token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } else {
            delete axios.defaults.headers.common['Authorization'];
        }
    },

    // Decode JWT token to get user info (without verification)
    decodeToken: (token = null) => {
        try {
            const tokenToUse = token || localStorage.getItem(TOKEN_KEY);
            if (!tokenToUse) return null;

            // JWT tokens are made of three parts: header.payload.signature
            const payload = tokenToUse.split('.')[1];
            // The payload is base64 encoded
            return JSON.parse(atob(payload));
        } catch (e) {
            console.error('Error decoding token:', e);
            return null;
        }
    },

    // Get user ID from token
    getUserIdFromToken: () => {
        const decoded = tokenManager.decodeToken();
        return decoded?.id || null;
    }
};

// Initialize axios headers on module load
tokenManager.updateAxiosHeaders();

export default tokenManager;