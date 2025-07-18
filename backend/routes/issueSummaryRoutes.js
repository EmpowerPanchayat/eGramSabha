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
  const userId = req.user._id;

  if (!mongoose.Types.ObjectId.isValid(panchayatId)) {
    return res.status(400).json({ success: false, message: 'Invalid panchayatId' });
  }
  if (!Array.isArray(agendaItems)) {
    return res.status(400).json({ success: false, message: 'agendaItems must be an array' });
  }
  
  try {
    let summary = await IssueSummary.findOne({ panchayatId });

    if (!summary) {
      summary = await IssueSummary.create({ panchayatId, agendaItems: [], issues: [] });
    }

    // Build set of incoming agenda item IDs
    const incomingIds = new Set(agendaItems.map(i => i._id?.toString()));

    // If agendaItems list is empty, delete entire summary
    if (agendaItems.length === 0) {
      const deleted = await IssueSummary.findOneAndDelete({ panchayatId });
      if (deleted?.issues?.length) {
        await Issue.updateMany({ _id: { $in: deleted.issues } }, { $set: { isSummarized: false } });
      }
      return res.json({ success: true, deleted: true });
    }

    // Separate USER items and remap
    const newUserItems = agendaItems
      .filter(i => (i.createdByType || 'USER') === 'USER')
      .map(item => ({
        ...item,
        _id: item._id ? new mongoose.Types.ObjectId(item._id) : new mongoose.Types.ObjectId(),
        createdByType: 'USER',
        createdByUserId: new mongoose.Types.ObjectId(item.createdByUserId || userId),
        title: new Map(Object.entries(item.title || {})),
        description: new Map(Object.entries(item.description || {})),
        linkedIssues: item.linkedIssues?.map(id => new mongoose.Types.ObjectId(id)) || []
      }));

    // SYSTEM items from incoming list (preserve structure)
    const newSystemItems = agendaItems
      .filter(i => i.createdByType === 'SYSTEM')
      .map(item => ({
        ...item,
        _id: new mongoose.Types.ObjectId(item._id),
        title: new Map(Object.entries(item.title || {})),
        description: new Map(Object.entries(item.description || {})),
        linkedIssues: item.linkedIssues?.map(id => new mongoose.Types.ObjectId(id)) || [],
        createdByType: 'SYSTEM'
      }));

    // Prevent duplicate issue linking
    const issueToAgendaMap = new Map();
    for (let i = newUserItems.length - 1; i >= 0; i--) {
      const item = newUserItems[i];
      item.linkedIssues = item.linkedIssues.filter(issueId => {
        const key = issueId.toString();
        if (!issueToAgendaMap.has(key)) {
          issueToAgendaMap.set(key, i);
          return true;
        }
        return false;
      });
    }

    // Merge
    const mergedAgenda = [...newUserItems, ...newSystemItems];

    // Update linked issues
    const updatedIssueIds = mergedAgenda.flatMap(item =>
      item.linkedIssues.map(id => id.toString())
    );
    const uniqueIssueIds = [...new Set(updatedIssueIds)].map(id => new mongoose.Types.ObjectId(id));

    const previouslyLinkedIds = summary.issues.map(id => id.toString());
    const unlinked = previouslyLinkedIds.filter(id => !updatedIssueIds.includes(id));

    // Save
    summary.agendaItems = mergedAgenda;
    summary.issues = uniqueIssueIds;
    await summary.save();

    // Update isSummarized flags
    if (unlinked.length > 0) {
      await Issue.updateMany(
        { _id: { $in: unlinked } },
        { $set: { isSummarized: false } }
      );
    }

    if (uniqueIssueIds.length > 0) {
      await Issue.updateMany(
        { _id: { $in: uniqueIssueIds } },
        { $set: { isSummarized: true } }
      );
    }
    res.json({ success: true, agendaItems: summary.agendaItems });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Internal server error', error: error.message });
  }
});

module.exports = router; 