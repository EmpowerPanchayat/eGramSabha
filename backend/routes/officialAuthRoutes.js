// File: backend/routes/officialAuthRoutes.js
const express = require('express');
const router = express.Router();
const Official = require('../models/Official');
const { verifyRefreshToken } = require('../config/jwt');
const { isOfficial } = require('../middleware/auth');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Official login
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both username and password'
            });
        }

        // Find official by username, excluding ADMIN role
        const official = await Official.findOne({
            username,
            role: { $ne: 'ADMIN' }
        });

        if (!official) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Check if account is active
        if (!official.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Official account is deactivated'
            });
        }

        // Check password
        const isPasswordValid = await official.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials'
            });
        }

        // Update last login time
        official.lastLogin = Date.now();
        await official.save();

        // Generate tokens
        const token = await official.generateAuthToken();
        const refreshToken = official.generateRefreshToken();

        // Get linked user data if exists - critical for official functionality
        let linkedUser = null;
        if (official.linkedCitizenId) {
            linkedUser = await mongoose.model('User').findById(official.linkedCitizenId)
                .select('_id name voterIdNumber panchayatId faceImagePath');
        }

        res.json({
            success: true,
            message: 'Official login successful',
            data: {
                user: {
                    id: official._id,
                    username: official.username,
                    email: official.email,
                    name: official.name,
                    role: official.role,
                    panchayatId: official.panchayatId,
                    avatarUrl: official.avatarUrl,
                    linkedCitizenId: official.linkedCitizenId,
                    linkedUser: linkedUser ? {
                        id: linkedUser._id,
                        name: linkedUser.name,
                        voterIdNumber: linkedUser.voterIdNumber,
                        panchayatId: linkedUser.panchayatId,
                        faceImagePath: linkedUser.faceImagePath
                    } : null,
                    userType: 'OFFICIAL',
                    wardId: official.wardId
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Official login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during official login',
            error: error.message
        });
    }
});

// Refresh token for official
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

        // Find official by id, excluding ADMIN role
        const official = await Official.findOne({
            _id: decoded.id,
            role: { $ne: 'ADMIN' }
        });

        if (!official) {
            return res.status(401).json({
                success: false,
                message: 'Invalid official refresh token'
            });
        }

        // Check if account is active
        if (!official.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Official account is deactivated'
            });
        }

        // Generate new access token
        const token = await official.generateAuthToken();
        // Generate new refresh token too
        const newRefreshToken = official.generateRefreshToken();

        // Get linked user data if exists - critical for official functionality
        let linkedUser = null;
        if (official.linkedCitizenId) {
            linkedUser = await mongoose.model('User').findById(official.linkedCitizenId)
                .select('_id name voterIdNumber panchayatId faceImagePath');
        }

        res.json({
            success: true,
            message: 'Official token refreshed successfully',
            data: {
                token,
                refreshToken: newRefreshToken,
                user: {
                    id: official._id,
                    username: official.username,
                    email: official.email,
                    name: official.name,
                    role: official.role,
                    panchayatId: official.panchayatId,
                    avatarUrl: official.avatarUrl,
                    linkedCitizenId: official.linkedCitizenId,
                    linkedUser: linkedUser ? {
                        id: linkedUser._id,
                        name: linkedUser.name,
                        voterIdNumber: linkedUser.voterIdNumber,
                        panchayatId: linkedUser.panchayatId,
                        faceImagePath: linkedUser.faceImagePath
                    } : null,
                    userType: 'OFFICIAL',
                    wardId: official.wardId
                }
            }
        });
    } catch (error) {
        console.error('Official token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired official refresh token',
            error: error.message
        });
    }
});

// Get official profile
router.get('/me', isOfficial, async (req, res) => {
    try {
        const official = await Official.findById(req.official.id)
            .select('-password -passwordResetToken -passwordResetExpires');

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // Get linked user data if exists - critical for official functionality
        let linkedUser = null;
        if (official.linkedCitizenId) {
            linkedUser = await mongoose.model('User').findById(official.linkedCitizenId)
                .select('_id name voterIdNumber panchayatId faceImagePath');
        }

        res.json({
            success: true,
            data: {
                user: {
                    ...official._doc,
                    linkedUser: linkedUser ? {
                        id: linkedUser._id,
                        name: linkedUser.name,
                        voterIdNumber: linkedUser.voterIdNumber,
                        panchayatId: linkedUser.panchayatId,
                        faceImagePath: linkedUser.faceImagePath
                    } : null,
                    userType: 'OFFICIAL'
                }
            }
        });
    } catch (error) {
        console.error('Error fetching official profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching official profile',
            error: error.message
        });
    }
});

