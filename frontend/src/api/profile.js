// File: frontend/src/api/profile.js
import axiosInstance from '../utils/axiosConfig';

/**
 * Get current user's profile
 * @returns {Promise} - API response with user profile data
 */
export const getProfile = async () => {
    try {
        const response = await axiosInstance.get('/auth/me');
        return response.data;
    } catch (error) {
        console.error('API Error in getProfile:', error);
        throw error.response?.data || { message: 'Failed to get profile data' };
    }
};

/**
 * Update current user's profile
 * @param {Object} profileData - Updated profile data
 * @returns {Promise} - API response
 */
export const updateProfile = async (profileData) => {
    try {
        const userId = getUserIdFromToken();

        if (!userId) {
            throw new Error('User is not authenticated');
        }

        const response = await axiosInstance.put(`/officials/${userId}`, profileData);
        return response.data;
    } catch (error) {
        console.error('API Error in updateProfile:', error);
        throw error.response?.data || { message: 'Failed to update profile' };
    }
};

/**
 * Change password for current user
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise} - API response
 */
export const changePassword = async (currentPassword, newPassword) => {
    try {
        const response = await axiosInstance.post('/auth/change-password', {
            currentPassword,
            newPassword
        });

        return response.data;
    } catch (error) {
        console.error('API Error in changePassword:', error);
        throw error.response?.data || { message: 'Failed to change password' };
    }
};

/**
 * Upload avatar image
 * @param {File} file - Avatar image file
 * @returns {Promise} - API response with new avatar URL
 */
export const uploadAvatar = async (file) => {
    try {
        const formData = new FormData();
        formData.append('avatar', file);

        const response = await axiosInstance.post('/officials/avatar', formData, {
            headers: {
                'Content-Type': 'multipart/form-data'
            }
        });

        return response.data;
    } catch (error) {
        console.error('API Error in uploadAvatar:', error);
        throw error.response?.data || { message: 'Failed to upload avatar' };
    }
};

/**
 * Helper function to get user ID from JWT token
 * @returns {string|null} - User ID or null if not found
 */
function getUserIdFromToken() {
    const token = localStorage.getItem('token');
    if (!token) return null;

    try {
        // JWT tokens are made of three parts: header.payload.signature
        const payload = token.split('.')[1];
        // The payload is base64 encoded
        const decodedPayload = JSON.parse(atob(payload));
        return decodedPayload.id;
    } catch (e) {
        console.error('Error parsing token:', e);
        return null;
    }
}