// File: backend/config/jwt.js
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate secure random keys if not provided in environment variables
// const generateSecureKey = () => crypto.randomBytes(32).toString('hex');

// JWT Secret keys - should be stored in environment variables in production
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';

// Token expiration times
const JWT_EXPIRES_IN = '24h'; // Access token expires in 24 hours
const JWT_REFRESH_EXPIRES_IN = '7d'; // Refresh token expires in 7 days

// Generate JWT token
const generateToken = (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

// Generate refresh token
const generateRefreshToken = (payload) => {
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES_IN });
};

// Verify JWT token
const verifyToken = (token) => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        throw error;
    }
};

// Verify refresh token
const verifyRefreshToken = (token) => {
    try {
        return jwt.verify(token, JWT_REFRESH_SECRET);
    } catch (error) {
        throw error;
    }
};

module.exports = {
    JWT_SECRET,
    JWT_REFRESH_SECRET,
    JWT_EXPIRES_IN,
    JWT_REFRESH_EXPIRES_IN,
    generateToken,
    generateRefreshToken,
    verifyToken,
    verifyRefreshToken
};