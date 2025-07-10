const axios = require('axios');
const { logCurlCommand } = require('./curlLogger');

const VIDEO_MOM_BACKEND_URL = process.env.VIDEO_MOM_BACKEND_URL || 'http://localhost:8000';

const agendaAPI = axios.create({
    baseURL: VIDEO_MOM_BACKEND_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

/**
 * Initiates a new issue summary generation.
 * @param {Array<Object>} issues - Array of issue objects to be summarized.
 * @param {string} language - The primary language for the summary.
 * @returns {Promise<Object>} The response from the backend.
 */
const initiateNewSummary = async (issues, language = 'en') => {
    try {
        const payload = {
            issues: issues.map(issue => ({
                id: issue._id.toString(),
                transcription_text: issue.transcription.enhancedEnglishTranscription || issue.transcription.text,
                category: issue.category,
                subcategory: issue.subcategory
            }))
        };
        logCurlCommand('POST', `${VIDEO_MOM_BACKEND_URL}/agenda/generate/${language}`, agendaAPI.defaults.headers, payload);
        const response = await agendaAPI.post(`/agenda/generate/${language}`, payload);
        return response.data;
    } catch (error) {
        console.error('Error initiating new summary generation:', error.response ? error.response.data : error.message);
        throw new Error('Failed to initiate new summary generation.');
    }
};

/**
 * Initiates an update for an existing issue summary.
 * @param {Array<Object>} currentAgenda - The current agenda items.
 * @param {Array<Object>} newIssues - The new issues to be added.
 * @param {string} language - The primary language for the summary.
 * @returns {Promise<Object>} The response from the backend.
 */
const initiateUpdateSummary = async (currentAgenda, newIssues, language = 'en') => {
    try {
        const payload = {
            current_agenda: currentAgenda,
            new_issues: newIssues.map(issue => ({
                id: issue._id.toString(),
                transcription_text: issue.transcription.enhancedEnglishTranscription || issue.transcription.text,
                category: issue.category,
                subcategory: issue.subcategory
            }))
        };
        logCurlCommand('POST', `${VIDEO_MOM_BACKEND_URL}/agenda/update/${language}`, agendaAPI.defaults.headers, payload);
        const response = await agendaAPI.post(`/agenda/update/${language}`, payload);
        return response.data;
    } catch (error) {
        console.error('Error initiating summary update:', error.response ? error.response.data : error.message);
        throw new Error('Failed to initiate summary update.');
    }
};

/**
 * Checks the status of a summary generation request.
 * @param {string} requestId - The ID of the request to check.
 * @returns {Promise<Object>} The status response from the backend.
 */
const checkSummaryStatus = async (requestId) => {
    try {
        logCurlCommand('GET', `${VIDEO_MOM_BACKEND_URL}/request/${requestId}/status`, agendaAPI.defaults.headers);
        const response = await agendaAPI.get(`/request/${requestId}/status`);
        return response.data;
    } catch (error) {
        console.error(`Error checking summary status for request ${requestId}:`, error.response ? error.response.data : error.message);
        throw new Error('Failed to check summary status.');
    }
};

/**
 * Fetches the result of a completed summary generation request.
 * @param {string} resultUrl - The result URL from the initial request response.
 * @returns {Promise<Object>} The summary result from the backend.
 */
const getSummaryResult = async (resultUrl) => {
    try {
        logCurlCommand('GET', `${VIDEO_MOM_BACKEND_URL}${resultUrl}`, agendaAPI.defaults.headers);
        const response = await agendaAPI.get(resultUrl);
        return response.data;
    } catch (error) {
        console.error(`Error fetching summary result from ${resultUrl}:`, error.response ? error.response.data : error.message);
        throw new Error('Failed to fetch summary result.');
    }
};


module.exports = {
    initiateNewSummary,
    initiateUpdateSummary,
    checkSummaryStatus,
    getSummaryResult
}; 