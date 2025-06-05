// backend/routes/adminAuthRoutes.js
const express = require('express');
const router = express.Router();
const Official = require('../models/Official');
const { isAdmin } = require('../middleware/auth');
const crypto = require('crypto');

// Admin login
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

        // Find admin by username and role
        const admin = await Official.findOne({
            username,
            role: 'ADMIN'
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }

        // Check if account is active
        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Admin account is deactivated'
            });
        }

        // Check password
        const isPasswordValid = await admin.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin credentials'
            });
        }

        // Update last login time
        admin.lastLogin = Date.now();
        await admin.save();

        // Generate tokens
        const token = await admin.generateAuthToken();
        const refreshToken = admin.generateRefreshToken();

        res.json({
            success: true,
            message: 'Admin login successful',
            data: {
                user: {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                    avatarUrl: admin.avatarUrl,
                    userType: 'ADMIN'
                },
                token,
                refreshToken
            }
        });
    } catch (error) {
        console.error('Admin login error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during admin login',
            error: error.message
        });
    }
});

// Refresh token for admin
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

        // Find admin by id
        const admin = await Official.findOne({
            _id: decoded.id,
            role: 'ADMIN'
        });

        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid admin refresh token'
            });
        }

        // Check if account is active
        if (!admin.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Admin account is deactivated'
            });
        }

        // Generate new access token
        const token = await admin.generateAuthToken();
        // Generate new refresh token too
        const newRefreshToken = admin.generateRefreshToken();

        res.json({
            success: true,
            message: 'Admin token refreshed successfully',
            data: {
                token,
                refreshToken: newRefreshToken,
                user: {
                    id: admin._id,
                    username: admin.username,
                    email: admin.email,
                    name: admin.name,
                    role: admin.role,
                    avatarUrl: admin.avatarUrl,
                    userType: 'ADMIN'
                }
            }
        });
    } catch (error) {
        console.error('Admin token refresh error:', error);
        res.status(401).json({
            success: false,
            message: 'Invalid or expired admin refresh token',
            error: error.message
        });
    }
});

// Get admin profile
router.get('/me', isAdmin, async (req, res) => {
    try {
        const admin = await Official.findById(req.admin.id)
            .select('-password -passwordResetToken -passwordResetExpires');

        if (!admin) {
            return res.status(404).json({
                success: false,
                message: 'Admin not found'
            });
        }

        res.json({
            success: true,
            data: {
                user: {
                    ...admin._doc,
                    userType: 'ADMIN'
                }
            }
        });
    } catch (error) {
        console.error('Error fetching admin profile:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching admin profile',
            error: error.message
        });
    }
});

module.exports = router;