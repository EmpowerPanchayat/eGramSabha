import axios from 'axios';
import { API_BASE_URL } from '../config';

const gramSabhaService = {
  createGramSabha: async (gramSabhaData) => {
    const response = await axios.post(`${API_BASE_URL}/gram-sabha`, gramSabhaData);
    return response.data;
  },

  getGramSabhasByPanchayat: async (panchayatId) => {
    const response = await axios.get(`${API_BASE_URL}/gram-sabha/panchayat/${panchayatId}`);
    return response.data;
  },

  getGramSabhaById: async (id) => {
    const response = await axios.get(`${API_BASE_URL}/gram-sabha/${id}`);
    return response.data;
  },

  updateGramSabha: async (id, updates) => {
    const response = await axios.patch(`${API_BASE_URL}/gram-sabha/${id}`, updates);
    return response.data;
  },

  deleteGramSabha: async (id) => {
    const response = await axios.delete(`${API_BASE_URL}/gram-sabha/${id}`);
    return response.data;
  },

  addAttendance: async (id, attendanceData) => {
    const response = await axios.post(`${API_BASE_URL}/gram-sabha/${id}/attendance`, attendanceData);
    return response.data;
  },

  addAttachment: async (id, attachmentData) => {
    const response = await axios.post(`${API_BASE_URL}/gram-sabha/${id}/attachments`, attachmentData);
    return response.data;
  }
};

export default gramSabhaService; 