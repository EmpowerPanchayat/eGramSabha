// File: backend/routes/panchayatRoutes.js
const express = require('express');
const router = express.Router();
const Panchayat = require('../models/Panchayat');
const User = require('../models/User');
const Ward = require('../models/Ward');
const Issue = require('../models/Issue');

// Get all panchayats
router.get('/', async (req, res) => {
  try {
    const panchayats = await Panchayat.find({});
    res.json(panchayats);
  } catch (error) {
    console.error('Error fetching panchayats:', error);
    res.status(500).json({ success: false, message: 'Error fetching panchayats' });
  }
});


// Add a new ward to a panchayat
router.post('/:id/wards', async (req, res) => {
  try {
    const panchayatId = req.params.id;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Create new ward with panchayatId
    const ward = new Ward({
      ...req.body,
      panchayatId
    });

    await ward.save();

    res.status(201).json({
      success: true,
      ward
    });
  } catch (error) {
    console.error('Error creating ward:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ward: ' + error.message
    });
  }
});

// Get all wards for a panchayat
router.get('/:id/wards', async (req, res) => {
  try {
    const panchayatId = req.params.id;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Fetch wards for this panchayat
    const wards = await Ward.find({ panchayatId });

    res.json({
      success: true,
      wards
    });
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wards: ' + error.message
    });
  }
});

// Update a ward
router.put('/:panchayatId/wards/:wardId', async (req, res) => {
  try {
    const { panchayatId, wardId } = req.params;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Update the ward
    const ward = await Ward.findOneAndUpdate(
      { _id: wardId, panchayatId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found or does not belong to this panchayat'
      });
    }

    res.json({
      success: true,
      ward
    });
  } catch (error) {
    console.error('Error updating ward:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ward: ' + error.message
    });
  }
});

// Delete a ward
router.delete('/:panchayatId/wards/:wardId', async (req, res) => {
  try {
    const { panchayatId, wardId } = req.params;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Delete the ward
    const ward = await Ward.findOneAndDelete({ _id: wardId, panchayatId });

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found or does not belong to this panchayat'
      });
    }

    res.json({
      success: true,
      message: 'Ward deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ward:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting ward: ' + error.message
    });
  }
});


// Get a specific panchayat
router.get('/:id', async (req, res) => {
  try {
    const panchayat = await Panchayat.findById(req.params.id);
    if (!panchayat) {
      return res.status(404).json({ success: false, message: 'Panchayat not found' });
    }
    res.json({ success: true, panchayat });
  } catch (error) {
    console.error('Error fetching panchayat:', error);
    res.status(500).json({ success: false, message: 'Error fetching panchayat' });
  }
});

// Create a new panchayat
router.post('/', async (req, res) => {
  try {
    const panchayat = new Panchayat(req.body);
    await panchayat.save();
    res.status(201).json({ success: true, panchayat });
  } catch (error) {
    console.error('Error creating panchayat:', error);
    res.status(500).json({ success: false, message: 'Error creating panchayat: ' + error.message });
  }
});

// Update a panchayat
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    const panchayat = await Panchayat.findByIdAndUpdate(
      req.params.id, 
      updates,
      { new: true }
    );
    
    if (!panchayat) {
      return res.status(404).json({ success: false, message: 'Panchayat not found' });
    }
    
    res.json({ success: true, panchayat });
  } catch (error) {
    console.error('Error updating panchayat:', error);
    res.status(500).json({ success: false, message: 'Error updating panchayat' });
  }
});

// Delete a panchayat
router.delete('/:id', async (req, res) => {
  try {
    const panchayatId = req.params.id;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({ 
        success: false, 
        message: 'Panchayat not found' 
      });
    }

    // Delete all related data
    const deleteOperations = [
      User.deleteMany({ panchayatId }),
      Ward.deleteMany({ panchayatId }),
      Issue.deleteMany({ panchayatId }),
      // Add other related collections here
      Panchayat.findByIdAndDelete(panchayatId)
    ];

    // Execute all delete operations
    const results = await Promise.all(deleteOperations);

    // Check if panchayat was deleted
    if (!results[results.length - 1]) {
      throw new Error('Failed to delete panchayat');
    }

    res.json({
      success: true,
      message: 'Panchayat and related data deleted successfully',
      deletedUsers: results[0].deletedCount,
      deletedIssues: results[1].deletedCount,
      deletedWards: results[2].deletedCount
    });

  } catch (error) {
    console.error('Error deleting panchayat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete panchayat and related data',
      error: error.message
    });
  }
});

// Get statistics for a specific panchayat
router.get('/:id/stats', async (req, res) => {
  try {
    const panchayatId = req.params.id;

    // First verify that the panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({ success: false, message: 'Panchayat not found' });
    }

    const totalUsers = await User.countDocuments({ panchayatId });
    const registeredUsers = await User.countDocuments({ panchayatId, isRegistered: true });
    const wardCount = await Ward.countDocuments({ panchayatId });

    res.json({
      success: true,
      panchayatId,
      totalUsers,
      registeredUsers,
      pendingUsers: totalUsers - registeredUsers,
      wardCount
    });
  } catch (error) {
    console.error('Error fetching panchayat stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching panchayat stats' });
  }
});

module.exports = router;