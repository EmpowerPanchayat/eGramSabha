// Updated File: backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');

// Get all users with optional panchayatId filter
router.get('/', async (req, res) => {
  try {
    const { panchayatId } = req.query;
    const filter = panchayatId ? { panchayatId } : {};

    const users = await User.find(filter).select('-faceDescriptor');
    res.json(users);
  } catch (error) {
    console.error('Error fetching members:', error);
    res.status(500).json({ success: false, message: 'Error fetching members' });
  }
});

// Search users by voter ID with optional panchayatId filter
router.get('/search', async (req, res) => {
  try {
    const { voterId, panchayatId } = req.query;
    const filter = { voterIdNumber: voterId };
    if (panchayatId) {
      filter.panchayatId = panchayatId;
    }

    const user = await User.findOne(filter).select('-faceDescriptor');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error searching user:', error);
    res.status(500).json({ success: false, message: 'Error searching member' });
  }
});

// Helper function to calculate Euclidean distance between face descriptors
const calculateFaceDistance = (descriptor1, descriptor2) => {
  if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
  }
  return Math.sqrt(sum);
};

// Register face - fixed to handle missing panchayatId, both direct on path and in body
router.post('/register-face', async (req, res) => {
  try {
    const { voterId, faceDescriptor, faceImage, panchayatId } = req.body;
    console.log('Register face request received for voter ID:', voterId);
    console.log('Face image data received:', faceImage ? 'Yes (length: ' + faceImage.length + ')' : 'No');
    console.log('PanchayatId received:', panchayatId);

    // Validate panchayatId is provided
    if (!panchayatId) {
      return res.status(400).json({
        success: false,
        message: 'PanchayatId is required for face registration'
      });
    }

    // Verify panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Find the user
    const user = await User.findOne({ voterIdNumber: voterId, panchayatId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check if face already exists for another user in the same panchayat
    const allUsers = await User.find({
      faceDescriptor: { $exists: true, $ne: null },
      voterIdNumber: { $ne: voterId },
      panchayatId // Only check within the same panchayat
    });

    // Face similarity check
    const threshold = 0.38; // Lower = more strict comparison
    let existingMatch = null;

    for (const existingUser of allUsers) {
      if (existingUser.faceDescriptor && existingUser.faceDescriptor.length > 0) {
        const distance = calculateFaceDistance(existingUser.faceDescriptor, faceDescriptor);
        console.log(`Face distance with ${existingUser.voterIdNumber}: ${distance}`);

        if (distance < threshold) {
          existingMatch = existingUser;
          break;
        }
      }
    }

    if (existingMatch) {
      return res.status(400).json({
        success: false,
        message: `This face appears to be already registered with voter ID: ${existingMatch.voterIdNumber} (${existingMatch.name})`
      });
    }

    console.log('Attempting to save face image...');
    // Save face image if provided
    let faceImagePath = null;
    if (faceImage) {
      // Remove header from base64 string
      const base64Data = faceImage.replace(/^data:image\/\w+;base64,/, '');

      // Create a faces subdirectory within panchayat directory if it doesn't exist
      const panchayatDir = path.join(__dirname, '../uploads', panchayatId.toString());
      const facesDir = path.join(panchayatDir, 'faces');

      if (!fs.existsSync(panchayatDir)) {
        fs.mkdirSync(panchayatDir, { recursive: true });
      }

      if (!fs.existsSync(facesDir)) {
        fs.mkdirSync(facesDir, { recursive: true });
      }

      // Create a safe filename based on voter ID (removing any slashes or problematic characters)
      const safeVoterId = voterId.replace(/[\/\\:*?"<>|]/g, '_');
      const filename = `${safeVoterId}_${Date.now()}.jpg`;

      // Use a path format that works with our static file serving
      faceImagePath = `/uploads/${panchayatId}/faces/${filename}`;

      // Save the image
      try {
        fs.writeFileSync(path.join(facesDir, filename), base64Data, 'base64');
        console.log(`Face image saved at: ${faceImagePath}`);
      } catch (error) {
        console.error('Error saving face image:', error);
        throw new Error('Failed to save face image: ' + error.message);
      }
    }

    // Update user
    user.faceDescriptor = faceDescriptor;
    user.faceImagePath = faceImagePath;
    user.isRegistered = true;
    user.registrationDate = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Face registered successfully',
      user: {
        name: user.name,
        voterIdNumber: user.voterIdNumber,
        panchayatId: user.panchayatId,
        isRegistered: user.isRegistered,
        faceImagePath: user.faceImagePath
      }
    });
  } catch (error) {
    console.error('Error registering face:', error);
    res.status(500).json({ success: false, message: 'Error registering face: ' + error.message });
  }
});

// Additional endpoint for backward compatibility with the /api/register-face path
router.post('/api/register-face', async (req, res) => {
  // Forward to the correct endpoint
  req.url = '/register-face';
  router.handle(req, res);
});

// Get user face image
router.get('/:voterId/face', async (req, res) => {
  try {
    const { voterId } = req.params;
    const { panchayatId } = req.query;

    const filter = { voterIdNumber: voterId };
    if (panchayatId) {
      filter.panchayatId = panchayatId;
    }

    const user = await User.findOne(filter);

    if (!user || !user.faceImagePath) {
      return res.status(404).json({ success: false, message: 'Face image not found' });
    }

    res.json({
      success: true,
      faceImagePath: user.faceImagePath
    });
  } catch (error) {
    console.error('Error fetching face image:', error);
    res.status(500).json({ success: false, message: 'Error fetching face image' });
  }
});

module.exports = router;