// Forgot password for officials
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required'
            });
        }

        // Find official by email
        const official = await Official.findOne({
            email,
            role: { $ne: 'ADMIN' } // Make sure this is an official, not an admin
        });

        if (!official) {
            // For security reasons, don't reveal that the email doesn't exist
            return res.json({
                success: true,
                message: 'If your email exists in our system, you will receive a password reset link'
            });
        }

        // Generate reset token
        const resetToken = official.createPasswordResetToken();
        await official.save();

        // In a real application, you would send an email with the reset token
        // For now, just return it in the response
        res.json({
            success: true,
            message: 'Password reset token generated',
            data: {
                resetToken, // In production, you would send this by email instead
                email: official.email
            }
        });
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error processing password reset request',
            error: error.message
        });
    }
});

// Reset password route for officials
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password } = req.body;
        const { token } = req.params;

        if (!password) {
            return res.status(400).json({
                success: false,
                message: 'New password is required'
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long'
            });
        }

        // Hash the token to compare with the stored one
        const hashedToken = crypto
            .createHash('sha256')
            .update(token)
            .digest('hex');

        // Find official by reset token and check if it's expired
        const official = await Official.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
            role: { $ne: 'ADMIN' } // Make sure this is an official, not an admin
        });

        if (!official) {
            return res.status(400).json({
                success: false,
                message: 'Token is invalid or has expired'
            });
        }

        // Update password and clear reset token fields
        official.password = password;
        official.passwordResetToken = undefined;
        official.passwordResetExpires = undefined;

        await official.save();

        res.json({
            success: true,
            message: 'Password has been reset successfully'
        });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
});

// Change password route for officials
router.post('/change-password', isOfficial, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both current and new password'
            });
        }

        // Find official by id
        const official = await Official.findById(req.official.id);

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // Verify current password
        const isPasswordValid = await official.comparePassword(currentPassword);
        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect'
            });
        }

        // Update password
        official.password = newPassword;
        await official.save();

        res.json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('Password change error:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: error.message
        });
    }
});

// Link an official to a citizen account
router.post('/link-citizen', isOfficial, async (req, res) => {
    try {
        const { citizenId } = req.body;

        if (!citizenId) {
            return res.status(400).json({
                success: false,
                message: 'Citizen ID is required'
            });
        }

        // Find the official to update
        const official = await Official.findById(req.official.id);

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // Verify that the citizen exists
        const citizen = await mongoose.model('User').findById(citizenId);

        if (!citizen) {
            return res.status(404).json({
                success: false,
                message: 'Citizen not found'
            });
        }

        // Link the citizen to the official
        official.linkedCitizenId = citizenId;
        await official.save();

        // Get complete linked user data
        const linkedUser = await mongoose.model('User').findById(citizenId)
            .select('_id name voterIdNumber panchayatId faceImagePath');

        res.json({
            success: true,
            message: 'Citizen linked successfully',
            data: {
                linkedCitizenId: official.linkedCitizenId,
                linkedUser: linkedUser ? {
                    id: linkedUser._id,
                    name: linkedUser.name,
                    voterIdNumber: linkedUser.voterIdNumber,
                    panchayatId: linkedUser.panchayatId,
                    faceImagePath: linkedUser.faceImagePath
                } : null
            }
        });
    } catch (error) {
        console.error('Link citizen error:', error);
        res.status(500).json({
            success: false,
            message: 'Error linking citizen',
            error: error.message
        });
    }
});

// Unlink a citizen from an official account
router.post('/unlink-citizen', isOfficial, async (req, res) => {
    try {
        // Find the official to update
        const official = await Official.findById(req.official.id);

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // Check if there's a linked citizen
        if (!official.linkedCitizenId) {
            return res.status(400).json({
                success: false,
                message: 'No citizen linked to this official'
            });
        }

        // Remove the link
        official.linkedCitizenId = undefined;
        await official.save();

        res.json({
            success: true,
            message: 'Citizen unlinked successfully'
        });
    } catch (error) {
        console.error('Unlink citizen error:', error);
        res.status(500).json({
            success: false,
            message: 'Error unlinking citizen',
            error: error.message
        });
    }
});

module.exports = router;