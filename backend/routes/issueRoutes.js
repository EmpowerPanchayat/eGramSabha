// File: backend/routes/issueRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');
const { anyAuthenticated } = require('../middleware/auth');
const transcriptionService = require('../services/transcriptionService');

// Create a new issue
router.post('/', anyAuthenticated, async (req, res) => {
    try {
        const {
            text,
            category,
            subcategory,
            priority,
            createdForId,
            toBeResolvedBefore,
            remark,
            panchayatId,
            gramSabhaId,
            attachments
        } = req.body;
        
        // Validate required fields
        if (!category || !panchayatId || !subcategory || !createdForId) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields'
            });
        }
        
        // Verify if panchayat exists
        const panchayat = await Panchayat.findById(panchayatId);
        if (!panchayat) {
            return res.status(404).json({
                success: false,
                message: 'Panchayat not found'
            });
        }
        
        const user = req.user;
        const creatorId = user?.linkedCitizenId || user?.id;
        
        // Verify if creator exists
        const creator = await User.findById(creatorId);
        if (!creator) {
            return res.status(404).json({
                success: false,
                message: 'Creator not found'
            });
        }
        const createdFor = await User.findById(createdForId);
        if (!createdFor) {
            return res.status(404).json({
                success: false,
                message: 'CreatedFor not found'
            });
        }
        // Create issue instance
        const issue = new Issue({
            text,
            category,
            subcategory,
            priority: priority || 'NORMAL',
            createdForId,
            status: 'REPORTED',
            toBeResolvedBefore: toBeResolvedBefore ? new Date(toBeResolvedBefore) : null,
            remark,
            attachments: attachments || [],
            panchayatId,
            gramSabhaId,
            creatorId
        });
        
        // Save issue to database
        await issue.save();

        res.status(201).json({
            success: true,
            message: 'Issue/Suggestion reported successfully',
            issue: {
                _id: issue._id,
                text: issue.text,
                category: issue.category,
                subcategory: issue.subcategory,
                status: issue.status,
                createdAt: issue.createdAt
            }
        });
    } catch (error) {
        console.error('Error creating issue/suggestion:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating issue/suggestion: ' + error.message
        });
    }
});

router.get('/', anyAuthenticated, async (req, res) => {
    try {
        const {
            userId,
            panchayatId,
            category,
            subcategory,
            status,
            createdOn,
            creator,
            createdFor,
            createdForId,
            searchText,
            sort = 'desc',
            sortBy = 'createdAt'
        } = req.query;

        // Validate page and limit
        const pageStr = req.query.page ?? '1';
        const limitStr = req.query.limit ?? '10';

        if (!/^\d+$/.test(pageStr) || parseInt(pageStr, 10) < 1) {
            return res.status(400).json({ success: false, message: '"page" must be a positive integer' });
        }

        if (!/^\d+$/.test(limitStr) || parseInt(limitStr, 10) < 1) {
            return res.status(400).json({ success: false, message: '"limit" must be a positive integer' });
        }

        const page = parseInt(pageStr, 10);
        const limit = Math.min(parseInt(limitStr, 10), 100);
        const skip = (page - 1) * limit;

        // Validate sort
        const sortOrder = sort.toLowerCase() === 'asc' ? 1 : -1;
        const sortField = typeof sortBy === 'string' && sortBy.trim() !== '' ? sortBy : 'createdAt';

        // Validate ObjectIds
        if (!userId && !panchayatId) {
            return res.status(400).json({ success: false, message: 'Either userId or panchayatId is required.' });
        }

        if (userId && !mongoose.Types.ObjectId.isValid(userId)) {
            return res.status(400).json({ success: false, message: 'Invalid userId' });
        }

        if (panchayatId && !mongoose.Types.ObjectId.isValid(panchayatId)) {
            return res.status(400).json({ success: false, message: 'Invalid panchayatId' });
        }

        // Build query
        const query = {};
        if (userId) query.creatorId = userId;
        if (panchayatId) query.panchayatId = panchayatId;
        if (subcategory) query.subcategory = subcategory;
        if (status) query.status = status;
        if (createdForId) query.createdForId = createdForId;

        // Partial match on category (case-insensitive)
        if (category?.trim()) {
            query.category = { $regex: new RegExp(category.trim(), 'i') };
        }

        // Date filter
        if (createdOn) {
            const [from, to] = createdOn.split('_to_');
            if (from && !isNaN(Date.parse(from))) {
                const fromDate = new Date(from);
                const toDate = to && !isNaN(Date.parse(to)) ? new Date(to + 'T23:59:59.999Z') : new Date(from + 'T23:59:59.999Z');
                query.createdAt = { $gte: fromDate, $lte: toDate };
            }
        }

        // Search text (optional) on text, category etc.
        if (searchText?.trim()) {
            const regex = new RegExp(searchText.trim(), 'i');
            query.$or = [
                { text: { $regex: regex } },
                { category: { $regex: regex } }
            ];
        }
        // Execute query
        const [issues, total] = await Promise.all([
            Issue.find(query)
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .select('-attachments.attachment')
                .populate([
                    { path: 'creatorId', select: 'name' },
                    { path: 'createdForId', select: 'name' }
                ]),
            Issue.countDocuments(query)
        ]);

        const formatted = issues.map(issue => ({
            ...issue.toObject(),
            creator: { name: issue.creatorId?.name || 'Unknown' },
            createdFor: { name: issue.createdForId?.name || 'Unknown' }
        }));

        res.set('x-total-count', total.toString());
        return res.status(200).json(formatted);

    } catch (error) {
        console.error('Error fetching issues:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error.message
        });
    }
});

