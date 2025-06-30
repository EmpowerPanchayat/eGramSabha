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
/**
 * Fetches paginated issues based on filters, sorting, and search.
 *
 * @param {Object} params - The parameters for the API call.
 * @returns {Promise<{ data: any[], total: number }>}
 */
export const fetchAllIssues = async (params = {}) => {
    const {
        page = 0,
        limit = 10,
        sortBy = 'createdAt',
        sort = 'desc',
        userId,
        panchayatId,
        category,
        subcategory,
        status,
        createdOn,
        creator,
        createdFor,
        createdForId,
        searchText,
    } = params;

    // Build query params dynamically
    const queryObject = {
        page: page + 1,
        limit,
        sortBy,
        sort,
        userId,
        panchayatId,
        category,
        subcategory,
        status,
        createdOn,
        creator,
        createdFor,
        createdForId,
        searchText,
    };

    const queryParams = new URLSearchParams();

    Object.entries(queryObject).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            queryParams.append(key, value);
        }
    });

    const url = `${API_URL}/issues?${queryParams.toString()}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        if (!response.ok) {
            if (response.status === 401) {
                const json = await response.json();
                if (json?.expired) {
                    const refreshed = await handleTokenRefresh();
                    if (!refreshed) throw new Error('Session expired. Please login again.');
                    return { retry: true };
                }
            }
            throw new Error('Failed to fetch issues');
        }

        const total = parseInt(response.headers.get('x-total-count'), 10) || 0;
        const data = await response.json();

        return { data, total };
    } catch (error) {
        console.error('Fetch error:', error);
        throw error;
    }
};

/**
 * Get transcription status for an issue
 * @param {string} issueId - The issue ID
 * @returns {Promise<Object>} Transcription status and data
 */
export const getTranscriptionStatus = async (issueId) => {
    console.log(`[FrontendAPI] Getting transcription status for issue: ${issueId}`);
    
    try {
        const response = await fetch(`${API_URL}/issues/${issueId}/transcription`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        console.log(`[FrontendAPI] Transcription status response:`, {
            issueId,
            status: response.status,
            ok: response.ok
        });

        if (!response.ok) {
            if (response.status === 401) {
                const json = await response.json();
                if (json?.expired) {
                    console.log(`[FrontendAPI] Token expired, attempting refresh for issue: ${issueId}`);
                    const refreshed = await handleTokenRefresh();
                    if (!refreshed) throw new Error('Session expired. Please login again.');
                    return { retry: true };
                }
            }
            throw new Error('Failed to fetch transcription status');
        }

        const data = await response.json();
        console.log(`[FrontendAPI] Transcription status data received:`, {
            issueId,
            success: data.success,
            hasTranscription: !!data.transcription,
            transcriptionStatus: data.transcription?.status
        });
        
        return data;
    } catch (error) {
        console.error(`[FrontendAPI] Error fetching transcription status:`, {
            issueId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};

/**
 * Retry failed transcription for an issue
 * @param {string} issueId - The issue ID
 * @returns {Promise<Object>} Retry response
 */
export const retryTranscription = async (issueId) => {
    console.log(`[FrontendAPI] Retrying transcription for issue: ${issueId}`);
    
    try {
        const response = await fetch(`${API_URL}/issues/${issueId}/transcription/retry`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders(),
            },
        });

        console.log(`[FrontendAPI] Transcription retry response:`, {
            issueId,
            status: response.status,
            ok: response.ok
        });

        if (!response.ok) {
            if (response.status === 401) {
                const json = await response.json();
                if (json?.expired) {
                    console.log(`[FrontendAPI] Token expired, attempting refresh for retry: ${issueId}`);
                    const refreshed = await handleTokenRefresh();
                    if (!refreshed) throw new Error('Session expired. Please login again.');
                    return { retry: true };
                }
            }
            throw new Error('Failed to retry transcription');
        }

        const data = await response.json();
        console.log(`[FrontendAPI] Transcription retry successful:`, {
            issueId,
            success: data.success,
            message: data.message,
            transcriptionStatus: data.transcription?.status
        });
        
        return data;
    } catch (error) {
        console.error(`[FrontendAPI] Error retrying transcription:`, {
            issueId,
            error: error.message,
            stack: error.stack
        });
        throw error;
    }
};
