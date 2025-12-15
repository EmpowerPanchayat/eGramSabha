// File: backend/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const Official = require('../models/Official');
const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../config/jwt');
const { isAuthenticated } = require('../middleware/auth');
const crypto = require('crypto');
const mongoose = require('mongoose');

// Register a new admin (special route for initial setup)
router.post('/register-admin', async (req, res) => {
    try {
        // Check if admin already exists
        const adminExists = await Official.findOne({ role: 'ADMIN' });

        if (adminExists) {
            return res.status(403).json({
                success: false,
                message: 'Admin already exists. Use the login route.'
            });
        }

        const { username, email, password, name, phone } = req.body;

        // Validate input
        if (!username || !email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: username, email, password, name'
            });
        }

        // Create new admin
        const admin = new Official({
            username,
            email,
            password,
            name,
            phone,
            role: 'ADMIN'
        });

        await admin.save();

        // Generate tokens
        const token = admin.generateAuthToken();
        const refreshToken = admin.generateRefreshToken();

        res.status(201).json({
            success: true,
            message: 'Admin account created successfully',
            data: {
                user: {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        // Handle duplicate key errors
        if (error.code === 11000) {
            const field = Object.keys(error.keyValue)[0];
            return res.status(400).json({
                success: false,
                message: `${field} already exists. Please choose another one.`
            });
        }

        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating admin account',
            error: error.message
        });
    }
});

// Login route
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

        // Find official by username
        const official = await Official.findOne({ username });

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
                message: 'Account is deactivated. Please contact administrator.'
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

        // Get linked user data if exists
        let linkedUser = null;
        if (official.linkedCitizenId) {
            linkedUser = await mongoose.model('User').findById(official.linkedCitizenId)
                .select('_id name voterIdNumber panchayatId faceImageId thumbnailImageId');
        }

        res.json({
            success: true,
            message: 'Login successful',
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
                        faceImageId: linkedUser.faceImageId,
                        thumbnailImageId: linkedUser.thumbnailImageId,
                    } : null
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during login',
            error: error.message
        });
    }
});

// Refresh token route
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

        // Find official by id
        const official = await Official.findById(decoded.id);

        if (!official) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token'
            });
        }

        // Check if account is active
        if (!official.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Account is deactivated'
            });
        }

        // Generate new access token
        const token = await official.generateAuthToken();
        // Generate new refresh token too (added)
        const newRefreshToken = official.generateRefreshToken();

        // Get linked user data if exists
        let linkedUser = null;
        if (official.linkedCitizenId) {
            linkedUser = await mongoose.model('User').findById(official.linkedCitizenId)
                .select('_id name voterIdNumber panchayatId faceImageId thumbnailImageId');
        }

        res.json({
            success: true,
            message: 'Token refreshed successfully',
            data: {
                token,
                refreshToken: newRefreshToken, // Added this to include refresh token in response
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
                        faceImageId: linkedUser.faceImageId,
                        thumbnailImageId: linkedUser.thumbnailImageId,
                    } : null
                }
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
            error: error.message
        });
    }
});

// Forgot password route
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
        const official = await Official.findOne({ email });

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

// Reset password route
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
            passwordResetExpires: { $gt: Date.now() }
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

// Change password route
router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Please provide both current and new password'
            });
        }

        // Find official by id (from isAuthenticated middleware which sets req.user)
        const official = await Official.findById(req.user.id);

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

// Get current user info
router.get('/me', isAuthenticated, async (req, res) => {
    try {
        const official = await Official.findById(req.official.id).select('-password -passwordResetToken -passwordResetExpires');

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: official
            }
        });
    } catch (error) {
        console.error('Error fetching user info:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching user information',
            error: error.message
        });
    }
});

// Logout - client side implementation
// The server doesn't need to do anything for logout in JWT auth
// The client will simply remove the tokens from storage

module.exports = router;