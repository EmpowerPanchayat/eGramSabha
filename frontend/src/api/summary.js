import api from '../utils/axiosConfig';

export const fetchIssueSummary = async (panchayatId) => {
    try {
        const response = await api.get(`/summaries/panchayat/${panchayatId}`);
        return response.data;
    } catch (error) {
        if(error.response && error.response.status === 404) {
            return { success: false, message: 'No summary found for this panchayat.' };
        }
        throw error.response ? error.response.data : new Error('Network error');
    }
};

export const updateAgendaSummary = async (panchayatId, agendaItems) => {
    try {
        const response = await api.patch(`/summaries/panchayat/${panchayatId}/agenda`, { agendaItems });
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network error');
    }
};

// Manually starts agenda generation for a panchayat instead of waiting for the hourly cron.
// Only kicks off the LLM request — call fetchAgendaResult afterwards to pick up the result.
export const generateAgendaNow = async (panchayatId) => {
    try {
        const response = await api.post(`/summaries/panchayat/${panchayatId}/generate`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network error');
    }
};

// Manually checks for the result of an in-flight agenda generation request,
// instead of waiting for the 5-minute cron.
export const fetchAgendaResult = async (panchayatId) => {
    try {
        const response = await api.post(`/summaries/panchayat/${panchayatId}/fetch-result`);
        return response.data;
    } catch (error) {
        throw error.response ? error.response.data : new Error('Network error');
    }
};