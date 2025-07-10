// File: backend/routes/citizenRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');
const { isCitizen } = require('../middleware/auth');

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

// Login with face recognition
router.post('/face-login', async (req, res) => {
    try {
        const { faceDescriptor, panchayatId, voterIdLastFour } = req.body;

        if (!faceDescriptor || !Array.isArray(faceDescriptor) || faceDescriptor.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Valid face descriptor is required for authentication'
            });
        }

        if (!voterIdLastFour || voterIdLastFour.length !== 4) {
            return res.status(400).json({
                success: false,
                message: 'Last 4 digits of voter ID are required'
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

        // Search for users with matching voter ID last 4 digits and registered faces
        const registeredUsers = await User.find({
            panchayatId,
            isRegistered: true,
            faceDescriptor: { $exists: true, $ne: null },
            voterIdNumber: { $regex: voterIdLastFour, $options: 'i' } // Case-insensitive contains check

        });

        if (registeredUsers.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'No registered users found with matching voter ID'
            });
        }

        // Find the best match among filtered users
        let bestMatch = null;
        let minDistance = 0.5; // Slightly relaxed threshold since we've pre-filtered users
        let distances = [];

        for (const user of registeredUsers) {
            const distance = calculateFaceDistance(user.faceDescriptor, faceDescriptor);
            distances.push({ user, distance });

            if (distance < minDistance) {
                minDistance = distance;
                bestMatch = user;
            }
        }

        // Sort distances to check if there are multiple close matches
        distances.sort((a, b) => a.distance - b.distance);

        // If there are multiple close matches (within 0.15 of each other), reject for security
        if (distances.length > 1 && 
            distances[1].distance - distances[0].distance < 0.15 && 
            distances[0].distance < 0.5) {
            return res.status(401).json({
                success: false,
                message: 'Multiple potential matches found. Please try again or contact administrator.'
            });
        }

        if (!bestMatch) {
            return res.status(401).json({
                success: false,
                message: 'Face not recognized. Please try again or contact administrator.'
            });
        }

        // Additional validation: Check if the user is properly registered
        if (!bestMatch.isRegistered || !bestMatch.faceDescriptor) {
            return res.status(401).json({
                success: false,
                message: 'User registration incomplete. Please contact administrator.'
            });
        }

        // Return user info without sensitive data
        res.json({
            success: true,
            message: 'Authentication successful',
            user: {
                _id: bestMatch._id,
                name: bestMatch.name,
                voterIdNumber: bestMatch.voterIdNumber,
                panchayatId: bestMatch.panchayatId,
                isRegistered: bestMatch.isRegistered
            }
        });
    } catch (error) {
        console.error('Error during face login:', error);
        res.status(500).json({
            success: false,
            message: 'Error during face authentication: ' + error.message
        });
    }
});

// Get citizen profile
router.get('/profile/:userId', isCitizen, async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findById(userId).select('-faceDescriptor');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Get panchayat details
        const panchayat = await Panchayat.findById(user.panchayatId);

        res.json({
            success: true,
            user: {
                _id: user._id,
                name: user.name,
                gender: user.gender,
                voterIdNumber: user.voterIdNumber,
                address: user.address,
                mobileNumber: user.mobileNumber,
                faceImageId: user.faceImageId,
                thumbnailImageId: user.thumbnailImageId,
                isRegistered: user.isRegistered,
                panchayat: panchayat ? {
                    _id: panchayat._id,
                    name: panchayat.name,
                    district: panchayat.district,
                    state: panchayat.state
                } : null
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching citizen profile: ' + error.message
        });
    }
});

module.exports = router;