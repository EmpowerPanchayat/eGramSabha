const fetch = require('node-fetch');
const FormData = require('form-data');
const { logCurlCommand } = require('./curlLogger');

class TranscriptionService {
    constructor() {
        this.baseUrl = process.env.VIDEO_MOM_BACKEND_URL || 'http://localhost:8000';
        this.timeout = 30000; // 30 seconds timeout
    }

    /**
     * Get language from panchayat model, default to Hindi
     * @param {string} panchayatId - Panchayat ID
     * @returns {Promise<string>} Language for transcription
     */
    async getPanchayatLanguage(panchayatId) {
        try {
            const Panchayat = require('../models/Panchayat');
            const panchayat = await Panchayat.findById(panchayatId);
            const language = panchayat?.language.toLowerCase() || 'hindi';
            return language;
        } catch (error) {
            return 'Hindi'; // Default fallback
        }
    }

    /**
     * Map panchayat language to video-mom-backend supported languages
     * @param {string} panchayatLanguage - Language from panchayat model
     * @returns {string} Mapped language for video-mom-backend
     */
    mapLanguageToSupported(panchayatLanguage) {
        const languageMap = {
            'Hindi': 'Hindi',
            'English': 'English',
            'Gujarati': 'Gujarati',
            'Marathi': 'Marathi',
            'Telugu': 'Telugu',
            'Bengali': 'Bengali',
            'Kannada': 'Kannada',
            'Malayalam': 'Malayalam',
            'Tamil': 'Tamil',
            'Punjabi': 'Punjabi',
            'Urdu': 'Urdu',
            'Odia': 'Oriya',
            'Assamese': 'Assamese'
        };
        
        const mappedLanguage = languageMap[panchayatLanguage] || 'Hindi';
        return mappedLanguage;
    }

    /**
     * Convert base64 audio to buffer
     * @param {string} base64Audio - Base64 encoded audio data
     * @returns {Buffer} Audio buffer
     */
    base64ToBuffer(base64Audio) {
        try {
            // Remove data URL prefix if present
            const base64Data = base64Audio.replace(/^data:audio\/[^;]+;base64,/, '');
            const buffer = Buffer.from(base64Data, 'base64');
            return buffer;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Initiate transcription for an issue
     * @param {string} base64Audio - Base64 encoded audio data
     * @param {string} language - Language for transcription
     * @param {string} issueId - Issue ID for reference
     * @returns {Promise<Object>} Transcription response
     */
    async initiateTranscription(base64Audio, language, issueId) {
        try {
            const supportedLanguage = this.mapLanguageToSupported(language);
            const audioBuffer = this.base64ToBuffer(base64Audio);
            
            // Create form data
            const formData = new FormData();
            formData.append('file', audioBuffer, {
                filename: `issue_${issueId}_audio.wav`,
                contentType: 'audio/wav'
            });

            const url = `${this.baseUrl}/transcription/jio/${supportedLanguage}`;
            // Log curl command
            logCurlCommand('POST', url, formData.getHeaders(), '[binary audio data]');
            
            const startTime = Date.now();
            const response = await fetch(url, {
                method: 'POST',
                body: formData,
                timeout: this.timeout
            });

            const responseTime = Date.now() - startTime;
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Transcription API error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            return {
                request_id: result.request_id,
                status: result.status,
                message: result.message
            };

        } catch (error) {
            throw error;
        }
    }

    /**
     * Check transcription status and get result
     * @param {string} requestId - Transcription request ID
     * @returns {Promise<Object>} Transcription status and result
     */
    async checkTranscriptionStatus(requestId) {
        try {
            const url = `${this.baseUrl}/transcription/jio/${requestId}/result`;
            // Log curl command
            logCurlCommand('GET', url, {});
            
            const startTime = Date.now();
            const response = await fetch(url, {
                method: 'GET',
                timeout: this.timeout
            });

            // Get response text first to handle both success and error cases
            const responseText = await response.text();

            if (!response.ok) {
                // Try to parse the error response as JSON to extract failure details
                try {
                    const errorData = JSON.parse(responseText);
                    
                    // Check if the error response contains failure information
                    if (errorData.detail && errorData.detail.status === 'failed') {
                        return {
                            status: 'failed',
                            transcription: null,
                            error: errorData.detail.error,
                            message: null
                        };
                    }
                } catch (parseError) {
                }
                
                // If we can't parse the error or it's not a failure status, throw the error
                throw new Error(`Status check API error: ${response.status} - ${responseText}`);
            }

            // Parse successful response
            const result = JSON.parse(responseText);
            
            // Check if we have transcription data (completed)
            if (result.request_id && (result.enhanced_original_transcription || result.enhanced_english_transcription)) {
                return {
                    status: 'completed',
                    transcription: result.enhanced_english_transcription || result.enhanced_original_transcription,
                    originalTranscription: result.enhanced_original_transcription,
                    enhancedEnglishTranscription: result.enhanced_english_transcription,
                    enhancedHindiTranscription: result.enhanced_hindi_transcription,
                    processingMode: result.processing_mode,
                    transcriptionProvider: result.transcription_provider,
                    providerInfo: result.provider_info,
                    llmEnhancementStatus: result.llm_enhancement_status,
                    message: 'Transcription completed successfully'
                };
            } else {
                // Still processing or no transcription data yet
                console.log(`[TranscriptionService] Transcription still processing for request ${requestId}:`, {
                    status: 'processing',
                    hasRequestId: !!result.request_id
                });
                
                return {
                    status: 'processing',
                    transcription: null,
                    error: null,
                    message: 'Transcription is still being processed'
                };
            }

        } catch (error) {
            console.error(`[TranscriptionService] Error checking transcription status for request ${requestId}:`, {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    /**
     * Get transcription request status
     * @param {string} requestId - Transcription request ID
     * @returns {Promise<Object>} Request status
     */
    async getRequestStatus(requestId) {
        try {
            const url = `${this.baseUrl}/request/${requestId}/status`;
            // Log curl command
            logCurlCommand('GET', url, {});
            console.log(`[TranscriptionService] Getting request status for: ${requestId}`);
            
            const response = await fetch(url, {
                method: 'GET',
                timeout: this.timeout
            });

            console.log(`[TranscriptionService] Request status response status: ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[TranscriptionService] Request status API error for ${requestId}:`, {
                    status: response.status,
                    error: errorText
                });
                throw new Error(`Request status API error: ${response.status} - ${errorText}`);
            }

            const result = await response.json();
            console.log(`[TranscriptionService] Request status for ${requestId}:`, {
                status: result.status,
                message: result.message,
                hasError: !!result.error
            });
            
            return {
                status: result.status,
                message: result.message || null,
                error: result.error || null
            };

        } catch (error) {
            console.error(`[TranscriptionService] Error getting request status for ${requestId}:`, {
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }
}

module.exports = new TranscriptionService(); 