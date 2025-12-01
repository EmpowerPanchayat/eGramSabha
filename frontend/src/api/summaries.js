// api/summaries.js
import axios from "../utils/axiosConfig";

/**
 * Fetches the issue summary for a given panchayat, containing available agenda items.
 * @param {string} panchayatId - The ID of the panchayat.
 * @returns {Promise<any>}
 */
export const fetchAvailableAgendaItems = async (panchayatId) => {
  try {
    const response = await axios.get(`/summaries/panchayat/${panchayatId}`);
    // The backend returns { success: true, summary: { agendaItems: [], issues: [] } }
    // We only need the agendaItems for this purpose.
    return response.data?.summary?.agendaItems || [];
  } catch (error) {
    console.error("Error fetching available agenda items:", error.response?.data || error.message);
    throw new Error(error.response?.data?.message || "Failed to fetch available agenda items");
  }
};
