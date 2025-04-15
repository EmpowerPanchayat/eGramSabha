// File: backend/middleware/auth.js
const { verifyToken } = require('../config/jwt');
const Official = require('../models/Official');

// Middleware to check if the user is authenticated
const isAuthenticated = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');

        if (!token) {
            return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
        }

        // Verify token
        const decoded = verifyToken(token);

        // Find official by id
        const official = await Official.findById(decoded.id);

        if (!official) {
            return res.status(401).json({ success: false, message: 'Token is invalid or user does not exist' });
        }

        if (!official.isActive) {
            return res.status(403).json({ success: false, message: 'User account is deactivated' });
        }

        // Add official to request object
        req.official = {
            id: official._id,
            username: official.username,
            role: official.role,
            panchayatId: official.panchayatId
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired', expired: true });
        }

        console.error('Authentication error:', error);
        res.status(401).json({ success: false, message: 'Invalid token', error: error.message });
    }
};

// Export the middleware
module.exports = { isAuthenticated };