// Get all issues/suggestions for a panchayat
router.get('/panchayat/:panchayatId', anyAuthenticated, async (req, res) => {
    try {
        const { panchayatId } = req.params;

        // Verify if panchayat exists
        const panchayat = await Panchayat.findById(panchayatId);
        if (!panchayat) {
            return res.status(404).json({
                success: false,
                message: 'Panchayat not found'
            });
        }

        const issues = await Issue.find({ panchayatId })
            .sort({ createdAt: -1 })
            .select('-attachments.attachment') // Exclude attachment data to reduce payload size
            .populate([
                { path: 'creatorId', select: 'name' },
                { path: 'createdForId', select: 'name' }
            ]);

        // Transform the response to include creator name
        const transformedIssues = issues.map(issue => ({
            ...issue.toObject(),
            creator: {
                name: issue.creatorId?.name || 'Unknown'
            },
            createdFor: {
                name: issue.createdForId?.name || 'Unknown'
            }
        }));

        res.json({
            success: true,
            count: issues.length,
            issues: transformedIssues
        });
    } catch (error) {
        console.error('Error fetching panchayat issues/suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching panchayat issues/suggestions: ' + error.message
        });
    }
});

// Get issues/suggestions created by a specific user
router.get('/user/:userId', anyAuthenticated, async (req, res) => {
    try {
        const { userId } = req.params;
        console.log('Fetching issues/suggestions for user:', userId);

        // Verify if user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const issues = await Issue.find({ creatorId: userId },{createdForId: createdForId})
            .sort({ createdAt: -1 })
            .select('-attachments.attachment') // Exclude attachment data to reduce payload size
            .populate([
                { path: 'creatorId', select: 'name' },
                { path: 'createdForId', select: 'name' }
            ]);

        // Transform the response to include creator name
        const transformedIssues = issues.map(issue => ({
            ...issue.toObject(),
            creator: {
                name: issue.creatorId?.name || 'Unknown'
            },
            createdFor: {
                name: issue.createdForId?.name || 'Unknown'
            }
        }));

        res.json({
            success: true,
            count: issues.length,
            issues: transformedIssues
        });
    } catch (error) {
        console.error('Error fetching user issues/suggestions:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user issues/suggestions: ' + error.message
        });
    }
});

