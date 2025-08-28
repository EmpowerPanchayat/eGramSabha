// File: backend/routes/officialRoutes.js (Updated with citizen linking)
const express = require('express');
const router = express.Router();
const Official = require('../models/Official');
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');
const { isAuthenticated } = require('../middleware/auth');
const { hasRole, hasPermission, belongsToPanchayat } = require('../middleware/roleCheck');
const crypto = require('crypto');
const Issue = require('../models/Issue');

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
            wardId,
            linkedCitizenId
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

        // If linkedCitizenId is provided, validate it
        if (linkedCitizenId) {
            const citizen = await User.findById(linkedCitizenId);
            if (!citizen) {
                return res.status(404).json({
                    success: false,
                    message: 'Linked citizen not found'
                });
            }

            // Check if citizen belongs to the same panchayat
            if (panchayatId && citizen.panchayatId && 
                panchayatId.toString() !== citizen.panchayatId.toString()) {
                return res.status(400).json({
                    success: false,
                    message: 'Citizen must belong to the same panchayat as the official'
                });
            }

            // Check if citizen is already linked to another official
            const existingLink = await Official.findOne({ linkedCitizenId });
            if (existingLink) {
                return res.status(400).json({
                    success: false,
                    message: 'Citizen is already linked to another official'
                });
            }
        }
        else if (role !== 'GUEST' && role !== 'SECRETARY') {
            return res.status(400).json({
                success: false,
                message: 'Please link a citizen from the panchayat'
            });
        }

        // Generate a random password
        const generatedPassword = username;

        // Create the new official
        const newOfficial = new Official({
            username,
            email,
            password: generatedPassword, // This will be hashed by the pre-save hook
            name,
            role,
            panchayatId: role !== 'ADMIN' ? panchayatId : undefined,
            phone,
            wardId: role === 'WARD_MEMBER' ? wardId : undefined,
            linkedCitizenId: linkedCitizenId || undefined
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
                    panchayatId: newOfficial.panchayatId,
                    linkedCitizenId: newOfficial.linkedCitizenId
                },
                initialPassword: generatedPassword
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
        console.log({ official: req.user })
        // Admin can view any official, others can only view their own profile
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
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
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
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
        if (req.user.role !== 'ADMIN') {
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
        const official = await Official.findById(req.user.id);

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

// Link an official with a citizen
router.post('/:id/link-citizen', isAuthenticated, hasRole(['ADMIN']), async (req, res) => {
    try {
        const { id } = req.params;
        const { citizenId } = req.body;

        if (!citizenId) {
            return res.status(400).json({
                success: false,
                message: 'Please provide citizenId'
            });
        }

        // Check if citizen exists
        const citizen = await User.findById(citizenId);
        if (!citizen) {
            return res.status(404).json({
                success: false,
                message: 'Citizen not found'
            });
        }

        // Check if official exists
        const official = await Official.findById(id);
        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // Check if citizen belongs to the same panchayat as the official
        if (official.panchayatId && citizen.panchayatId && 
            official.panchayatId.toString() !== citizen.panchayatId.toString()) {
            return res.status(400).json({
                success: false,
                message: 'Official and citizen must belong to the same panchayat'
            });
        }

        // Check if citizen is already linked to another official
        const existingLink = await Official.findOne({ linkedCitizenId: citizenId });
        if (existingLink && existingLink._id.toString() !== id) {
            return res.status(400).json({
                success: false,
                message: 'Citizen is already linked to another official'
            });
        }

        // Update official with linked citizen
        official.linkedCitizenId = citizenId;
        await official.save();

        res.json({
            success: true,
            message: 'Official linked with citizen successfully',
            data: {
                officialId: official._id,
                citizenId: citizen._id,
                citizenName: citizen.name,
                voterIdNumber: citizen.voterIdNumber
            }
        });
    } catch (error) {
        console.error('Error linking official with citizen:', error);
        res.status(500).json({
            success: false,
            message: 'Error linking official with citizen',
            error: error.message
        });
    }
});

// Get issues for official's panchayat
router.get('/:id/issues', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;

        // Get official
        const official = await Official.findById(id);
        if (!official) {
            return res.status(404).json({
                success: false,
                message: 'Official not found'
            });
        }

        // Only admin or the official themselves can view issues
        if (req.user.role !== 'ADMIN' && req.user.id !== id) {
            return res.status(403).json({
                success: false,
                message: 'Access denied'
            });
        }

        // Get issues for the official's panchayat
        const issues = await Issue.find({ panchayatId: official.panchayatId })
            .populate('citizenId', 'name email phone')
            .populate('wardId', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: issues.length,
            data: issues
        });
    } catch (error) {
        console.error('Error fetching issues:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching issues',
            error: error.message
        });
    }
});

// Get an official's profile
router.get('/profile/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        console.log({ user: req.user })
        // Admin can view any official, others can only view their own profile
        if (req.user.role !== 'ADMIN' && req.user.id.toString() !== id) {
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

        // Get panchayat details if the official belongs to a panchayat
        let panchayat = null;
        if (official.panchayatId) {
            panchayat = await Panchayat.findById(official.panchayatId);
        }

        res.json({
            success: true,
            data: {
                _id: official._id,
                name: official.name,
                username: official.username,
                email: official.email,
                role: official.role,
                phone: official.phone,
                wardId: official.wardId,
                isActive: official.isActive,
                linkedCitizenId: official.linkedCitizenId,
                panchayat: panchayat ? {
                    _id: panchayat._id,
                    name: panchayat.name,
                    district: panchayat.district,
                    state: panchayat.state,
                    presidentId: panchayat.presidentId,
                    secretaryId: panchayat.secretaryId
                } : null
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

module.exports = router;