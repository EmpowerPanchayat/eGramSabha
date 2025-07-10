const express = require('express');
const router = express.Router();
const IssueSummary = require('../models/IssueSummary');
const Issue = require('../models/Issue');
const { anyAuthenticated } = require('../middleware/auth');
const mongoose = require('mongoose');

// Get issue summary for a panchayat
router.get('/panchayat/:panchayatId', anyAuthenticated, async (req, res) => {
    try {
        const { panchayatId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(panchayatId)) {
            return res.status(400).json({ success: false, message: 'Invalid panchayatId' });
        }

        const summary = await IssueSummary.findOne({ panchayatId });

        if (!summary) {
            return res.status(404).json({ success: false, message: 'No summary found for this panchayat.' });
        }

        const responseData = {
            success: true,
            summary: {
                agendaItems: summary.agendaItems,
                issues: summary.issues.map(id => id.toString())
            }
        };

        res.json(responseData);

    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

// PATCH /issue-summary/panchayat/:panchayatId/agenda
router.patch('/panchayat/:panchayatId/agenda', anyAuthenticated, async (req, res) => {
    const { panchayatId } = req.params;
    const { agendaItems } = req.body;

    if (!mongoose.Types.ObjectId.isValid(panchayatId)) {
        return res.status(400).json({ success: false, message: 'Invalid panchayatId' });
    }
    if (!Array.isArray(agendaItems)) {
        return res.status(400).json({ success: false, message: 'agendaItems must be an array' });
    }
    // If agendaItems is an empty array, delete the summary record
    if (agendaItems.length === 0) {
        try {
            const deleted = await IssueSummary.findOneAndDelete({ panchayatId });
            if (deleted) {
                if (Array.isArray(deleted.issues) && deleted.issues.length > 0) {
                    await Issue.updateMany(
                        { _id: { $in: deleted.issues } },
                        { $set: { isSummarized: false } }
                    );
                }
                return res.json({ success: true, deleted: true });
            } else {
                return res.status(404).json({ success: false, message: 'No summary found for this panchayat.' });
            }
        } catch (error) {
            return res.status(500).json({ success: false, message: 'Internal server error' });
        }
    }

    try {
        // Find the summary
        const summary = await IssueSummary.findOne({ panchayatId });
        if (!summary) {
            return res.status(404).json({ success: false, message: 'No summary found for this panchayat.' });
        }

        // Ensure each issue is only linked to one agenda item
        const issueToAgendaMap = new Map();
        for (let i = agendaItems.length - 1; i >= 0; i--) {
            const item = agendaItems[i];
            if (Array.isArray(item.linkedIssues)) {
                item.linkedIssues = item.linkedIssues.filter(issueId => {
                    if (!issueToAgendaMap.has(issueId.toString())) {
                        issueToAgendaMap.set(issueId.toString(), i);
                        return true;
                    }
                    return false;
                });
            }
        }

        const originalIssueIds = summary.issues.map(id => id.toString());
        const newLinkedIssueIds = Array.from(issueToAgendaMap.keys());
        
        // Update the summary document
        summary.agendaItems = agendaItems;
        summary.issues = newLinkedIssueIds.map(id => new mongoose.Types.ObjectId(id));
        await summary.save();

        // Determine which issues were unlinked and update them
        const unlinkedIssueIds = originalIssueIds.filter(id => !newLinkedIssueIds.includes(id));
        if (unlinkedIssueIds.length > 0) {
            await Issue.updateMany(
                { _id: { $in: unlinkedIssueIds } },
                { $set: { isSummarized: false } }
            );
        }

        // Ensure all currently linked issues are marked as summarized
        if (newLinkedIssueIds.length > 0) {
            await Issue.updateMany(
                { _id: { $in: newLinkedIssueIds } },
                { $set: { isSummarized: true } }
            );
        }

        res.json({ success: true, agendaItems: summary.agendaItems });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
});

module.exports = router; 