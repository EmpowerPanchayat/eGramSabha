// File: frontend/src/api/supportTicket.js
import tokenManager from '../utils/tokenManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Helper to get Authorization header
const getAuthHeaders = () => {
    const token = tokenManager.getToken();
    return token ? { 'Authorization': `Bearer ${token}` } : {};
};

/**
 * Submit a new support ticket
 * @param {Object} ticketData - Ticket data
 * @returns {Promise<Object>} Created ticket response
 */
export const submitSupportTicket = async (ticketData) => {
    try {
        const response = await fetch(`${API_URL}/support-tickets`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(ticketData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to submit support ticket');
        }

        return data;
    } catch (error) {
        console.error('Error submitting support ticket:', error);
        throw error;
    }
};

/**
 * Fetch support contacts for a panchayat
 * @param {string} panchayatId - Optional panchayat ID
 * @returns {Promise<Object>} Contacts data
 */
export const fetchSupportContacts = async (panchayatId = null) => {
    try {
        const url = panchayatId
            ? `${API_URL}/support-tickets/contacts/${panchayatId}`
            : `${API_URL}/support-tickets/contacts`;

        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch support contacts');
        }

        return data;
    } catch (error) {
        console.error('Error fetching support contacts:', error);
        throw error;
    }
};

/**
 * Fetch support tickets list (for officials/admins)
 * @param {Object} params - Query parameters
 * @returns {Promise<Object>} Tickets list with pagination
 */
export const fetchSupportTickets = async (params = {}) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            panchayatId,
            sortBy = 'createdAt',
            sort = 'desc'
        } = params;

        const queryParams = new URLSearchParams();
        queryParams.append('page', page.toString());
        queryParams.append('limit', limit.toString());
        queryParams.append('sortBy', sortBy);
        queryParams.append('sort', sort);

        if (status) queryParams.append('status', status);
        if (category) queryParams.append('category', category);
        if (panchayatId) queryParams.append('panchayatId', panchayatId);

        const response = await fetch(`${API_URL}/support-tickets?${queryParams.toString()}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch support tickets');
        }

        const total = parseInt(response.headers.get('x-total-count'), 10) || 0;

        return {
            ...data,
            total
        };
    } catch (error) {
        console.error('Error fetching support tickets:', error);
        throw error;
    }
};

/**
 * Fetch a single support ticket by ID
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Ticket data
 */
export const fetchSupportTicketById = async (ticketId) => {
    try {
        const response = await fetch(`${API_URL}/support-tickets/${ticketId}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch support ticket');
        }

        return data;
    } catch (error) {
        console.error('Error fetching support ticket:', error);
        throw error;
    }
};

/**
 * Update support ticket status (admin only)
 * @param {string} ticketId - Ticket ID
 * @param {string} status - New status
 * @param {string} resolutionNotes - Optional resolution notes
 * @returns {Promise<Object>} Updated ticket
 */
export const updateSupportTicketStatus = async (ticketId, status, resolutionNotes = null) => {
    try {
        const body = { status };
        if (resolutionNotes) {
            body.resolutionNotes = resolutionNotes;
        }

        const response = await fetch(`${API_URL}/support-tickets/${ticketId}/status`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            },
            body: JSON.stringify(body)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to update ticket status');
        }

        return data;
    } catch (error) {
        console.error('Error updating ticket status:', error);
        throw error;
    }
};

/**
 * Fetch ticket categories
 * @returns {Promise<Object>} Categories grouped by type
 */
export const fetchSupportCategories = async () => {
    try {
        const response = await fetch(`${API_URL}/support-tickets/categories/list`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch categories');
        }

        return data;
    } catch (error) {
        console.error('Error fetching categories:', error);
        throw error;
    }
};

/**
 * Get transcription status for a ticket
 * @param {string} ticketId - Ticket ID
 * @returns {Promise<Object>} Transcription data
 */
export const getTicketTranscription = async (ticketId) => {
    try {
        const response = await fetch(`${API_URL}/support-tickets/${ticketId}/transcription`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                ...getAuthHeaders()
            }
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to fetch transcription');
        }

        return data;
    } catch (error) {
        console.error('Error fetching transcription:', error);
        throw error;
    }
};