// Get a specific issue/suggestion by ID
router.get('/:issueId', anyAuthenticated, async (req, res) => {
    try {
        const { issueId } = req.params;

        const issue = await Issue.findById(issueId)
            .populate([
                { path: 'creatorId', select: 'name' },
                { path: 'createdForId', select: 'name' }
            ]);

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue/Suggestion not found'
            });
        }

        // Transform the response to include creator name
        const transformedIssue = {
            ...issue.toObject(),
            creator: {
                name: issue.creatorId?.name || 'Unknown'
            },
            createdFor: {
                name: issue.createdForId?.name || 'Unknown'
            }
        };

        res.json({
            success: true,
            issue: transformedIssue
        });
    } catch (error) {
        console.error('Error fetching issue/suggestion:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching issue/suggestion: ' + error.message
        });
    }
});

// Get attachment by issue/suggestion ID and attachment ID
router.get('/:issueId/attachment/:attachmentId', anyAuthenticated, async (req, res) => {
    try {
        const { issueId, attachmentId } = req.params;

        const issue = await Issue.findById(issueId);

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue/Suggestion not found'
            });
        }

        const attachment = issue.attachments.id(attachmentId);

        if (!attachment) {
            return res.status(404).json({
                success: false,
                message: 'Attachment not found'
            });
        }

        res.json({
            success: true,
            attachment
        });
    } catch (error) {
        console.error('Error fetching attachment:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching attachment: ' + error.message
        });
    }
});

// Route to upload attachments for an issue/suggestion
router.post('/upload-attachment', anyAuthenticated, async (req, res) => {
    try {
        const { issueId, attachmentData, filename, mimeType } = req.body;
        
        console.log(`[IssueRoutes] Upload attachment request received:`, {
            issueId,
            filename,
            mimeType,
            hasAttachmentData: !!attachmentData,
            attachmentDataLength: attachmentData ? attachmentData.length : 0
        });

        if (!issueId || !attachmentData) {
            console.error(`[IssueRoutes] Upload attachment validation failed:`, {
                hasIssueId: !!issueId,
                hasAttachmentData: !!attachmentData
            });
            return res.status(400).json({
                success: false,
                message: 'Issue/Suggestion ID and attachment data are required'
            });
        }

        const issue = await Issue.findById(issueId);

        if (!issue) {
            console.error(`[IssueRoutes] Issue not found for attachment upload: ${issueId}`);
            return res.status(404).json({
                success: false,
                message: 'Issue/Suggestion not found'
            });
        }

        console.log(`[IssueRoutes] Issue found for attachment upload:`, {
            issueId: issue._id,
            currentAttachmentsCount: issue.attachments.length
        });

        // Add attachment to issue
        issue.attachments.push({
            attachment: attachmentData,
            filename: filename || 'unnamed-file',
            mimeType: mimeType || 'application/octet-stream',
            uploadedAt: new Date()
        });

        await issue.save();
        console.log(`[IssueRoutes] Attachment saved successfully:`, {
            issueId: issue._id,
            attachmentId: issue.attachments[issue.attachments.length - 1]._id,
            newAttachmentsCount: issue.attachments.length
        });

        // Handle transcription for audio attachments
        if (mimeType && mimeType.startsWith('audio/')) {
            console.log(`[IssueRoutes] Audio attachment detected, initiating transcription:`, {
                issueId: issue._id,
                mimeType,
                filename
            });
            
            try {
                // Get language from panchayat
                const language = await transcriptionService.getPanchayatLanguage(issue.panchayatId);
                console.log(`[IssueRoutes] Language resolved for transcription: ${language}`);
                
                // Call transcription service and wait for response
                const transcriptionResponse = await transcriptionService.initiateTranscription(
                    attachmentData, 
                    language, 
                    issue._id
                );
                
                // Update issue with transcription request ID
                issue.transcription.requestId = transcriptionResponse.request_id;
                issue.transcription.status = 'PROCESSING';
                issue.transcription.language = language;
                issue.transcription.requestedAt = new Date();
                await issue.save();
                
                console.log(`[IssueRoutes] Transcription initiated successfully:`, {
                    issueId: issue._id,
                    requestId: transcriptionResponse.request_id,
                    status: 'PROCESSING',
                    language
                });
                
            } catch (transcriptionError) {
                // Transcription initiation failed - mark for cron retry
                if (!issue.transcription) {
                    issue.transcription = {};
                }
                issue.transcription.status = 'FAILED';
                issue.transcription.lastError = transcriptionError.message;
                issue.transcription.retryCount = 1;
                await issue.save();
                
                console.error(`[IssueRoutes] Transcription initiation failed:`, {
                    issueId: issue._id,
                    error: transcriptionError.message,
                    stack: transcriptionError.stack
                });
                // Don't fail the attachment upload - just log the error
            }
        } else {
            console.log(`[IssueRoutes] Non-audio attachment, skipping transcription:`, {
                issueId: issue._id,
                mimeType
            });
        }

        res.json({
            success: true,
            message: 'Attachment uploaded successfully',
            attachmentId: issue.attachments[issue.attachments.length - 1]._id
        });
    } catch (error) {
        console.error(`[IssueRoutes] Error uploading attachment:`, {
            error: error.message,
            stack: error.stack,
            issueId: req.body.issueId
        });
        res.status(500).json({
            success: false,
            message: 'Error uploading attachment: ' + error.message
        });
    }
});

