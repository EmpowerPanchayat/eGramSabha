import api from '../utils/axiosConfig';

export const fetchIssueSummary = async (panchayatId) => {
    try {
        const response = await api.get(`/summaries/panchayat/${panchayatId}`);
        return response.data;
    } catch (error) {
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