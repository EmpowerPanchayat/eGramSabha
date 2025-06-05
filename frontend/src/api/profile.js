// File: frontend/src/api/profile.js (Updated with missing exports)
import axiosInstance from '../utils/axiosConfig';

/**
 * Get user profile based on endpoint
 * @param {string} endpoint - API endpoint to use
 * @returns {Promise} - API response with user data
 */
export const getProfile = async (endpoint = '/auth/me') => {
    try {
        const response = await axiosInstance.get(endpoint);
        return response.data;
    } catch (error) {
        console.error('API Error in getProfile:', error);
        throw error.response?.data || { message: 'Failed to get user profile' };
    }
};

/**
 * Get admin profile
 * @returns {Promise} - API response with admin user data
 */
export const getAdminProfile = async () => {
    return getProfile('/auth/admin/me');
};

/**
 * Get official profile
 * @returns {Promise} - API response with official user data
 */
export const getOfficialProfile = async () => {
    return getProfile('/auth/official/me');
};

/**
 * Get citizen profile
 * @returns {Promise} - API response with citizen user data
 */
export const getCitizenProfile = async () => {
    return getProfile('/auth/citizen/me');
};

/**
 * Update user profile
 * @param {Object} profileData - Profile data to update
 * @param {string} userType - Type of user (ADMIN, OFFICIAL, CITIZEN)
 * @returns {Promise} - API response with updated user data
 */
export const updateProfile = async (profileData, userType = null) => {
    try {
        let endpoint = '/auth/profile';

        // Use the appropriate endpoint based on user type
        if (userType) {
            switch (userType.toUpperCase()) {
                case 'ADMIN':
                    endpoint = '/auth/admin/profile';
                    break;
                case 'OFFICIAL':
                    endpoint = '/auth/official/profile';
                    break;
                case 'CITIZEN':
                    endpoint = '/auth/citizen/profile';
                    break;
                default:
                    // Use default endpoint
                    break;
            }
        }

        const response = await axiosInstance.patch(endpoint, profileData);
        return response.data;
    } catch (error) {
        console.error('API Error in updateProfile:', error);
        throw error.response?.data || { message: 'Failed to update profile' };
    }
};

/**
 * Change user password
 * @param {Object} passwordData - Object with currentPassword and newPassword
 * @param {string} userType - Type of user (ADMIN, OFFICIAL, CITIZEN)
 * @returns {Promise} - API response
 */
export const changePassword = async (passwordData, userType = null) => {
    try {
        let endpoint = '/auth/change-password'; // Default/legacy endpoint

        // Use the appropriate endpoint based on user type
        if (userType) {
            switch (userType.toUpperCase()) {
                case 'ADMIN':
                    endpoint = '/auth/admin/change-password';
                    break;
                case 'OFFICIAL':
                    endpoint = '/auth/official/change-password';
                    break;
                case 'CITIZEN':
                    endpoint = '/auth/citizen/change-password';
                    break;
                default:
                    // Use default endpoint
                    break;
            }
        }

        const response = await axiosInstance.post(endpoint, passwordData);
        return response.data;
    } catch (error) {
        console.error('API Error in changePassword:', error);
        throw error.response?.data || { message: 'Failed to change password' };
    }
};

export default {
    getProfile,
    getAdminProfile,
    getOfficialProfile,
    getCitizenProfile,
    updateProfile,
    changePassword
};