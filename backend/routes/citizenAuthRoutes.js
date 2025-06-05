// backend/routes/citizenAuthRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');
const { isCitizen } = require('../middleware/auth');
const crypto = require('crypto');
const { verifyRefreshToken } = require('../config/jwt');

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


// Initiate face login (step 1)
router.post('/face-login/init', async (req, res) => {
    try {
        const { voterIdLastFour, panchayatId } = req.body;

        if (!voterIdLastFour || voterIdLastFour.length !== 4 || !panchayatId) {
            return res.status(400).json({
                success: false,
                message: 'Last 4 digits of voter ID and panchayat ID are required'
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

        // Find all users with matching voter ID last 4 digits in the panchayat
        const potentialUsers = await User.find({
            panchayatId,
            isRegistered: true,
            faceDescriptor: { $exists: true, $ne: null },
            voterIdNumber: { $regex: voterIdLastFour + '$' } // Ends with the last four digits
        });

        // If no users found with the exact last four digits, try a more flexible approach
        if (potentialUsers.length === 0) {
            // Try to find users with the four digits anywhere in the voter ID
            const flexibleUsers = await User.find({
                panchayatId,
                isRegistered: true,
                faceDescriptor: { $exists: true, $ne: null },
                voterIdNumber: { $regex: voterIdLastFour, $options: 'i' } // Contains the four digits
            });

            if (flexibleUsers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No registered users found with matching voter ID'
                });
            }

            // Store the list of potential users in the session or a temporary storage
            // For simplicity, we'll just generate a security token for each user

            // Create a map of user IDs to security tokens
            const userSecurityTokens = {};

            for (const user of flexibleUsers) {
                const securityToken = user.createSecurityToken();
                await user.save();
                userSecurityTokens[user._id.toString()] = securityToken;
            }

            // Return success with the list of potential user IDs and their security tokens
            res.json({
                success: true,
                message: 'Face login initiated',
                data: {
                    userSecurityTokens,
                    potentialUserIds: flexibleUsers.map(user => user._id),
                    panchayatId
                }
            });

            return;
        }

        // If there's only one matching user
        if (potentialUsers.length === 1) {
            const user = potentialUsers[0];
            const securityToken = user.createSecurityToken();
            await user.save();

            // Return minimal user info with security token
            res.json({
                success: true,
                message: 'Face login initiated',
                data: {
                    securityToken,
                    userId: user._id,
                    name: user.name,
                    panchayatId: user.panchayatId
                }
            });

            return;
        }

        // Multiple potential matches - generate tokens for all of them
        const userSecurityTokens = {};

        for (const user of potentialUsers) {
            const securityToken = user.createSecurityToken();
            await user.save();
            userSecurityTokens[user._id.toString()] = securityToken;
        }

        // Return success with the list of potential user IDs and their security tokens
        res.json({
            success: true,
            message: 'Face login initiated',
            data: {
                userSecurityTokens,
                potentialUserIds: potentialUsers.map(user => user._id),
                panchayatId
            }
        });

    } catch (error) {
        console.error('Face login initiation error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during face login initiation',
            error: error.message
        });
    }
});

