// File: backend/routes/supportTicketRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SupportTicket = require('../models/SupportTicket');
const Panchayat = require('../models/Panchayat');
const { anyAuthenticated, isAdmin, isOfficial } = require('../middleware/auth');
const transcriptionService = require('../services/transcriptionService');

// Technical and General category mappings
const TECHNICAL_CATEGORIES = [
    'LOGIN_ISSUE',
    'FACE_RECOGNITION',
    'AUDIO_RECORDING',
    'FILE_UPLOAD',
    'APP_CRASH',
    'PERFORMANCE',
    'OTHER_TECHNICAL'
];

const GENERAL_CATEGORIES = [
    'GRAM_SABHA_QUERY',
    'ISSUE_TRACKING',
    'ACCOUNT_HELP',
    'FEEDBACK',
    'SUGGESTION',
    'OTHER_GENERAL'
];

/**
 * POST /api/support-tickets
 * Create a new support ticket
 * Auth: Optional (allows anonymous submissions)
 */
router.post('/', async (req, res) => {
    try {
        const {
            category,
            description,
            contactInfo,
            screenshot,
            voiceNote,
            panchayatId,
            sourcePortal
        } = req.body;

        // Validate required fields
        if (!category || !sourcePortal) {
            return res.status(400).json({
                success: false,
                message: 'Category and source portal are required'
            });
        }

        // Validate category
        const allCategories = [...TECHNICAL_CATEGORIES, ...GENERAL_CATEGORIES];
        if (!allCategories.includes(category)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid category'
            });
        }

        // Validate source portal
        if (!['CITIZEN', 'OFFICIAL', 'ADMIN'].includes(sourcePortal)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid source portal'
            });
        }

        // Must have either description or voice note
        if (!description && !voiceNote) {
            return res.status(400).json({
                success: false,
                message: 'Either description or voice note is required'
            });
        }

        // Validate panchayat if provided
        if (panchayatId) {
            if (!mongoose.Types.ObjectId.isValid(panchayatId)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid panchayat ID'
                });
            }

            const panchayat = await Panchayat.findById(panchayatId);
            if (!panchayat) {
                return res.status(404).json({
                    success: false,
                    message: 'Panchayat not found'
                });
            }
        }

        // Generate ticket number
        const ticketNumber = await SupportTicket.generateTicketNumber();

        // Try to extract user info from token if available
        let submittedBy = {
            userType: 'ANONYMOUS',
            userName: 'Anonymous'
        };

        // Check for authorization header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (token) {
            try {
                // Import verifyToken to check the token
                const { verifyToken } = require('../config/jwt');
                const Official = require('../models/Official');
                const User = require('../models/User');

                let decoded;
                let userType;

                // Try each token type
                try {
                    decoded = verifyToken(token, 'ADMIN');
                    userType = 'ADMIN';
                } catch {
                    try {
                        decoded = verifyToken(token, 'OFFICIAL');
                        userType = 'OFFICIAL';
                    } catch {
                        try {
                            decoded = verifyToken(token, 'CITIZEN');
                            userType = 'CITIZEN';
                        } catch {
                            // Token invalid, treat as anonymous
                        }
                    }
                }

                if (decoded && userType) {
                    if (userType === 'ADMIN' || userType === 'OFFICIAL') {
                        const official = await Official.findById(decoded.id);
                        if (official) {
                            submittedBy = {
                                userId: official._id,
                                userModel: 'Official',
                                userType: userType,
                                userName: official.username || official.name
                            };
                        }
                    } else if (userType === 'CITIZEN') {
                        const citizen = await User.findById(decoded.id);
                        if (citizen) {
                            submittedBy = {
                                userId: citizen._id,
                                userModel: 'User',
                                userType: 'CITIZEN',
                                userName: citizen.name
                            };
                        }
                    }
                }
            } catch (error) {
                // Token verification failed, continue as anonymous
                console.log('[SupportTicketRoutes] Token verification failed, treating as anonymous:', error.message);
            }
        }

        // Create support ticket
        const supportTicket = new SupportTicket({
            ticketNumber,
            category,
            description,
            contactInfo,
            screenshot: screenshot || null,
            voiceNote: voiceNote || null,
            status: 'OPEN',
            submittedBy,
            panchayatId: panchayatId || null,
            sourcePortal
        });

        await supportTicket.save();

        console.log(`[SupportTicketRoutes] Support ticket created:`, {
            ticketNumber,
            category,
            sourcePortal,
            hasVoiceNote: !!voiceNote,
            hasScreenshot: !!screenshot,
            submittedBy: submittedBy.userType
        });

        // Handle transcription for voice note
        if (voiceNote && voiceNote.attachment) {
            console.log(`[SupportTicketRoutes] Voice note detected, initiating transcription`);

            try {
                // Get language from panchayat if available, default to Hindi
                let language = 'Hindi';
                if (panchayatId) {
                    language = await transcriptionService.getPanchayatLanguage(panchayatId);
                }

                const transcriptionResponse = await transcriptionService.initiateTranscription(
                    voiceNote.attachment,
                    language,
                    supportTicket._id
                );

                // Update ticket with transcription request info
                supportTicket.transcription.requestId = transcriptionResponse.request_id;
                supportTicket.transcription.status = 'PROCESSING';
                supportTicket.transcription.language = language;
                supportTicket.transcription.requestedAt = new Date();
                await supportTicket.save();

                console.log(`[SupportTicketRoutes] Transcription initiated:`, {
                    ticketId: supportTicket._id,
                    requestId: transcriptionResponse.request_id,
                    language
                });

            } catch (transcriptionError) {
                // Mark transcription as failed but don't fail the ticket creation
                supportTicket.transcription.status = 'FAILED';
                supportTicket.transcription.lastError = transcriptionError.message;
                supportTicket.transcription.retryCount = 1;
                await supportTicket.save();

                console.error(`[SupportTicketRoutes] Transcription initiation failed:`, {
                    ticketId: supportTicket._id,
                    error: transcriptionError.message
                });
            }
        }

        res.status(201).json({
            success: true,
            message: 'Support ticket submitted successfully',
            ticket: {
                _id: supportTicket._id,
                ticketNumber: supportTicket.ticketNumber,
                category: supportTicket.category,
                status: supportTicket.status,
                createdAt: supportTicket.createdAt
            }
        });

    } catch (error) {
        console.error('[SupportTicketRoutes] Error creating support ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating support ticket: ' + error.message
        });
    }
});