// Get transcription status for an issue
router.get('/:issueId/transcription', anyAuthenticated, async (req, res) => {
    try {
        const { issueId } = req.params;
        
        console.log(`[IssueRoutes] Transcription status request received for issue: ${issueId}`);

        const issue = await Issue.findById(issueId);
        if (!issue) {
            console.error(`[IssueRoutes] Issue not found for transcription status: ${issueId}`);
            return res.status(404).json({
                success: false,
                message: 'Issue/Suggestion not found'
            });
        }

        // If no transcription data, return null
        if (!issue.transcription || !issue.transcription.requestId) {
            console.log(`[IssueRoutes] No transcription data found for issue: ${issueId}`);
            
            // Check if issue has audio attachments but no transcription attempt
            const hasAudioAttachments = issue.attachments && issue.attachments.some(att => 
                att.mimeType.startsWith('audio/')
            );
            
            if (hasAudioAttachments) {
                console.log(`[IssueRoutes] Issue has audio attachments but no transcription attempt: ${issueId}`);
                return res.json({
                    success: true,
                    transcription: {
                        status: 'PENDING',
                        message: 'Audio attachment detected, transcription will be initiated automatically'
                    }
                });
            }
            
            return res.json({
                success: true,
                transcription: null
            });
        }

        console.log(`[IssueRoutes] Transcription data found for issue:`, {
            issueId: issue._id,
            requestId: issue.transcription.requestId,
            status: issue.transcription.status,
            language: issue.transcription.language
        });

        // If transcription is already completed, return the stored data
        if (issue.transcription.status === 'COMPLETED' && issue.transcription.text) {
            console.log(`[IssueRoutes] Returning completed transcription for issue: ${issueId}`);
            return res.json({
                success: true,
                transcription: {
                    status: issue.transcription.status,
                    text: issue.transcription.text,
                    originalTranscription: issue.transcription.originalTranscription,
                    enhancedEnglishTranscription: issue.transcription.enhancedEnglishTranscription,
                    enhancedHindiTranscription: issue.transcription.enhancedHindiTranscription,
                    language: issue.transcription.language,
                    processingMode: issue.transcription.processingMode,
                    transcriptionProvider: issue.transcription.transcriptionProvider,
                    providerInfo: issue.transcription.providerInfo,
                    llmEnhancementStatus: issue.transcription.llmEnhancementStatus,
                    completedAt: issue.transcription.completedAt
                }
            });
        }

        // If transcription is processing, check status from video-mom-backend
        if (issue.transcription.status === 'PROCESSING') {
            console.log(`[IssueRoutes] Checking transcription status from video-mom-backend for request: ${issue.transcription.requestId}`);
            
            try {
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
                    
                    console.log(`[IssueRoutes] Transcription completed successfully:`, {
                        issueId: issue._id,
                        requestId: issue.transcription.requestId,
                        textLength: statusResult.transcription.length,
                        hasOriginalTranscription: !!statusResult.originalTranscription,
                        hasEnhancedTranscription: !!statusResult.enhancedEnglishTranscription,
                        processingMode: statusResult.processingMode
                    });
                    
                    return res.json({
                        success: true,
                        transcription: {
                            status: 'COMPLETED',
                            text: statusResult.transcription,
                            originalTranscription: statusResult.originalTranscription,
                            enhancedEnglishTranscription: statusResult.enhancedEnglishTranscription,
                            enhancedHindiTranscription: statusResult.enhancedHindiTranscription,
                            language: issue.transcription.language,
                            processingMode: statusResult.processingMode,
                            transcriptionProvider: statusResult.transcriptionProvider,
                            providerInfo: statusResult.providerInfo,
                            llmEnhancementStatus: statusResult.llmEnhancementStatus,
                            completedAt: issue.transcription.completedAt
                        }
                    });
                } else if (statusResult.status === 'failed') {
                    // Update issue with failed status
                    issue.transcription.status = 'FAILED';
                    issue.transcription.lastError = statusResult.error || 'Transcription failed';
                    await issue.save();
                    
                    console.error(`[IssueRoutes] Transcription failed:`, {
                        issueId: issue._id,
                        requestId: issue.transcription.requestId,
                        error: statusResult.error
                    });
                    
                    return res.json({
                        success: true,
                        transcription: {
                            status: 'FAILED',
                            error: statusResult.error || 'Transcription failed',
                            language: issue.transcription.language
                        }
                    });
                } else {
                    // Still processing
                    console.log(`[IssueRoutes] Transcription still processing:`, {
                        issueId: issue._id,
                        requestId: issue.transcription.requestId,
                        status: statusResult.status
                    });
                    
                    return res.json({
                        success: true,
                        transcription: {
                            status: 'PROCESSING',
                            language: issue.transcription.language,
                            requestedAt: issue.transcription.requestedAt
                        }
                    });
                }
            } catch (statusError) {
                console.error(`[IssueRoutes] Error checking transcription status:`, {
                    issueId: issue._id,
                    requestId: issue.transcription.requestId,
                    error: statusError.message,
                    stack: statusError.stack
                });
                
                return res.json({
                    success: true,
                    transcription: {
                        status: 'PROCESSING',
                        language: issue.transcription.language,
                        requestedAt: issue.transcription.requestedAt
                    }
                });
            }
        }

        // If transcription failed, return error
        if (issue.transcription.status === 'FAILED') {
            console.log(`[IssueRoutes] Returning failed transcription status:`, {
                issueId: issue._id,
                error: issue.transcription.lastError,
                retryCount: issue.transcription.retryCount
            });
            
            return res.json({
                success: true,
                transcription: {
                    status: 'FAILED',
                    error: issue.transcription.lastError,
                    language: issue.transcription.language,
                    retryCount: issue.transcription.retryCount
                }
            });
        }

        // Default case
        console.log(`[IssueRoutes] Returning default transcription status:`, {
            issueId: issue._id,
            status: issue.transcription.status
        });
        
        return res.json({
            success: true,
            transcription: {
                status: issue.transcription.status,
                language: issue.transcription.language,
                requestedAt: issue.transcription.requestedAt
            }
        });

    } catch (error) {
        console.error(`[IssueRoutes] Error fetching transcription status:`, {
            issueId: req.params.issueId,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Error fetching transcription status: ' + error.message
        });
    }
});

