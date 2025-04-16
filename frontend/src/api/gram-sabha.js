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
                const { token, refreshToken: newRefreshToken } = response.data.data;

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
 * Fetch all Gram Sabha meetings for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise} - API response
 */
export const fetchGramSabhaMeetings = async (panchayatId) => {
    try {
        const response = await api.get(`/gram-sabha/panchayat/${panchayatId}`);
        return response.data;
    } catch (error) {
        console.error('API Error in fetchGramSabhaMeetings:', error);
        throw error.response?.data || { message: 'Failed to fetch Gram Sabha meetings' };
    }
};

/**
 * Fetch a single Gram Sabha meeting by ID
 * @param {string} id - Gram Sabha meeting ID
 * @returns {Promise} - API response
 */
export const fetchGramSabhaMeeting = async (id) => {
    try {
        const response = await api.get(`/gram-sabha/${id}`);
        return response.data;
    } catch (error) {
        console.error('API Error in fetchGramSabhaMeeting:', error);
        throw error.response?.data || { message: 'Failed to fetch Gram Sabha meeting' };
    }
};

/**
 * Create a new Gram Sabha meeting
 * @param {Object} meetingData - Gram Sabha meeting data
 * @returns {Promise} - API response
 */
export const createGramSabhaMeeting = async (meetingData) => {
    try {
        const response = await api.post('/gram-sabha', meetingData);
        return response.data;
    } catch (error) {
        console.error('API Error in createGramSabhaMeeting:', error);
        throw error.response?.data || { message: 'Failed to create Gram Sabha meeting' };
    }
};

/**
 * Update an existing Gram Sabha meeting
 * @param {string} id - Gram Sabha meeting ID
 * @param {Object} meetingData - Updated meeting data
 * @returns {Promise} - API response
 */
export const updateGramSabhaMeeting = async (id, meetingData) => {
    try {
        const response = await api.patch(`/gram-sabha/${id}`, meetingData);
        return response.data;
    } catch (error) {
        console.error('API Error in updateGramSabhaMeeting:', error);
        throw error.response?.data || { message: 'Failed to update Gram Sabha meeting' };
    }
};

/**
 * Delete a Gram Sabha meeting
 * @param {string} id - Gram Sabha meeting ID
 * @returns {Promise} - API response
 */
export const deleteGramSabhaMeeting = async (id) => {
    try {
        const response = await api.delete(`/gram-sabha/${id}`);
        return response.data;
    } catch (error) {
        console.error('API Error in deleteGramSabhaMeeting:', error);
        throw error.response?.data || { message: 'Failed to delete Gram Sabha meeting' };
    }
};

/**
 * Add attendance to a Gram Sabha meeting
 * @param {string} id - Gram Sabha meeting ID
 * @param {Object} attendanceData - Attendance data
 * @returns {Promise} - API response
 */
export const addAttendance = async (id, attendanceData) => {
    try {
        const response = await api.post(`/gram-sabha/${id}/attendance`, attendanceData);
        return response.data;
    } catch (error) {
        console.error('API Error in addAttendance:', error);
        throw error.response?.data || { message: 'Failed to add attendance' };
    }
};

/**
 * Add attachment to a Gram Sabha meeting
 * @param {string} id - Gram Sabha meeting ID
 * @param {Object} attachmentData - Attachment data
 * @returns {Promise} - API response
 */
export const addAttachment = async (id, attachmentData) => {
    try {
        const response = await api.post(`/gram-sabha/${id}/attachments`, attachmentData);
        return response.data;
    } catch (error) {
        console.error('API Error in addAttachment:', error);
        throw error.response?.data || { message: 'Failed to add attachment' };
    }
}; 