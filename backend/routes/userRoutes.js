// Updated File: backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');
const sharp = require('sharp');
const mongoose = require('mongoose');
const storageService = require('../storage/storageService');

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
    let faceImageId = null;
    let oldFaceImageId = user.faceImageId;
    let oldThumbnailImageId = user.thumbnailImageId;
    if (faceImage) {
      // Remove header from base64 string
      const base64Data = faceImage.replace(/^data:image\/\w+;base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      // Use a safe filename
      const safeVoterId = voterId.replace(/[\/\\:*?"<>|]/g, '_');
      const filename = `${safeVoterId}_${Date.now()}.jpg`;

      // Upload original image
      faceImageId = await storageService.uploadImage(buffer, filename, {
        userId: user._id,
        voterId,
        panchayatId,
        type: 'profile'
      });

      // Create and upload thumbnail
      try {
        const thumbBuffer = await sharp(buffer).resize(100, 100).jpeg({ quality: 80 }).toBuffer();
        const thumbFilename = `${safeVoterId}_thumb_${Date.now()}.jpg`;
        const thumbImageId = await storageService.uploadImage(thumbBuffer, thumbFilename, {
          userId: user._id,
          voterId,
          panchayatId,
          type: 'thumbnail',
          originalImageId: faceImageId
        });
        user.thumbnailImageId = thumbImageId;
        await user.save();
        // Delete old thumbnail if exists
        if (oldThumbnailImageId) {
          try { 
            await storageService.deleteImage(oldThumbnailImageId);
          } catch (e) {
            console.warn('Failed to delete old image:', e);
          }
        }
      } catch (err) {
        console.error('Thumbnail creation failed:', err);
      }
    }

    // Update user
    user.faceDescriptor = faceDescriptor;
    if (faceImageId) user.faceImageId = faceImageId;
    user.isRegistered = true;
    user.registrationDate = new Date();
    await user.save();

    // Delete old face image if new one was uploaded
    if (faceImageId && oldFaceImageId) {
      try {
        await storageService.deleteImage(oldFaceImageId);
      } catch (e) {
        console.warn('Failed to delete old image:', e);
      }
    }

    res.json({
      success: true,
      message: 'Face registered successfully',
      user: {
        name: user.name,
        voterIdNumber: user.voterIdNumber,
        panchayatId: user.panchayatId,
        isRegistered: user.isRegistered,
        faceImageId: user.faceImageId
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

    if (!user || !user.faceImageId) {
      return res.status(404).json({ success: false, message: 'Face image not found' });
    }

    res.json({
      success: true,
      faceImageId: user.faceImageId
    });
  } catch (error) {
    console.error('Error fetching face image:', error);
    res.status(500).json({ success: false, message: 'Error fetching face image' });
  }
});

// Get face image by ID
router.get('/face-image/:faceImageId', async (req, res) => {
  try {
    const fileId = mongoose.Types.ObjectId.isValid(req.params.faceImageId)
      ? new mongoose.Types.ObjectId(req.params.faceImageId)
      : req.params.faceImageId;

    const imageStream = await storageService.getImageStream(fileId);

    // Only set headers after confirming the file exists, or handle the error before piping.
    let sent = false;
    imageStream.on('error', () => {
      if (!sent) {
        sent = true;
        res.status(404).send('Image not found');
      }
    });

    res.set('Content-Type', 'image/jpeg');
    imageStream.pipe(res);
  } catch (error) {
    res.status(404).send('Image not found');
  }
});

// Update user profile
router.put('/:voterId', async (req, res) => {
  try {
    const { voterId } = req.params;
    const { panchayatId } = req.query;
    const updateData = req.body;

    const filter = { voterIdNumber: voterId };
    if (panchayatId) {
      filter.panchayatId = panchayatId;
    }

    // If voter ID is being changed, check for uniqueness
    if (updateData.voterIdNumber && updateData.voterIdNumber !== voterId) {
      const existingUser = await User.findOne({
        voterIdNumber: updateData.voterIdNumber,
        panchayatId: panchayatId || filter.panchayatId
      });

      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Voter ID already exists in this panchayat'
        });
      }
    }

    // Find and update the user
    const user = await User.findOneAndUpdate(
      filter,
      { $set: updateData },
      { new: true }
    ).select('-faceDescriptor');

    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ success: false, message: 'Error updating profile' });
  }
});

// Get users by panchayat ID
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

        const users = await User.find({ panchayatId })
            .select('_id name voterIdNumber')
            .sort({ name: 1 });

        res.json({
            success: true,
            count: users.length,
            users
        });
    } catch (error) {
        console.error('Error fetching panchayat users:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching panchayat users',
            error: error.message
        });
    }
});

// Stream thumbnail image from GridFS by user ID
router.get('/:id/thumbnail', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user || !user.thumbnailImageId) {
      return res.status(404).send('Thumbnail not found');
    }
    const stream = await storageService.getImageStream(user.thumbnailImageId);
    res.set('Content-Type', 'image/jpeg');
    stream.pipe(res);
  } catch (error) {
    res.status(404).send('Thumbnail not found');
  }
});

module.exports = router;