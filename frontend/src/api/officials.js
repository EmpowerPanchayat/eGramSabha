// File: frontend/src/api/officials.js (Enhanced with linking functionality)
import axios from 'axios';

// Base URL from environment variables or default
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

/**
 * Fetch all officials
 * @param {Object} params - Optional query parameters (panchayatId, etc.)
 * @returns {Promise} - API response
 */
export const fetchOfficials = async (params = {}) => {
    try {
        const response = await axios.get(`${API_URL}/officials`, {
            params,
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in fetchOfficials:', error);
        throw error.response?.data || { message: 'Failed to fetch officials' };
    }
};

/**
 * Fetch a single official by ID
 * @param {string} id - Official ID
 * @returns {Promise} - API response
 */
export const fetchOfficial = async (id) => {
    try {
        const response = await axios.get(`${API_URL}/officials/${id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in fetchOfficial:', error);
        throw error.response?.data || { message: 'Failed to fetch official' };
    }
};

/**
 * Create a new official
 * @param {Object} officialData - Official data
 * @returns {Promise} - API response
 */
export const createOfficial = async (officialData) => {
    try {
        const response = await axios.post(`${API_URL}/officials`, officialData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in createOfficial:', error);
        throw error.response?.data || { message: 'Failed to create official' };
    }
};

/**
 * Update an existing official
 * @param {string} id - Official ID
 * @param {Object} officialData - Updated official data
 * @returns {Promise} - API response
 */
export const updateOfficial = async (id, officialData) => {
    try {
        const response = await axios.put(`${API_URL}/officials/${id}`, officialData, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in updateOfficial:', error);
        throw error.response?.data || { message: 'Failed to update official' };
    }
};

/**
 * Link an official with a citizen
 * @param {string} officialId - Official ID
 * @param {string} citizenId - Citizen ID
 * @returns {Promise} - API response
 */
export const linkOfficialWithCitizen = async (officialId, citizenId) => {
    try {
        const response = await axios.post(`${API_URL}/officials/${officialId}/link-citizen`,
            { citizenId },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            }
        );

        return response.data;
    } catch (error) {
        console.error('API Error in linkOfficialWithCitizen:', error);
        throw error.response?.data || { message: 'Failed to link official with citizen' };
    }
};

/**
 * Delete an official
 * @param {string} id - Official ID
 * @returns {Promise} - API response
 */
export const deleteOfficial = async (id) => {
    try {
        const response = await axios.delete(`${API_URL}/officials/${id}`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in deleteOfficial:', error);
        throw error.response?.data || { message: 'Failed to delete official' };
    }
};

/**
 * Reset an official's password
 * @param {string} id - Official ID
 * @returns {Promise} - API response with new password
 */
export const resetPassword = async (id) => {
    try {
        const response = await axios.post(`${API_URL}/officials/${id}/reset-password`, {}, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in resetPassword:', error);
        throw error.response?.data || { message: 'Failed to reset password' };
    }
};

/**
 * Toggle active status of an official
 * @param {string} id - Official ID
 * @returns {Promise} - API response
 */
export const toggleOfficialStatus = async (id) => {
    try {
        const response = await axios.patch(`${API_URL}/officials/${id}/toggle-status`, {}, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in toggleOfficialStatus:', error);
        throw error.response?.data || { message: 'Failed to update official status' };
    }
};

/**
 * Fetch issues for an official's panchayat
 * @param {string} id - Official ID
 * @returns {Promise} - API response
 */
export const fetchOfficialIssues = async (id) => {
    try {
        const response = await axios.get(`${API_URL}/officials/${id}/issues`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in fetchOfficialIssues:', error);
        throw error.response?.data || { message: 'Failed to fetch issues' };
    }
};

/**
 * Fetch statistics for a panchayat
 * @param {string} panchayatId - Panchayat ID
 * @returns {Promise} - API response
 */
export const fetchPanchayatStats = async (panchayatId) => {
    try {
        const response = await axios.get(`${API_URL}/panchayats/${panchayatId}/stats`, {
            headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in fetchPanchayatStats:', error);
        throw error.response?.data || { message: 'Failed to fetch panchayat statistics' };
    }
};