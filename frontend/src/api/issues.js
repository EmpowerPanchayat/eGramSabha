
import tokenManager from '../utils/tokenManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper to get Authorization header for issues endpoints
const getAuthHeaders = () => {
    const token = tokenManager.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};


// Add a token refresh handler function
const handleTokenRefresh = async () => {
    try {
        const refreshToken = tokenManager.getRefreshToken();
        if (!refreshToken) {
            return false;
        }

        const response = await fetch(
            `${API_URL}/auth/citizen/refresh-token`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${localStorage.getItem("token")}`,
                },
                body: JSON.stringify({ refreshToken }),
            }
        );

        if (!response.ok) {
            return false;
        }

        const data = await response.json();
        if (data.success && data.data && data.data.token) {
            tokenManager.setTokens(data.data.token, data.data.refreshToken || refreshToken);
            return true;
        }

        return false;
    } catch (error) {
        console.error('Error refreshing token:', error);
        return false;
    }
};

export const fetchAllIssues = async ({ url, method = 'GET', headers = {}, body = null }) => {
    const defaultHeaders = {
        "Content-Type": "application/json",
        ...getAuthHeaders(), // Assuming this is globally available
    };

    try {
        const response = await fetch(`${API_URL}/${url}`, {
            method,
            headers: { ...defaultHeaders, ...headers },
            ...(body && { body: JSON.stringify(body) }),
        });

        if (!response.ok) {
            if (response.status === 401) {
                const json = await response.json();
                if (json?.expired) {
                    const refreshed = await handleTokenRefresh();
                    if (!refreshed) throw new Error('Session expired. Please login again.');
                    return { retry: true }; // Indicate a retry is needed
                }
            }
            throw new Error('Failed to fetch data');
        }

        const data = await response.json();
        return { data };
    } catch (error) {
        console.error("Fetch error:", error);
        throw error;
    }
};