/**
 * GET /api/support-tickets/contacts/:panchayatId?
 * Get support contact information
 * Auth: None (public endpoint)
 */
router.get('/contacts/:panchayatId?', async (req, res) => {
    try {
        const { panchayatId } = req.params;

        // Global contacts from environment variables
        const globalContacts = {
            email: process.env.SUPPORT_EMAIL || null,
            phone: process.env.SUPPORT_PHONE || null,
            contactName: process.env.SUPPORT_CONTACT_NAME || null
        };

        // If no panchayat specified, return only global contacts
        if (!panchayatId) {
            return res.json({
                success: true,
                contacts: {
                    global: globalContacts,
                    panchayat: null
                }
            });
        }

        // Validate panchayat ID
        if (!mongoose.Types.ObjectId.isValid(panchayatId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid panchayat ID'
            });
        }

        // Fetch panchayat contacts
        const panchayat = await Panchayat.findById(panchayatId).select(
            'name supportEmail supportPhoneNumber supportContactPersonName'
        );

        if (!panchayat) {
            return res.status(404).json({
                success: false,
                message: 'Panchayat not found'
            });
        }

        const panchayatContacts = {
            panchayatName: panchayat.name,
            email: panchayat.supportEmail || null,
            phone: panchayat.supportPhoneNumber || null,
            contactName: panchayat.supportContactPersonName || null
        };

        res.json({
            success: true,
            contacts: {
                global: globalContacts,
                panchayat: panchayatContacts
            }
        });

    } catch (error) {
        console.error('[SupportTicketRoutes] Error fetching contacts:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching contacts: ' + error.message
        });
    }
});

