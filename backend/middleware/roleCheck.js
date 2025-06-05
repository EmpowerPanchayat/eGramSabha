// File: backend/middleware/roleCheck.js - Enhanced with linked citizen and multi-user support
const { Role } = require('../models/Role');
const Panchayat = require('../models/Panchayat');
const User = require('../models/User');

/**
 * Middleware to check if user has required role
 * @param {Array|String} roles - Required role(s)
 * @returns {Function} Middleware function
 */
const hasRole = (roles = []) => {
    return (req, res, next) => {
        // Check for different auth objects (admin, official, citizen)
        const user = req.admin || req.official || req.citizen || req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Convert single role to array
        const rolesArray = Array.isArray(roles) ? roles : [roles];

        // Admin has access to everything
        if (user.role === 'ADMIN') {
            return next();
        }

        // For officials, check if user's role is in the required roles array
        if (user.userType === 'OFFICIAL' && rolesArray.length > 0 && !rolesArray.includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Insufficient permissions'
            });
        }

        // For citizens, if CITIZEN role is required, permit access
        if (user.userType === 'CITIZEN' && rolesArray.includes('CITIZEN')) {
            return next();
        }

        // If we get here with a citizen but CITIZEN role isn't in rolesArray, deny access
        if (user.userType === 'CITIZEN' && !rolesArray.includes('CITIZEN')) {
            return res.status(403).json({
                success: false,
                message: 'Access denied: Citizen cannot access this resource'
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
        // Check for different auth objects
        const user = req.admin || req.official || req.citizen || req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        try {
            // Admin has access to everything
            if (user.userType === 'ADMIN' || user.role === 'ADMIN') {
                return next();
            }

            // Citizens have limited permissions, handle separately
            if (user.userType === 'CITIZEN') {
                // Define resources that citizens can access and their allowed actions
                const citizenPermissions = {
                    'issue': { 'create': true, 'read': true, 'readOwn': true, 'update': false, 'delete': false },
                    'profile': { 'read': true, 'update': true },
                    'gramSabha': { 'read': true, 'rsvp': true }
                    // Add other citizen-accessible resources here
                };

                if (!citizenPermissions[resource] || !citizenPermissions[resource][action]) {
                    return res.status(403).json({
                        success: false,
                        message: `Access denied: Citizens don't have permission to ${action} ${resource}`
                    });
                }

                return next();
            }

            // For officials, get role permissions from database
            const roleData = await Role.findOne({ name: user.role });

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
        // Check for different auth objects
        const user = req.admin || req.official || req.citizen || req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin can access any panchayat
        if (user.role === 'ADMIN' || user.userType === 'ADMIN') {
            return next();
        }

        const panchayatId = req.params[paramName] || req.body[paramName] || req.query[paramName];

        // Check if user belongs to the panchayat
        if (!panchayatId || !user.panchayatId || user.panchayatId.toString() !== panchayatId) {
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
        // Check for different auth objects
        const user = req.admin || req.official || req.citizen || req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin can access any ward
        if (user.role === 'ADMIN' || user.userType === 'ADMIN') {
            return next();
        }

        // Presidents and Secretaries can access all wards in their panchayat
        if (['PRESIDENT', 'SECRETARY'].includes(user.role)) {
            return next();
        }

        // Skip additional checks for non-ward members
        if (user.role !== 'WARD_MEMBER') {
            return next();
        }

        const wardId = req.params[wardParamName] || req.body[wardParamName] || req.query[wardParamName];

        if (!wardId) {
            return next(); // No ward specified, let other middleware handle
        }

        try {
            // First check if the official has wardId directly in their record
            if (user.wardId && user.wardId.toString() === wardId) {
                return next();
            }

            // Otherwise check the panchayat officials assignment
            const panchayat = await Panchayat.findById(user.panchayatId);

            if (!panchayat) {
                return res.status(404).json({
                    success: false,
                    message: 'Panchayat not found'
                });
            }

            // Find the official's details in the panchayat officials array
            const officialData = panchayat.officials.find(
                o => o.officialId.toString() === user.id && o.role === 'WARD_MEMBER'
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

/**
 * Check if user is a Panchayat President
 */
const isPanchayatPresident = async (req, res, next) => {
    try {
        // Check for different auth objects
        const user = req.admin || req.official || req.citizen || req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin can do anything a president can
        if (user.role === 'ADMIN' || user.userType === 'ADMIN') {
            return next();
        }

        // Quick check based on role field
        if (user.role === 'PRESIDENT') {
            return next();
        }

        // For safety, verify in the panchayat record
        const panchayat = await Panchayat.findById(user.panchayatId);
        if (!panchayat) {
            return res.status(404).json({
                success: false,
                message: 'Panchayat not found'
            });
        }

        // Check if the user is listed as PRESIDENT in the officials array
        const isPresident = panchayat.officials.some(
            official => official.officialId.toString() === user.id.toString() &&
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

/**
 * Middleware to check if an official has access to a citizen's data
 * Either through own panchayat or through linked citizen
 */
const hasCitizenAccess = () => {
    return async (req, res, next) => {
        // Check for different auth objects
        const user = req.admin || req.official || req.citizen || req.user;

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }

        // Admin has access to all users
        if (user.role === 'ADMIN' || user.userType === 'ADMIN') {
            return next();
        }

        // A citizen has access to their own data
        if (user.userType === 'CITIZEN' && user.id.toString() === req.params.citizenId) {
            return next();
        }

        // Officials need additional checks
        if (user.userType === 'OFFICIAL') {
            const citizenId = req.params.citizenId || req.body.citizenId;

            if (!citizenId) {
                return res.status(400).json({
                    success: false,
                    message: 'Citizen ID is required'
                });
            }

            try {
                // Check if this official has this citizen linked
                if (user.linkedCitizenId && user.linkedCitizenId.toString() === citizenId) {
                    return next();
                }

                // Otherwise check if citizen belongs to official's panchayat
                const citizen = await User.findById(citizenId);

                if (!citizen) {
                    return res.status(404).json({
                        success: false,
                        message: 'Citizen not found'
                    });
                }

                if (citizen.panchayatId.toString() === user.panchayatId.toString()) {
                    return next();
                }

                return res.status(403).json({
                    success: false,
                    message: 'Access denied: You can only access citizens from your own panchayat'
                });
            } catch (error) {
                console.error('Citizen access check error:', error);
                return res.status(500).json({
                    success: false,
                    message: 'Error checking citizen access'
                });
            }
        }

        // Default deny
        return res.status(403).json({
            success: false,
            message: 'Access denied: Insufficient permissions to access citizen data'
        });
    };
};

module.exports = {
    hasRole,
    hasPermission,
    belongsToPanchayat,
    hasWardAccess,
    isPanchayatPresident,
    hasCitizenAccess
};