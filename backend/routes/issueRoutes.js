// File: backend/routes/issueRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const Issue = require('../models/Issue');
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');

// Create a new issue
router.post('/', async (req, res) => {
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
            creatorId,
            attachments
        } = req.body;

        // Validate required fields
        if (!category || !panchayatId || !creatorId || !subcategory) {
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

// Get all issues/suggestions for a panchayat
router.get('/panchayat/:panchayatId', async (req, res) => {
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
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

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
router.get('/:issueId', async (req, res) => {
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
router.get('/:issueId/attachment/:attachmentId', async (req, res) => {
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
router.post('/upload-attachment', async (req, res) => {
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