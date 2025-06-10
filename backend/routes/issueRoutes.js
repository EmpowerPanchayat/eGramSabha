// File: backend/routes/issueRoutes.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');
const { anyAuthenticated } = require('../middleware/auth');

// Create a new issue
router.post('/', anyAuthenticated, async (req, res) => {
    try {
        const {
            text,
            category,
            subcategory,
            priority,
            createdFor,
            toBeResolvedBefore,
            remark,
            panchayatId,
            gramSabhaId,
            attachments
        } = req.body;
        // Validate required fields
        if (!category || !panchayatId || !subcategory) {
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
        // Create issue instance
        const issue = new Issue({
            text,
            category,
            subcategory,
            priority: priority || 'NORMAL',
            createdFor,
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

        // Partial match on category (case-insensitive)
        if (category?.trim()) {
            query.category = { $regex: new RegExp(category.trim(), 'i') };
        }

        // Partial match on createdFor (exact field must exist on schema)
        if (createdFor?.trim()) {
            query.createdFor = { $regex: new RegExp(createdFor.trim(), 'i') };
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

        // Filter by creator name (fuzzy)
        if (creator?.trim()) {
            const users = await User.find({
                name: { $regex: new RegExp(creator.trim(), 'i') }
            }).select('_id');

            const creatorIds = users.map(u => u._id);
            if (creatorIds.length === 0) {
                res.set('X-Total-Count', '0');
                return res.status(200).json([]);
            }
            query.creatorId = { $in: creatorIds };
        }

        // Search text (optional) on text, category, createdFor etc.
        if (searchText?.trim()) {
            const regex = new RegExp(searchText.trim(), 'i');
            query.$or = [
                { text: { $regex: regex } },
                { category: { $regex: regex } },
                { createdFor: { $regex: regex } },
            ];
        }

        // Execute query
        const [issues, total] = await Promise.all([
            Issue.find(query)
                .sort({ [sortField]: sortOrder })
                .skip(skip)
                .limit(limit)
                .select('-attachments.attachment')
                .populate({ path: 'creatorId', select: 'name' }),
            Issue.countDocuments(query)
        ]);

        const formatted = issues.map(issue => ({
            ...issue.toObject(),
            creator: { name: issue.creatorId?.name || 'Unknown' }
        }));

        res.set('X-Total-Count', total.toString());
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
            .populate({
                path: 'creatorId',
                select: 'name'
            });

        // Transform the response to include creator name
        const transformedIssues = issues.map(issue => ({
            ...issue.toObject(),
            creator: {
                name: issue.creatorId?.name || 'Unknown'
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

        const issues = await Issue.find({ creatorId: userId })
            .sort({ createdAt: -1 })
            .select('-attachments.attachment') // Exclude attachment data to reduce payload size
            .populate({
                path: 'creatorId',
                select: 'name'
            });

        // Transform the response to include creator name
        const transformedIssues = issues.map(issue => ({
            ...issue.toObject(),
            creator: {
                name: issue.creatorId?.name || 'Unknown'
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
            .populate({
                path: 'creatorId',
                select: 'name'
            });

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

        if (!issueId || !attachmentData) {
            return res.status(400).json({
                success: false,
                message: 'Issue/Suggestion ID and attachment data are required'
            });
        }

        const issue = await Issue.findById(issueId);

        if (!issue) {
            return res.status(404).json({
                success: false,
                message: 'Issue/Suggestion not found'
            });
        }

        // Add attachment to issue
        issue.attachments.push({
            attachment: attachmentData,
            filename: filename || 'unnamed-file',
            mimeType: mimeType || 'application/octet-stream',
            uploadedAt: new Date()
        });

        await issue.save();

        res.json({
            success: true,
            message: 'Attachment uploaded successfully',
            attachmentId: issue.attachments[issue.attachments.length - 1]._id
        });
    } catch (error) {
        console.error('Error uploading attachment:', error);
        res.status(500).json({
            success: false,
            message: 'Error uploading attachment: ' + error.message
        });
    }
});

module.exports = router;