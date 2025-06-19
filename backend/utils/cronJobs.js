const cron = require('node-cron');
const { updateAllMeetingStatuses } = require('./meetingUtils');
const Issue = require('../models/Issue');
const transcriptionService = require('../services/transcriptionService');

// Run every 30 minutes
const updateMeetingStatuses = cron.schedule('*/30 * * * *', async () => {
    console.log('Running auto-update meeting statuses check...');
    await updateAllMeetingStatuses();
});

// Check transcription status every 5 minutes
const checkTranscriptionStatus = cron.schedule('*/1 * * * *', async () => {
    console.log(`[CronJobs] Starting transcription status check at ${new Date().toISOString()}`);
    
    try {
        // Find all issues with processing transcription
        const processingIssues = await Issue.find({
            'transcription.status': 'PROCESSING',
            'transcription.requestId': { $exists: true, $ne: null }
        });

        console.log(`[CronJobs] Found ${processingIssues.length} issues with processing transcription`);

        for (const issue of processingIssues) {
            try {
                console.log(`[CronJobs] Checking transcription status for issue: ${issue._id}, request: ${issue.transcription.requestId}`);
                
                const statusResult = await transcriptionService.checkTranscriptionStatus(issue.transcription.requestId);
                
                if (statusResult.status === 'completed' && statusResult.transcription) {
                    // Update issue with completed transcription
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
                    
                    console.log(`[CronJobs] Transcription completed for issue: ${issue._id}`, {
                        requestId: issue.transcription.requestId,
                        textLength: statusResult.transcription.length,
                        hasOriginalTranscription: !!statusResult.originalTranscription,
                        hasEnhancedTranscription: !!statusResult.enhancedEnglishTranscription,
                        processingMode: statusResult.processingMode,
                        completedAt: issue.transcription.completedAt
                    });
                    
                } else if (statusResult.status === 'failed') {
                    // Update issue with failed status
                    issue.transcription.status = 'FAILED';
                    issue.transcription.lastError = statusResult.error || 'Transcription failed';
                    await issue.save();
                    
                    console.error(`[CronJobs] Transcription failed for issue: ${issue._id}`, {
                        requestId: issue.transcription.requestId,
                        error: statusResult.error
                    });
                    
                } else {
                    // Still processing
                    console.log(`[CronJobs] Transcription still processing for issue: ${issue._id}`, {
                        requestId: issue.transcription.requestId,
                        status: statusResult.status
                    });
                }
                
            } catch (error) {
                console.error(`[CronJobs] Error checking transcription status for issue ${issue._id}:`, {
                    requestId: issue.transcription.requestId,
                    error: error.message,
                    stack: error.stack
                });
            }
        }
        
        console.log(`[CronJobs] Transcription status check completed at ${new Date().toISOString()}`);
        
    } catch (error) {
        console.error(`[CronJobs] Error in transcription status check:`, {
            error: error.message,
            stack: error.stack
        });
    }
});

// Retry failed transcriptions every 15 minutes
const retryFailedTranscriptions = cron.schedule('*/1 * * * *', async () => {
    console.log(`[CronJobs] Starting failed transcription retry at ${new Date().toISOString()}`);
    
    try {
        // Find all issues with failed transcription and retry count < 3
        const failedIssues = await Issue.find({
            'transcription.status': 'FAILED',
            'transcription.retryCount': { $lt: 3 },
            'transcription.requestId': { $exists: true, $ne: null }
        });

        console.log(`[CronJobs] Found ${failedIssues.length} issues with failed transcription to retry`);

        for (const issue of failedIssues) {
            try {
                console.log(`[CronJobs] Retrying transcription for issue: ${issue._id}`, {
                    requestId: issue.transcription.requestId,
                    retryCount: issue.transcription.retryCount,
                    lastError: issue.transcription.lastError
                });
                
                // Get audio attachment
                const audioAttachment = issue.attachments.find(att => 
                    att.mimeType.startsWith('audio/')
                );

                if (!audioAttachment) {
                    console.error(`[CronJobs] No audio attachment found for issue: ${issue._id}`);
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
                
                console.log(`[CronJobs] Transcription retry successful for issue: ${issue._id}`, {
                    newRequestId: transcriptionResponse.request_id,
                    language,
                    retryCount: issue.transcription.retryCount
                });
                
            } catch (error) {
                // Update issue with new error
                issue.transcription.retryCount += 1;
                issue.transcription.lastError = error.message;
                await issue.save();
                
                console.error(`[CronJobs] Transcription retry failed for issue: ${issue._id}`, {
                    requestId: issue.transcription.requestId,
                    error: error.message,
                    newRetryCount: issue.transcription.retryCount
                });
            }
        }
        
        console.log(`[CronJobs] Failed transcription retry completed at ${new Date().toISOString()}`);
        
    } catch (error) {
        console.error(`[CronJobs] Error in failed transcription retry:`, {
            error: error.message,
            stack: error.stack
        });
    }
});

// Retry transcription initiation for issues that failed to get requestId
const retryTranscriptionInitiation = cron.schedule('*/1 * * * *', async () => {
    console.log(`[CronJobs] Starting transcription initiation retry at ${new Date().toISOString()}`);
    
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

        console.log(`[CronJobs] Found ${issuesWithAudio.length} issues with audio but no transcription attempt`);

        for (const issue of issuesWithAudio) {
            try {
                console.log(`[CronJobs] Attempting transcription initiation for issue: ${issue._id}`, {
                    hasAudioAttachments: issue.attachments.some(att => att.mimeType.startsWith('audio/')),
                    currentTranscriptionStatus: issue.transcription?.status,
                    currentRequestId: issue.transcription?.requestId
                });
                
                // Get audio attachment
                const audioAttachment = issue.attachments.find(att => 
                    att.mimeType.startsWith('audio/')
                );

                if (!audioAttachment) {
                    console.error(`[CronJobs] No audio attachment found for issue: ${issue._id}`);
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
                
                console.log(`[CronJobs] Transcription initiation successful for issue: ${issue._id}`, {
                    newRequestId: transcriptionResponse.request_id,
                    language,
                    status: 'PROCESSING'
                });
                
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
                
                console.error(`[CronJobs] Transcription initiation failed for issue: ${issue._id}`, {
                    error: error.message,
                    retryCount: issue.transcription.retryCount
                });
            }
        }
        
        console.log(`[CronJobs] Transcription initiation retry completed at ${new Date().toISOString()}`);
        
    } catch (error) {
        console.error(`[CronJobs] Error in transcription initiation retry:`, {
            error: error.message,
            stack: error.stack
        });
    }
});

// Start the cron jobs
const startCronJobs = () => {
    console.log(`[CronJobs] Starting cron jobs at ${new Date().toISOString()}`);
    updateMeetingStatuses.start();
    checkTranscriptionStatus.start();
    retryFailedTranscriptions.start();
    retryTranscriptionInitiation.start();
    console.log(`[CronJobs] Cron jobs started successfully`);
};

// Stop the cron jobs
const stopCronJobs = () => {
    console.log(`[CronJobs] Stopping cron jobs at ${new Date().toISOString()}`);
    updateMeetingStatuses.stop();
    checkTranscriptionStatus.stop();
    retryFailedTranscriptions.stop();
    retryTranscriptionInitiation.stop();
    console.log(`[CronJobs] Cron jobs stopped successfully`);
};

module.exports = {
    startCronJobs,
    stopCronJobs,
    checkTranscriptionStatus,
    retryFailedTranscriptions,
    retryTranscriptionInitiation,
    updateMeetingStatuses
};
