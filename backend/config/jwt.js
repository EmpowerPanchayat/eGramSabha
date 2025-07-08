// File: backend/config/jwt.js (Updated with multi-user token support)
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// JWT Secret keys for different user types
const JWT_ADMIN_SECRET = process.env.JWT_ADMIN_SECRET || 'admin-secret-key';
const JWT_OFFICIAL_SECRET = process.env.JWT_OFFICIAL_SECRET || 'official-secret-key';
const JWT_CITIZEN_SECRET = process.env.JWT_CITIZEN_SECRET || 'citizen-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'refresh-secret-key';

// Token expiration times
const JWT_ADMIN_EXPIRES_IN = '12h';    // Admin tokens expire faster for security
const JWT_OFFICIAL_EXPIRES_IN = '24h';  // Officials have standard expiration
const JWT_CITIZEN_EXPIRES_IN = '72h';   // Citizen tokens last longer for convenience
const JWT_REFRESH_EXPIRES_IN = '7d';    // Refresh tokens last 7 days

// Generate token based on user type
const generateToken = (payload, userType) => {
    let secret;
    let expiresIn;

    switch (userType) {
        case 'ADMIN':
            secret = JWT_ADMIN_SECRET;
            expiresIn = JWT_ADMIN_EXPIRES_IN;
            break;
        case 'OFFICIAL':
            secret = JWT_OFFICIAL_SECRET;
            expiresIn = JWT_OFFICIAL_EXPIRES_IN;
            break;
        case 'CITIZEN':
            secret = JWT_CITIZEN_SECRET;
            expiresIn = JWT_CITIZEN_EXPIRES_IN;
            break;
        default:
            // Default to official settings if type not recognized
            secret = JWT_OFFICIAL_SECRET;
            expiresIn = JWT_OFFICIAL_EXPIRES_IN;
    }

    return jwt.sign(payload, secret, { expiresIn });
};

// Verify token based on user type
const verifyToken = (token, userType) => {
    let secret;
    switch (userType) {
        case 'ADMIN':
            secret = JWT_ADMIN_SECRET;
            break;
        case 'OFFICIAL':
            secret = JWT_OFFICIAL_SECRET;
            break;
        case 'CITIZEN':
            secret = JWT_CITIZEN_SECRET;
            break;
        default:
            // Try to verify with all secrets if type not specified
            try {
                return jwt.verify(token, JWT_ADMIN_SECRET);
            } catch (adminError) {
                try {
                    return jwt.verify(token, JWT_OFFICIAL_SECRET);
                } catch (officialError) {
                    try {
                        return jwt.verify(token, JWT_CITIZEN_SECRET);
                    } catch (citizenError) {
                        throw new Error('Invalid token for any user type');
                    }
                }
            }
    }

    try {
        return jwt.verify(token, secret);
    } catch (error) {
        throw error;
    }
};

// Generate refresh token (common for all users)
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

// Verify refresh token
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        throw error;
    }
};

// Legacy functions for backward compatibility
const JWT_SECRET = process.env.JWT_SECRET || JWT_OFFICIAL_SECRET;
const JWT_EXPIRES_IN = '24h';

const generateLegacyToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const verifyLegacyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    // New multi-user token functions
    generateToken,
    verifyToken,
    generateRefreshToken,
    verifyRefreshToken,

    // Legacy token functions for backward compatibility
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN,
    generateLegacyToken,
    verifyLegacyToken
};