const express = require('express');
const router = express.Router();
const Citizen = require('../models/Citizen');

// ...existing code...

// Direct login route (login with voter ID without face recognition)
router.post('/direct-login', async (req, res) => {
  try {
    const { voterIdNumber } = req.body;

    if (!voterIdNumber) {
      return res.status(400).json({ success: false, message: 'Voter ID is required' });
    }

    // Find citizen by voter ID
    const citizen = await Citizen.findOne({ voterIdNumber });

    if (!citizen) {
      return res.status(404).json({ success: false, message: 'Citizen not found' });
    }

    if (!citizen.isRegistered) {
      return res.status(403).json({ success: false, message: 'Citizen is not registered' });
    }

    // Update last login time
    citizen.lastLogin = new Date();
    await citizen.save();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        _id: citizen._id,
        name: citizen.name,
        voterIdNumber: citizen.voterIdNumber,
        isRegistered: citizen.isRegistered,
        gender: citizen.gender,
        panchayatId: citizen.panchayatId
      }
    });
  } catch (error) {
    console.error('Direct login error:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ...existing code...

module.exports = router;