/**
 * GET /api/support-tickets
 * List support tickets (paginated, filtered)
 * Auth: Official/Admin only
 */
router.get('/', anyAuthenticated, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            status,
            category,
            panchayatId,
            sortBy = 'createdAt',
            sort = 'desc'
        } = req.query;

        const user = req.user;

        // Only officials and admins can view tickets
        if (!['ADMIN', 'OFFICIAL', 'SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role) && user.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only officials and admins can view support tickets.'
            });
        }

        // Build query
        const query = {};

        // Officials can only see tickets from their panchayat
        if (user.userType === 'OFFICIAL' && user.role !== 'ADMIN') {
            query.panchayatId = user.panchayatId;
        } else if (panchayatId) {
            // Admin can filter by panchayat
            if (mongoose.Types.ObjectId.isValid(panchayatId)) {
                query.panchayatId = panchayatId;
            }
        }

        // Apply filters
        if (status) {
            query.status = status;
        }

        if (category) {
            query.category = category;
        }

        // Parse pagination
        const pageNum = parseInt(page, 10) || 1;
        const limitNum = Math.min(parseInt(limit, 10) || 10, 100);
        const skip = (pageNum - 1) * limitNum;

        // Sort order
        const sortOrder = sort.toLowerCase() === 'asc' ? 1 : -1;
        const sortField = ['createdAt', 'updatedAt', 'ticketNumber', 'status', 'category'].includes(sortBy) ? sortBy : 'createdAt';

        // Execute query
        const [tickets, total] = await Promise.all([
            SupportTicket.find(query)
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limitNum)
                .select('-screenshot.attachment -voiceNote.attachment')
                .populate('panchayatId', 'name state district block'),
            SupportTicket.countDocuments(query)
        ]);

        res.set('x-total-count', total.toString());
        res.json({
            success: true,
            tickets,
            pagination: {
                page: pageNum,
                limit: limitNum,
                total,
                pages: Math.ceil(total / limitNum)
            }
        });

    } catch (error) {
        console.error('[SupportTicketRoutes] Error fetching tickets:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching support tickets: ' + error.message
        });
    }
});

/**
 * GET /api/support-tickets/:ticketId
 * Get ticket details
 * Auth: Official/Admin only
 */
router.get('/:ticketId', anyAuthenticated, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const user = req.user;

        // Only officials and admins can view tickets
        if (!['ADMIN', 'OFFICIAL', 'SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role) && user.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only officials and admins can view support tickets.'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ticket ID'
            });
        }

        const ticket = await SupportTicket.findById(ticketId)
            .populate('panchayatId', 'name state district block');

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        // Officials can only view tickets from their panchayat
        if (user.userType === 'OFFICIAL' && user.role !== 'ADMIN') {
            if (ticket.panchayatId && ticket.panchayatId._id.toString() !== user.panchayatId?.toString()) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only view tickets from your panchayat.'
                });
            }
        }

        res.json({
            success: true,
            ticket
        });

    } catch (error) {
        console.error('[SupportTicketRoutes] Error fetching ticket:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching support ticket: ' + error.message
        });
    }
});

/**
 * PATCH /api/support-tickets/:ticketId/status
 * Update ticket status
 * Auth: Admin only
 */