// Complete face login (step 2) - Enhanced for multiple potential users
router.post('/face-login/verify', async (req, res) => {
    try {
        const { userId, securityToken, faceDescriptor, potentialUserIds, userSecurityTokens } = req.body;

        // Check for either single user authentication or multiple potential users
        if ((!userId || !securityToken) && (!potentialUserIds || !userSecurityTokens)) {
            return res.status(400).json({
                success: false,
                message: 'User identification and security token information are required'
            });
        }

        if (!faceDescriptor) {
            return res.status(400).json({
                success: false,
                message: 'Face descriptor is required'
            });
        }

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

        // Case 1: Single user authentication
        if (userId && securityToken) {
            const user = await User.findById(userId);

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            // Verify security token
            const hashedToken = crypto
                .createHash('sha256')
                .update(securityToken)
                .digest('hex');

            if (user.securityToken !== hashedToken || !user.securityTokenExpires || user.securityTokenExpires < Date.now()) {
                return res.status(401).json({
                    success: false,
                    message: 'Invalid or expired security token'
                });
            }

            // Compare face descriptors
            const distance = calculateFaceDistance(user.faceDescriptor, faceDescriptor);

            // Threshold for face matching (lower is better match)
            const FACE_MATCH_THRESHOLD = 0.4;

            if (distance > FACE_MATCH_THRESHOLD) {
                return res.status(401).json({
                    success: false,
                    message: 'Face verification failed',
                    distance: distance
                });
            }

            // Clear security token after successful verification
            user.securityToken = undefined;
            user.securityTokenExpires = undefined;
            user.lastLogin = Date.now();
            await user.save();

            // Generate auth tokens
            const token = user.generateAuthToken();
            const refreshToken = user.generateRefreshToken();

            // Get panchayat details
            const panchayat = await Panchayat.findById(user.panchayatId);

            res.json({
                success: true,
                message: 'Face login successful',
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
                        voterIdNumber: user.voterIdNumber,
                        panchayatId: user.panchayatId,
                        wardId: user.wardId,
                        panchayat: panchayat ? {
                            id: panchayat._id,
                            name: panchayat.name,
                            district: panchayat.district,
                            state: panchayat.state
                        } : null,
                        userType: 'CITIZEN'
                    },
                    token,
                    refreshToken
                }
            });

            return;
        }

        // Case 2: Multiple potential users
        if (potentialUserIds && userSecurityTokens) {
            // Fetch all potential users
            const potentialUsers = await User.find({
                _id: { $in: potentialUserIds }
            });

            if (potentialUsers.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'No matching users found'
                });
            }

            // Calculate face distances for all potential users
            const userDistances = [];

            for (const user of potentialUsers) {
                // Verify the security token for this user
                const securityToken = userSecurityTokens[user._id.toString()];

                if (!securityToken) {
                    continue; // Skip users without a security token
                }

                const hashedToken = crypto
                    .createHash('sha256')
                    .update(securityToken)
                    .digest('hex');

                if (user.securityToken !== hashedToken || !user.securityTokenExpires || user.securityTokenExpires < Date.now()) {
                    continue; // Skip users with invalid tokens
                }

                // Calculate face distance
                const distance = calculateFaceDistance(user.faceDescriptor, faceDescriptor);
                userDistances.push({ user, distance });
            }

            // Sort by distance (closest match first)
            userDistances.sort((a, b) => a.distance - b.distance);

            // Check if we have any matches
            if (userDistances.length === 0) {
                return res.status(401).json({
                    success: false,
                    message: 'No valid users with matching faces found'
                });
            }

            // Threshold for face matching
            const FACE_MATCH_THRESHOLD = 0.4;

            // Get the best match
            const bestMatch = userDistances[0];

            // If distance is too high, reject
            if (bestMatch.distance > FACE_MATCH_THRESHOLD) {
                return res.status(401).json({
                    success: false,
                    message: 'Face verification failed',
                    distance: bestMatch.distance
                });
            }

            // If we have multiple close matches, reject for security
            if (userDistances.length > 1 &&
                userDistances[1].distance - userDistances[0].distance < 0.15 &&
                userDistances[1].distance < FACE_MATCH_THRESHOLD) {

                return res.status(401).json({
                    success: false,
                    message: 'Multiple potential matches found. Please try again with more specific voter ID information.'
                });
            }

            // We have a unique best match, proceed with login
            const user = bestMatch.user;

            // Clear security token
            user.securityToken = undefined;
            user.securityTokenExpires = undefined;
            user.lastLogin = Date.now();
            await user.save();

            // Generate auth tokens
            const token = user.generateAuthToken();
            const refreshToken = user.generateRefreshToken();

            // Get panchayat details
            const panchayat = await Panchayat.findById(user.panchayatId);

            res.json({
                success: true,
                message: 'Face login successful',
                data: {
                    user: {
                        id: user._id,
                        name: user.name,
                        voterIdNumber: user.voterIdNumber,
                        panchayatId: user.panchayatId,
                        wardId: user.wardId,
                        panchayat: panchayat ? {
                            id: panchayat._id,
                            name: panchayat.name,
                            district: panchayat.district,
                            state: panchayat.state
                        } : null,
                        userType: 'CITIZEN'
                    },
                    token,
                    refreshToken
                }
            });
        }
    } catch (error) {
        console.error('Face login verification error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during face verification',
            error: error.message
        });
    }
});

// Refresh token for citizen
router.post('/refresh-token', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }

        // Verify refresh token
        const decoded = verifyRefreshToken(refreshToken);

        if (decoded.userType !== 'CITIZEN') {
            return res.status(401).json({
                success: false,
                message: 'Invalid citizen refresh token'
            });
        }

        // Find citizen by id
        const citizen = await User.findById(decoded.id);

        if (!citizen) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check if registered
        if (!citizen.isRegistered) {
            return res.status(403).json({
                success: false,
                message: 'Account is not fully registered'
            });
        }

        // Generate new tokens
        const token = citizen.generateAuthToken();
        const newRefreshToken = citizen.generateRefreshToken();

        // Get panchayat details
        const panchayat = await Panchayat.findById(citizen.panchayatId);

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token,
                refreshToken: newRefreshToken,
                user: {
                    id: citizen._id,
                    name: citizen.name,
                    voterIdNumber: citizen.voterIdNumber,
                    panchayatId: citizen.panchayatId,
                    wardId: citizen.wardId,
                    panchayat: panchayat ? {
                        id: panchayat._id,
                        name: panchayat.name,
                        district: panchayat.district,
                        state: panchayat.state
                    } : null,
                    userType: 'CITIZEN'
                }
            }
        });
    } catch (error) {
        console.error('Citizen token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
            error: error.message
        });
    }
});

// Get citizen profile
router.get('/me', isCitizen, async (req, res) => {
    try {
        const citizen = await User.findById(req.citizen.id).select('-faceDescriptor');

        if (!citizen) {
            return res.status(404).json({
                success: false,
                message: 'Citizen not found'
            });
        }

        // Get panchayat details
        const panchayat = await Panchayat.findById(citizen.panchayatId);

        res.json({
            success: true,
            data: {
                user: {
                    id: citizen._id,
                    name: citizen.name,
                    gender: citizen.gender,
                    fatherName: citizen.fatherName,
                    husbandName: citizen.husbandName,
                    motherName: citizen.motherName,
                    address: citizen.address,
                    mobileNumber: citizen.mobileNumber,
                    voterIdNumber: citizen.voterIdNumber,
                    faceImagePath: citizen.faceImagePath,
                    isRegistered: citizen.isRegistered,
                    registrationDate: citizen.registrationDate,
                    lastLogin: citizen.lastLogin,
                    panchayatId: citizen.panchayatId,
                    wardId: citizen.wardId,
                    panchayat: panchayat ? {
                        id: panchayat._id,
                        name: panchayat.name,
                        district: panchayat.district,
                        state: panchayat.state
                    } : null,
                    userType: 'CITIZEN'
                }
            }
        });
    } catch (error) {
        console.error('Error fetching citizen profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching citizen profile',
            error: error.message
        });
    }
});

module.exports = router;