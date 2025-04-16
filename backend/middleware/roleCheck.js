// File: backend/middleware/roleCheck.js - Enhanced with detailed permissions
const { Role } = require('../models/Role');
const Panchayat = require('../models/Panchayat');

/**
 * Middleware to check if user has required role
 * @param {Array|String} roles - Required role(s)
 * @returns {Function} Middleware function
 */
const hasRole = (roles = []) => {
    return (req, res, next) => {
        if (!req.official) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Convert single role to array
        const rolesArray = Array.isArray(roles) ? roles : [roles];

        // Admin has access to everything
        if (req.official.role === 'ADMIN') {
            return next();
        }

        // Check if user's role is in the required roles array
        if (rolesArray.length > 0 && !rolesArray.includes(req.official.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Insufficient permissions'
            });
        }

        next();
    };
};

/**
 * Middleware to check if user has required permission for a resource
 * @param {String} resource - Resource name (e.g., 'panchayat', 'user')
 * @param {String} action - Action (e.g., 'create', 'read', 'update', 'delete')
 * @returns {Function} Middleware function
 */
const hasPermission = (resource, action) => {
    return async (req, res, next) => {
        if (!req.official) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        try {
            // Admin has access to everything
            if (req.official.role === 'ADMIN') {
                return next();
            }

            // Get role permissions from database
            const roleData = await Role.findOne({ name: req.official.role });

            if (!roleData) {
                return res.status(403).json({
                    success: false,
                    message: 'Role not found'
                });
            }

            // Find the permission for the requested resource
            const permission = roleData.permissions.find(p => p.resource === resource);

            if (!permission || !permission.actions[action]) {
                return res.status(403).json({
                    success: false,
                    message: `Access denied: You don't have permission to ${action} ${resource}`
                });
            }

            next();
        } catch (error) {
            console.error('Permission check error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking permissions'
            });
        }
    };
};

/**
 * Middleware to ensure official belongs to specific panchayat
 * @param {String} paramName - Name of the parameter containing panchayatId
 * @returns {Function} Middleware function
 */
const belongsToPanchayat = (paramName = 'panchayatId') => {
    return (req, res, next) => {
        if (!req.official) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin can access any panchayat
        if (req.official.role === 'ADMIN') {
            return next();
        }

        const panchayatId = req.params[paramName] || req.body[paramName] || req.query[paramName];

        // Check if official belongs to the panchayat
        if (!panchayatId || !req.official.panchayatId || req.official.panchayatId.toString() !== panchayatId) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: You can only access resources from your own panchayat'
            });
        }

        next();
    };
};

/**
 * Middleware to ensure ward member has access to specific ward
 * @param {String} wardParamName - Name of the parameter containing wardId
 * @returns {Function} Middleware function
 */
const hasWardAccess = (wardParamName = 'wardId') => {
    return async (req, res, next) => {
        if (!req.official) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Skip check for non-ward members or admin
        if (req.official.role !== 'WARD_MEMBER' || req.official.role === 'ADMIN') {
            return next();
        }

        const wardId = req.params[wardParamName] || req.body[wardParamName] || req.query[wardParamName];

        if (!wardId) {
            return next(); // No ward specified, let other middleware handle
        }

        try {
            // Find the panchayat and check if official is assigned to this ward
            const panchayat = await Panchayat.findById(req.official.panchayatId);

            if (!panchayat) {
                return res.status(404).json({
                    success: false,
                    message: 'Panchayat not found'
                });
            }

            // Find the official's details in the panchayat officials array
            const officialData = panchayat.officials.find(
                o => o.officialId.toString() === req.official.id && o.role === 'WARD_MEMBER'
            );

            if (!officialData || !officialData.wardId || officialData.wardId.toString() !== wardId) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only access your assigned ward'
                });
            }

            next();
        } catch (error) {
            console.error('Ward access check error:', error);
            res.status(500).json({
                success: false,
                message: 'Error checking ward access'
            });
        }
    };
};

const isPanchayatPresident = async (req, res, next) => {
    try {
        if (!req.official) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        console.log({ official: req.official });
        console.log({ panchayatId: req.official.panchayatId });
        console.log({ officialId: req.official.id });

        const panchayat = await Panchayat.findById(req.official.panchayatId);
        if (!panchayat) {
            return res.status(404).json({
                success: false,
                message: 'Panchayat not found'
            });
        }

        // Check if the user is listed as PRESIDENT in the officials array
        const isPresident = panchayat.officials.some(
            official => official.officialId.toString() === req.official.id.toString() && 
                       official.role === 'PRESIDENT'
        );

        if (!isPresident) {
            return res.status(403).json({
                success: false,
                message: 'Only Panchayat President can perform this action'
            });
        }

        next();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking Panchayat President status',
            error: error.message
        });
    }
};

module.exports = {
    hasRole,
    hasPermission,
    belongsToPanchayat,
    hasWardAccess,
    isPanchayatPresident
};