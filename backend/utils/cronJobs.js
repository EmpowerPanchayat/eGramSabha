const cron = require('node-cron');
const { updateAllMeetingStatuses } = require('./meetingUtils');
const Issue = require('../models/Issue');
const transcriptionService = require('../services/transcriptionService');
const { initiateSummaryGeneration, fetchSummaryResults, retryFailedSummaryRequests } = require('./summaryCronJobs');
const { agendaTranslationCron } = require('./agendaTranslationCron');

const CHECK_TRANSCRIPTION_STATUS_CRON = process.env.CHECK_TRANSCRIPTION_STATUS_CRON || '*/5 * * * *';
const RETRY_FAILED_TRANSCRIPTIONS_CRON = process.env.RETRY_FAILED_TRANSCRIPTIONS_CRON || '*/30 * * * *';
const RETRY_TRANSCRIPTION_INITIATION_CRON = process.env.RETRY_TRANSCRIPTION_INITIATION_CRON || '*/30 * * * *';

/**
 * Checks transcription status for a given set of "processing" issues and updates each in place.
 * Shared by the periodic cron and the on-demand per-panchayat refresh endpoint.
 * @param {Array} processingIssues - Issue documents with transcription.status === 'PROCESSING'
 * @returns {Promise<{checked: number, completed: number, failed: number}>}
 */
const checkTranscriptionStatusForIssues = async (processingIssues) => {
    let completed = 0;
    let failed = 0;

    for (const issue of processingIssues) {
        try {
            const statusResult = await transcriptionService.checkTranscriptionStatus(issue.transcription.requestId);

            if (statusResult.status === 'completed' && statusResult.transcription) {
                issue.transcription.status = 'COMPLETED';
                issue.transcription.text = statusResult.transcription;
                issue.transcription.originalTranscription = statusResult.originalTranscription;
                issue.transcription.enhancedEnglishTranscription = statusResult.enhancedEnglishTranscription;
                issue.transcription.enhancedHindiTranscription = statusResult.enhancedHindiTranscription;
                issue.transcription.processingMode = statusResult.processingMode;
                issue.transcription.transcriptionProvider = statusResult.transcriptionProvider;
                issue.transcription.providerInfo = statusResult.providerInfo;
                issue.transcription.llmEnhancementStatus = statusResult.llmEnhancementStatus;
                issue.transcription.completedAt = new Date();
                issue.transcription.lastError = null;
                await issue.save();
                completed += 1;
            } else if (statusResult.status === 'failed') {
                issue.transcription.status = 'FAILED';
                issue.transcription.lastError = statusResult.error || 'Transcription failed';
                await issue.save();
                failed += 1;
            }
        } catch (error) {
        }
    }

    return { checked: processingIssues.length, completed, failed };
};

// Check transcription status
const checkTranscriptionStatus = cron.schedule(CHECK_TRANSCRIPTION_STATUS_CRON, async () => {
    try {
        // Find all issues with processing transcription
        const processingIssues = await Issue.find({
            'transcription.status': 'PROCESSING',
            'transcription.requestId': { $exists: true, $ne: null }
        });

        await checkTranscriptionStatusForIssues(processingIssues);
    } catch (error) {
    }
});

// Retry failed transcriptions
const retryFailedTranscriptions = cron.schedule(RETRY_FAILED_TRANSCRIPTIONS_CRON, async () => {
    try {
        // Find all issues with failed transcription and retry count < 3
        const failedIssues = await Issue.find({
            'transcription.status': 'FAILED',
            'transcription.retryCount': { $lt: 3 },
            'transcription.requestId': { $exists: true, $ne: null }
        });

        for (const issue of failedIssues) {
            try {
                // Get audio attachment
                const audioAttachment = issue.attachments.find(att =>
                    att.mimeType.startsWith('audio/')
                );

                if (!audioAttachment) {
                    continue;
                }

                // Get language from panchayat
                const language = await transcriptionService.getPanchayatLanguage(issue.panchayatId);

                // Retry transcription
                const transcriptionResponse = await transcriptionService.initiateTranscription(
                    audioAttachment.attachment,
                    language,
                    issue._id
                );

                // Update issue
                issue.transcription.requestId = transcriptionResponse.request_id;
                issue.transcription.status = 'PROCESSING';
                issue.transcription.language = language;
                issue.transcription.requestedAt = new Date();
                issue.transcription.lastError = null;
                await issue.save();

            } catch (error) {
                // Update issue with new error
                issue.transcription.retryCount += 1;
                issue.transcription.lastError = error.message;
                await issue.save();
            }
        }

    } catch (error) {
    }
});

// Retry transcription initiation
const retryTranscriptionInitiation = cron.schedule(RETRY_TRANSCRIPTION_INITIATION_CRON, async () => {
    try {
        // Find all issues with audio attachments but no transcription.requestId (failed initial attempts)
        const issuesWithAudio = await Issue.find({
            'attachments': {
                $elemMatch: {
                    'mimeType': { $regex: /^audio\// }
                }
            },
            $or: [
                { 'transcription.requestId': { $exists: false } },
                { 'transcription.requestId': null },
                { 'transcription.status': { $exists: false } },
                { 'transcription.status': null }
            ]
        });

        for (const issue of issuesWithAudio) {
            try {
                // Get audio attachment
                const audioAttachment = issue.attachments.find(att =>
                    att.mimeType.startsWith('audio/')
                );

                if (!audioAttachment) {
                    continue;
                }

                // Get language from panchayat
                const language = await transcriptionService.getPanchayatLanguage(issue.panchayatId);

                // Initialize transcription
                const transcriptionResponse = await transcriptionService.initiateTranscription(
                    audioAttachment.attachment,
                    language,
                    issue._id
                );

                // Update issue with transcription data
                if (!issue.transcription) {
                    issue.transcription = {};
                }
                issue.transcription.requestId = transcriptionResponse.request_id;
                issue.transcription.status = 'PROCESSING';
                issue.transcription.language = language;
                issue.transcription.requestedAt = new Date();
                issue.transcription.retryCount = 0;
                issue.transcription.lastError = null;
                await issue.save();

            } catch (error) {
                // Initialize transcription object if it doesn't exist
                if (!issue.transcription) {
                    issue.transcription = {};
                }

                // Update issue with error
                issue.transcription.status = 'FAILED';
                issue.transcription.retryCount = (issue.transcription.retryCount || 0) + 1;
                issue.transcription.lastError = error.message;
                await issue.save();
            }
        }

    } catch (error) {
    }
});

// Start the cron jobs
const startCronJobs = () => {
    agendaTranslationCron.start();
    checkTranscriptionStatus.start();
    retryFailedTranscriptions.start();
    retryTranscriptionInitiation.start();
    initiateSummaryGeneration.start();
    fetchSummaryResults.start();
    retryFailedSummaryRequests.start();
};

// Stop the cron jobs
const stopCronJobs = () => {
    agendaTranslationCron.stop();
    checkTranscriptionStatus.stop();
    retryFailedTranscriptions.stop();
    retryTranscriptionInitiation.stop();
    initiateSummaryGeneration.stop();
    fetchSummaryResults.stop();
    retryFailedSummaryRequests.stop();
};

module.exports = {
    startCronJobs,
    stopCronJobs,
    checkTranscriptionStatusForIssues,
    checkTranscriptionStatus,
    retryFailedTranscriptions,
    retryTranscriptionInitiation,
    initiateSummaryGeneration,
    fetchSummaryResults,
    retryFailedSummaryRequests
};
