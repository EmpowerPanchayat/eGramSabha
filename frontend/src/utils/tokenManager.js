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
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }
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
    }
}; 