// Retry failed transcription for an issue
router.post('/:issueId/transcription/retry', anyAuthenticated, async (req, res) => {
    try {
        const { issueId } = req.params;
        
        console.log(`[IssueRoutes] Transcription retry request received for issue: ${issueId}`);

        const issue = await Issue.findById(issueId);
        if (!issue) {
            console.error(`[IssueRoutes] Issue not found for transcription retry: ${issueId}`);
            return res.status(404).json({
                success: false,
                message: 'Issue/Suggestion not found'
            });
        }

        // Check if transcription is in failed state
        if (!issue.transcription || issue.transcription.status !== 'FAILED') {
            console.error(`[IssueRoutes] Transcription not in failed state for retry:`, {
                issueId: issue._id,
                currentStatus: issue.transcription?.status
            });
            return res.status(400).json({
                success: false,
                message: 'Transcription is not in failed state'
            });
        }

        console.log(`[IssueRoutes] Transcription retry validation passed:`, {
            issueId: issue._id,
            currentStatus: issue.transcription.status,
            retryCount: issue.transcription.retryCount,
            lastError: issue.transcription.lastError
        });

        // Get audio attachment
        const audioAttachment = issue.attachments.find(att => 
            att.mimeType.startsWith('audio/')
        );

        if (!audioAttachment) {
            console.error(`[IssueRoutes] No audio attachment found for transcription retry:`, {
                issueId: issue._id,
                totalAttachments: issue.attachments.length
            });
            return res.status(400).json({
                success: false,
                message: 'No audio attachment found for transcription'
            });
        }

        console.log(`[IssueRoutes] Audio attachment found for retry:`, {
            issueId: issue._id,
            attachmentId: audioAttachment._id,
            filename: audioAttachment.filename,
            mimeType: audioAttachment.mimeType
        });

        try {
            // Get language from panchayat
            const language = await transcriptionService.getPanchayatLanguage(issue.panchayatId);
            console.log(`[IssueRoutes] Language resolved for retry: ${language}`);
            
            // Retry transcription
            const transcriptionResponse = await transcriptionService.initiateTranscription(
                audioAttachment.attachment, // Base64 audio data
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
            
            console.log(`[IssueRoutes] Transcription retry successful:`, {
                issueId: issue._id,
                newRequestId: transcriptionResponse.request_id,
                status: 'PROCESSING',
                language
            });
            
            res.json({
                success: true,
                message: 'Transcription retry initiated successfully',
                transcription: {
                    status: 'PROCESSING',
                    language: language,
                    requestedAt: issue.transcription.requestedAt
                }
            });

        } catch (transcriptionError) {
            // Update issue with new error
            issue.transcription.retryCount += 1;
            issue.transcription.lastError = transcriptionError.message;
            await issue.save();
            
            console.error(`[IssueRoutes] Transcription retry failed:`, {
                issueId: issue._id,
                error: transcriptionError.message,
                stack: transcriptionError.stack,
                newRetryCount: issue.transcription.retryCount
            });
            
            res.status(500).json({
                success: false,
                message: 'Transcription retry failed: ' + transcriptionError.message
            });
        }

    } catch (error) {
        console.error(`[IssueRoutes] Error retrying transcription:`, {
            issueId: req.params.issueId,
            error: error.message,
            stack: error.stack
        });
        res.status(500).json({
            success: false,
            message: 'Error retrying transcription: ' + error.message
        });
    }
});

// POST /issues/batch-minimal
router.post('/batch-minimal', anyAuthenticated, async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ success: false, message: 'No IDs provided' });
  }
  try {
    // Fetch minimal fields plus transcription.description
    const issues = await Issue.find(
      { _id: { $in: ids } },
      { _id: 1, title: 1, category: 1, subcategory: 1, status: 1, 'transcription.description': 1, 'transcription.enhancedHindiTranscription': 1, 'transcription.enhancedEnglishTranscription': 1, 'transcription.text': 1 }
    );
    // Map to minimal object with description
    const minimal = issues.map(issue => ({
      _id: issue._id,
      title: issue.title,
      category: issue.category,
      subcategory: issue.subcategory,
      status: issue.status,
      transcription: {
        description: issue.transcription && issue.transcription.description ? issue.transcription.description : undefined,
        enhancedHindiTranscription: issue.transcription && issue.transcription.enhancedHindiTranscription ? issue.transcription.enhancedHindiTranscription : undefined,
        enhancedEnglishTranscription: issue.transcription && issue.transcription.enhancedEnglishTranscription ? issue.transcription.enhancedEnglishTranscription : undefined,
        text: issue.transcription && issue.transcription.text ? issue.transcription.text : undefined
      }
    }));
    res.json({ success: true, issues: minimal });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/update-status', async (req, res) => {
  const { issueIds, status } = req.body;
  try {
    await Issue.updateMany(
      { _id: { $in: issueIds } },
      { $set: { status } }
    );
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;