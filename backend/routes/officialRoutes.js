// File: backend/routes/officialRoutes.js
const express = require('express');
const router = express.Router();
const Official = require('../models/Official');
const Panchayat = require('../models/Panchayat');
const { isAuthenticated } = require('../middleware/auth');
const { hasRole, hasPermission, belongsToPanchayat } = require('../middleware/roleCheck');
const crypto = require('crypto');

// Get all officials (admin only)
router.get('/', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
    try {
        const { panchayatId } = req.query;

        let query = {};

        // Filter by panchayat if provided
        if (panchayatId) {
            query.panchayatId = panchayatId;
        }

        const officials = await Official.find(query)
            .select('-password -passwordResetToken -passwordResetExpires');

        res.json({
            success: true,
            count: officials.length,
            data: officials
        });
    } catch (error) {
        console.error('Error fetching officials:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching officials',
            error: error.message
        });
    }
});

// Create a new official (admin only)
router.post('/', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
    try {
        const {
            username,
            email,
            name,
            role,
            panchayatId,
            phone,
            wardId
        } = req.body;

        // Validate input
        if (!username || !email || !name || !role) {
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: username, email, name, role'
            });
        }

        // Check if role is valid
        const validRoles = ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: `Invalid role. Must be one of: ${validRoles.join(', ')}`
            });
        }

        // Check if panchayat exists for non-admin roles
        if (role !== 'ADMIN') {
            if (!panchayatId) {
                return res.status(400).json({
                    success: false,
                    message: 'PanchayatId is required for non-admin roles'
                });
            }

            const panchayat = await Panchayat.findById(panchayatId);
            if (!panchayat) {
                return res.status(404).json({
                    success: false,
                    message: 'Panchayat not found'
                });
            }
        }

        // For WARD_MEMBER role, wardId is required
        if (role === 'WARD_MEMBER' && !wardId) {
            return res.status(400).json({
                success: false,
                message: 'wardId is required for WARD_MEMBER role'
            });
        }

        // Check if username already exists
        const existingUsername = await Official.findOne({ username });
        if (existingUsername) {
            return res.status(400).json({
                success: false,
                message: 'Username is already taken'
            });
        }

        // Check if email already exists
        const existingEmail = await Official.findOne({ email });
        if (existingEmail) {
            return res.status(400).json({
                success: false,
                message: 'Email is already in use'
            });
        }

        // Generate a random password
        // const generatedPassword = crypto.randomBytes(8).toString('hex');
        const generatedPassword = username;

        // Create the new official
        const newOfficial = new Official({
            username,
            email,
            password: generatedPassword, // This will be hashed by the pre-save hook
            name,
            role,
            panchayatId: role !== 'ADMIN' ? panchayatId : undefined,
            phone
        });

        await newOfficial.save();

        // Update panchayat officials array for non-admin roles
        if (role !== 'ADMIN' && panchayatId) {
            await Panchayat.findByIdAndUpdate(
                panchayatId,
                {
                    $push: {
                        officials: {
                            officialId: newOfficial._id,
                            role,
                            wardId: role === 'WARD_MEMBER' ? wardId : undefined
                        }
                    }
                }
            );
        }

        // In a real application, you would send the password to the user by email
        // For now, just return it in the response

        res.status(201).json({
            success: true,
            message: 'Official created successfully',
            data: {
                official: {
                    id: newOfficial._id,
                    username: newOfficial.username,
                    email: newOfficial.email,
                    name: newOfficial.name,
                    role: newOfficial.role,
                    panchayatId: newOfficial.panchayatId
                },
                initialPassword: generatedPassword // In production, you would send this by email instead
            }
        });
    } catch (error) {
        console.error('Error creating official:', error);
        res.status(500).json({
            success: false,
            message: 'Error creating official',
            error: error.message
        });
    }
});

// Get an official by ID
router.get('/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        // Admin can view any official, others can only view their own profile
        if (req.official.role !== 'ADMIN' && req.official.id !== id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: You can only view your own profile'
            });
        }

        const official = await Official.findById(id)
            .select('-password -passwordResetToken -passwordResetExpires');

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        res.json({
            success: true,
            data: official
        });
    } catch (error) {
        console.error('Error fetching official:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching official',
            error: error.message
        });
    }
});

// Update an official
router.put('/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        // Only admin can update other officials
        if (req.official.role !== 'ADMIN' && req.official.id !== id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: You can only update your own profile'
            });
        }

        // Find the official
        const official = await Official.findById(id);

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // If not admin, restrict which fields can be updated
        if (req.official.role !== 'ADMIN') {
            // Regular users can only update their name, phone, and email
            const allowedUpdates = ['name', 'phone', 'email'];
            Object.keys(updates).forEach(key => {
                if (!allowedUpdates.includes(key)) {
                    delete updates[key];
                }
            });
        } else {
            // Even admin can't update username or role directly
            delete updates.username;
            delete updates.password;
        }

        // Check for email uniqueness if email is being updated
        if (updates.email && updates.email !== official.email) {
            const existingEmail = await Official.findOne({ email: updates.email });
            if (existingEmail) {
                return res.status(400).json({
                    success: false,
                    message: 'Email is already in use'
                });
            }
        }

        // Update the official
        const updatedOfficial = await Official.findByIdAndUpdate(
            id,
            { ...updates, updatedAt: Date.now() },
            { new: true }
        ).select('-password -passwordResetToken -passwordResetExpires');

        res.json({
            success: true,
            message: 'Official updated successfully',
            data: updatedOfficial
        });
    } catch (error) {
        console.error('Error updating official:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating official',
            error: error.message
        });
    }
});

// Change password
router.post('/change-password', isAuthenticated, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Both current password and new password are required'
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters long'
            });
        }

        // Find the official
        const official = await Official.findById(req.official.id);

        // Check current password
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
        console.error('Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Error changing password',
            error: error.message
        });
    }
});

// Admin: Reset user password
router.post('/:id/reset-password', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;

        // Find the official
        const official = await Official.findById(id);

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // Generate a new random password
        const newPassword = crypto.randomBytes(8).toString('hex');

        // Update password
        official.password = newPassword;
        await official.save();

        // In a real application, you would send the new password to the user by email

        res.json({
            success: true,
            message: 'Password reset successfully',
            data: {
                newPassword // In production, you would send this by email instead
            }
        });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({
            success: false,
            message: 'Error resetting password',
            error: error.message
        });
    }
});

// Admin: Deactivate/Activate an official
router.patch('/:id/toggle-status', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;

        // Find the official
        const official = await Official.findById(id);

        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // Prevent deactivating the last admin
        if (official.role === 'ADMIN' && official.isActive) {
            const adminCount = await Official.countDocuments({
                role: 'ADMIN',
                isActive: true
            });

            if (adminCount <= 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot deactivate the last admin account'
                });
            }
        }

        // Toggle active status
        official.isActive = !official.isActive;
        await official.save();

        res.json({
            success: true,
            message: `Official ${official.isActive ? 'activated' : 'deactivated'} successfully`,
            data: {
                id: official._id,
                username: official.username,
                isActive: official.isActive
            }
        });
    } catch (error) {
        console.error('Error toggling official status:', error);
        res.status(500).json({
            success: false,
            message: 'Error toggling official status',
            error: error.message
        });
    }
});

module.exports = router;