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
 * @param {FormData} formData - Form data including files
 * @returns {Promise} - API response
 */
export const createGramSabhaMeeting = async (formData) => {
    try {
        const response = await api.post('/gram-sabha', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error('API Error in createGramSabhaMeeting:', error);
        throw error.response?.data || { message: 'Failed to create Gram Sabha meeting' };
    }
};

/**
 * Update an existing Gram Sabha meeting
 * @param {string} id - Gram Sabha meeting ID
 * @param {FormData} formData - Updated form data including files
 * @returns {Promise} - API response
 */
export const updateGramSabhaMeeting = async (id, formData) => {
    try {
        // Check if formData has any entries to update
        if ([...formData.keys()].length === 0) {
            return { message: 'No changes to update' };
        }

        const response = await api.patch(`/gram-sabha/${id}`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
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
 * @param {FormData} formData - Attachment form data
 * @returns {Promise} - API response
 */
export const addAttachment = async (id, formData) => {
    try {
        const response = await api.post(`/gram-sabha/${id}/attachments`, formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });
        return response.data;
    } catch (error) {
        console.error('API Error in addAttachment:', error);
        throw error.response?.data || { message: 'Failed to add attachment' };
    }
};

/**
 * Fetch upcoming Gram Sabha meetings for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise} - API response
 */
export const fetchUpcomingMeetings = async (panchayatId) => {
    try {
        const response = await api.get(`/gram-sabha/panchayat/${panchayatId}/upcoming`);
        return response.data;
    } catch (error) {
        console.error('API Error in fetchUpcomingMeetings:', error);
        throw error.response?.data || { message: 'Failed to fetch upcoming meetings' };
    }
};

/**
 * Fetch past Gram Sabha meetings for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise} - API response
 */
export const fetchPastMeetings = async (panchayatId) => {
    try {
        const response = await api.get(`/gram-sabha/panchayat/${panchayatId}/past`);
        return response.data;
    } catch (error) {
        console.error('API Error in fetchPastMeetings:', error);
        throw error.response?.data || { message: 'Failed to fetch past meetings' };
    }
};

/**
 * Submit RSVP for a meeting
 * @param {string} meetingId - Gram Sabha meeting ID
 * @param {Object} rsvpData - RSVP data including status and optional comments
 * @param {string} userId - User ID
 * @returns {Promise} - API response
 */
export const submitRSVP = async (meetingId, rsvpData, userId) => {
    try {
        console.log({meetingId, rsvpData, userId});
        const response = await api.post(`/gram-sabha/${meetingId}/rsvp/${userId}`, rsvpData);
        return response.data;
    } catch (error) {
        console.error('API Error in submitRSVP:', error);
        throw error.response?.data || { message: 'Failed to submit RSVP' };
    }
};

/**
 * Get RSVP status for a meeting
 * @param {string} meetingId - Gram Sabha meeting ID
 * @param {string} userId - User ID
 * @returns {Promise} - API response
 */
export const getRSVPStatus = async (meetingId, userId) => {
    try {
        const response = await api.get(`/gram-sabha/${meetingId}/rsvp/${userId}`);
        return response.data;
    } catch (error) {
        console.error('API Error in getRSVPStatus:', error);
        throw error.response?.data || { message: 'Failed to get RSVP status' };
    }
};

/**
 * Get RSVP statistics for a meeting
 * @param {string} meetingId - Gram Sabha meeting ID
 * @returns {Promise} - API response
 */
export const getRSVPStats = async (meetingId) => {
    try {
        const response = await api.get(`/gram-sabha/${meetingId}/rsvp-stats`);
        return response.data;
    } catch (error) {
        console.error('API Error in getRSVPStats:', error);
        throw error.response?.data || { message: 'Failed to get RSVP statistics' };
    }
};

/**
 * Fetch today's Gram Sabha meetings for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise} - API response
 */
export const fetchTodaysMeetings = async (panchayatId) => {
    try {
        const response = await api.get(`/gram-sabha/panchayat/${panchayatId}/today`);
        return response.data;
    } catch (error) {
        console.error('API Error in fetchTodaysMeetings:', error);
        throw error.response?.data || { message: 'Failed to fetch today\'s meetings' };
    }
};

/**
 * Fetch attendance data of past Gram Sabha meeting by ID to export in a file
 * @param {string} id - Gram Sabha meeting ID
 * @returns {Promise} - API response
 */
export const fetchGramSabhaMeetingAttendanceData = async (id) => {
    try {
        const response = await api.get(`/gram-sabha/${id}/attendance`);
        return response.data;
    } catch (error) {
        console.error('API Error in fetchGramSabhaMeetingAttendanceData:', error);
        throw error.response?.data || { message: 'Failed to fetch attendance data of past Gram Sabha meeting to export in a file.' };
    }
};

/**
 * Get Attendance statistics for a meeting
 * @param {string} meetingId - Gram Sabha meeting ID
 * @returns {Promise<Object>} - Mapped attendance statistics
 */
export const getAttendanceStats = async (meetingId) => {
  try {
    const response = await fetch(
      `${API_URL}/gram-sabha/${meetingId}/attendance-stats`,
      {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch attendance statistics");
    }

    const data = await response.json();

    return {
      total: data.totalRegistered || 0,
      totalVoters: data.totalVoters || 0,
      present: data.present || 0,
      quorum: data.quorumRequired || 0,
      quorumMet: (data.present || 0) >= (data.quorumRequired || 0),
    };
  } catch (error) {
    console.error("API Error in getAttendanceStats:", error);
    // Fallback to default empty stats
    return {
      total: 0,
      totalVoters: 0,
      present: 0,
      quorum: 0,
      quorumMet: false,
    };
  }
};