// backend/middleware/auth.js (Enhanced with multi-user support)
const { verifyToken } = require('../config/jwt');
const Official = require('../models/Official');
const User = require('../models/User');

// Middleware to check if the user is authenticated as admin
const isAdmin = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
        }
        
        // Verify token with admin type
        const decoded = verifyToken(token, 'ADMIN');
        
        // Find official by id
        const admin = await Official.findById(decoded.id);
        if (!admin || admin.role !== 'ADMIN') {
            return res.status(401).json({ success: false, message: 'Admin access required' });
        }
        
        if (!admin.isActive) {
            return res.status(403).json({ success: false, message: 'Admin account is deactivated' });
        }
        
        // Add admin to request object
        req.admin = {
            id: admin._id,
            username: admin.username,
            role: admin.role
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired', expired: true });
        }
        console.error('Authentication error:', error);
        res.status(401).json({ success: false, message: 'Invalid admin token', error: error.message });
    }
};

// Middleware to check if the user is authenticated as official
const isOfficial = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
        }
        
        // Verify token with official type
        const decoded = verifyToken(token, 'OFFICIAL');
        
        // Find official by id
        const official = await Official.findById(decoded.id);
        if (!official || official.role === 'ADMIN') {
            return res.status(401).json({ success: false, message: 'Official access required' });
        }
        
        if (!official.isActive) {
            return res.status(403).json({ success: false, message: 'Official account is deactivated' });
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
        res.status(401).json({ success: false, message: 'Invalid official token', error: error.message });
    }
};

// Middleware to check if the user is authenticated as citizen
const isCitizen = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
        }
        
        // Verify token with citizen type
        const decoded = verifyToken(token, 'CITIZEN');
        
        // Find citizen by id
        const citizen = await User.findById(decoded.id);
        if (!citizen) {
            return res.status(401).json({ success: false, message: 'Citizen not found' });
        }
        
        if (!citizen.isRegistered) {
            return res.status(403).json({ success: false, message: 'Citizen account is not fully registered' });
        }
        
        // Add citizen to request object
        req.citizen = {
            id: citizen._id,
            name: citizen.name,
            voterIdNumber: citizen.voterIdNumber,
            panchayatId: citizen.panchayatId,
            wardId: citizen.wardId
        };
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired', expired: true });
        }
        console.error('Authentication error:', error);
        res.status(401).json({ success: false, message: 'Invalid citizen token', error: error.message });
    }
};

// Generic middleware that works for any user type (admin, official, or citizen)
const isAuthenticated = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
        }
        
        // Try to verify with each user type
        let decoded;
        let userType;
        
        try {
            decoded = verifyToken(token, 'ADMIN');
            userType = 'ADMIN';
        } catch (error1) {
            try {
                decoded = verifyToken(token, 'OFFICIAL');
                userType = 'OFFICIAL';
            } catch (error2) {
                try {
                    decoded = verifyToken(token, 'CITIZEN');
                    userType = 'CITIZEN';
                } catch (error3) {
                    throw new Error('Invalid token for any user type');
                }
            }
        }

        console.log('User type:', userType);
        console.log('Decoded token:', decoded);
        
        // Handle based on user type
        if (userType === 'ADMIN' || userType === 'OFFICIAL') {
            const official = await Official.findById(decoded.id);
            console.log('Official:', official);
            if (!official) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            
            if (!official.isActive) {
                return res.status(403).json({ success: false, message: 'Account is deactivated' });
            }
            
            req.user = {
              id: official._id,
              username: official.username,
              role: official.role,
              linkedCitizenId: official.linkedCitizenId,
              panchayatId: official.panchayatId,
              userType: userType,
            };
        } else {
            const citizen = await User.findById(decoded.id);
            if (!citizen) {
                return res.status(401).json({ success: false, message: 'User not found' });
            }
            
            if (!citizen.isRegistered) {
                return res.status(403).json({ success: false, message: 'Account is not fully registered' });
            }
            
            req.user = {
                id: citizen._id,
                name: citizen.name,
                voterIdNumber: citizen.voterIdNumber,
                panchayatId: citizen.panchayatId,
                userType: 'CITIZEN'
            };
        }
        
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired', expired: true });
        }
        console.error('Authentication error:', error);
        res.status(401).json({ success: false, message: 'Invalid token', error: error.message });
    }
};

// Middleware that allows any authenticated user type to access the route
const anyAuthenticated = async (req, res, next) => {
    try {
        // Get token from header
        console.log('Checking any authenticated user...');
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ success: false, message: 'No authentication token, access denied' });
        }

        // Try to verify with each user type
        let decoded;
        let userType;
        let userData;

        try {
            // Try admin token
            decoded = verifyToken(token, 'ADMIN');
            userType = 'ADMIN';

            // Find admin by id
            const admin = await Official.findById(decoded.id);
            if (!admin || !admin.isActive) {
                throw new Error('Admin not found or inactive');
            }

            userData = {
                id: admin._id,
                username: admin.username,
                role: admin.role,
                panchayatId: admin.panchayatId
            };

        } catch (adminError) {
            try {
                // Try official token
                decoded = verifyToken(token, 'OFFICIAL');
                userType = 'OFFICIAL';

                // Find official by id
                const official = await Official.findById(decoded.id);
                if (!official || !official.isActive) {
                    throw new Error('Official not found or inactive');
                }

                userData = {
                  id: official._id,
                  username: official.username,
                  linkedCitizenId: official.linkedCitizenId,
                  role: official.role,
                  panchayatId: official.panchayatId,
                };

            } catch (officialError) {
                try {
                    // Try citizen token
                    decoded = verifyToken(token, 'CITIZEN');
                    userType = 'CITIZEN';

                    // Find citizen by id
                    const citizen = await User.findById(decoded.id);
                    if (!citizen || !citizen.isRegistered) {
                        throw new Error('Citizen not found or not registered');
                    }

                    userData = {
                        id: citizen._id,
                        name: citizen.name,
                        voterIdNumber: citizen.voterIdNumber,
                        panchayatId: citizen.panchayatId,
                        wardId: citizen.wardId
                    };

                } catch (citizenError) {
                    // All verification methods failed
                    throw new Error('Invalid authentication token');
                }
            }
        }

        // Add user data to request with user type for permission checking
        req.user = {
            ...userData,
            userType: userType
        };

        // Also set specific user objects for backward compatibility
        if (userType === 'ADMIN') {
            req.admin = userData;
        } else if (userType === 'OFFICIAL') {
            req.official = userData;
        } else if (userType === 'CITIZEN') {
            req.citizen = userData;
        }
        console.log('Authenticated user:', req.user);
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ success: false, message: 'Token has expired', expired: true });
        }
        console.error('Authentication error:', error);
        res.status(401).json({ success: false, message: 'Invalid authentication token', error: error.message });
    }
};

module.exports = {
    isAdmin,
    isOfficial,
    isCitizen,
    isAuthenticated,
    anyAuthenticated
};