router.patch('/:ticketId/status', anyAuthenticated, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const { status, resolutionNotes } = req.body;
        const user = req.user;

        // Only admins can update ticket status
        if (user.userType !== 'ADMIN' && user.role !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Access denied. Only admins can update ticket status.'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ticket ID'
            });
        }

        // Validate status
        const validStatuses = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status. Must be one of: ' + validStatuses.join(', ')
            });
        }

        const ticket = await SupportTicket.findById(ticketId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        // Update ticket
        ticket.status = status;
        if (resolutionNotes) {
            ticket.resolutionNotes = resolutionNotes;
        }
        await ticket.save();

        console.log(`[SupportTicketRoutes] Ticket status updated:`, {
            ticketId,
            ticketNumber: ticket.ticketNumber,
            newStatus: status,
            updatedBy: user.username || user.name
        });

        res.json({
            success: true,
            message: 'Ticket status updated successfully',
            ticket: {
                _id: ticket._id,
                ticketNumber: ticket.ticketNumber,
                status: ticket.status,
                resolutionNotes: ticket.resolutionNotes,
                updatedAt: ticket.updatedAt
            }
        });

    } catch (error) {
        console.error('[SupportTicketRoutes] Error updating ticket status:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating ticket status: ' + error.message
        });
    }
});

/**
 * GET /api/support-tickets/:ticketId/transcription
 * Get transcription status for a ticket
 * Auth: Official/Admin only
 */
router.get('/:ticketId/transcription', anyAuthenticated, async (req, res) => {
    try {
        const { ticketId } = req.params;
        const user = req.user;

        // Only officials and admins can view tickets
        if (!['ADMIN', 'OFFICIAL', 'SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role) && user.userType !== 'ADMIN') {
            return res.status(403).json({
                success: false,
                message: 'Access denied.'
            });
        }

        if (!mongoose.Types.ObjectId.isValid(ticketId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid ticket ID'
            });
        }

        const ticket = await SupportTicket.findById(ticketId);

        if (!ticket) {
            return res.status(404).json({
                success: false,
                message: 'Support ticket not found'
            });
        }

        // If no transcription data
        if (!ticket.transcription || !ticket.transcription.requestId) {
            return res.json({
                success: true,
                transcription: null
            });
        }

        // If already completed, return stored data
        if (ticket.transcription.status === 'COMPLETED' && ticket.transcription.text) {
            return res.json({
                success: true,
                transcription: ticket.transcription
            });
        }

        // If processing, check status
        if (ticket.transcription.status === 'PROCESSING') {
            try {
                const statusResult = await transcriptionService.checkTranscriptionStatus(ticket.transcription.requestId);

                if (statusResult.status === 'completed' && statusResult.transcription) {
                    // Update ticket with completed transcription
                    ticket.transcription.status = 'COMPLETED';
                    ticket.transcription.text = statusResult.transcription;
                    ticket.transcription.originalTranscription = statusResult.originalTranscription;
                    ticket.transcription.enhancedEnglishTranscription = statusResult.enhancedEnglishTranscription;
                    ticket.transcription.enhancedHindiTranscription = statusResult.enhancedHindiTranscription;
                    ticket.transcription.processingMode = statusResult.processingMode;
                    ticket.transcription.transcriptionProvider = statusResult.transcriptionProvider;
                    ticket.transcription.providerInfo = statusResult.providerInfo;
                    ticket.transcription.llmEnhancementStatus = statusResult.llmEnhancementStatus;
                    ticket.transcription.completedAt = new Date();
                    ticket.transcription.lastError = null;
                    await ticket.save();

                    return res.json({
                        success: true,
                        transcription: ticket.transcription
                    });
                } else if (statusResult.status === 'failed') {
                    ticket.transcription.status = 'FAILED';
                    ticket.transcription.lastError = statusResult.error || 'Transcription failed';
                    await ticket.save();
                }
            } catch (statusError) {
                console.error('[SupportTicketRoutes] Error checking transcription status:', statusError);
            }
        }

        res.json({
            success: true,
            transcription: ticket.transcription
        });

    } catch (error) {
        console.error('[SupportTicketRoutes] Error fetching transcription:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching transcription: ' + error.message
        });
    }
});

/**
 * GET /api/support-tickets/categories/list
 * Get list of categories grouped by type
 * Auth: None (public endpoint)
 */
router.get('/categories/list', (req, res) => {
    res.json({
        success: true,
        categories: {
            technical: TECHNICAL_CATEGORIES,
            general: GENERAL_CATEGORIES
        }
    });
});

module.exports = router;
