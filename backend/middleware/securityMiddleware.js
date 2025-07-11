// File: backend/middleware/securityMiddleware.js
const rateLimit = require('express-rate-limit');
const { v4: uuidv4 } = require('uuid');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const cors = require('cors');

/**
 * Configure security middleware for the Express app
 * @param {Object} app - Express application
 */
const configureSecurityMiddleware = (app) => {
    // Set security HTTP headers
    app.use(helmet());

    // Enable CORS with appropriate options
    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
        credentials: true,
        optionsSuccessStatus: 204
    }));

    // Request ID middleware for tracking requests
    app.use((req, res, next) => {
        req.id = uuidv4();
        res.setHeader('X-Request-ID', req.id);
        next();
    });

    // Prevent XSS attacks
    app.use(xss());

    // Prevent HTTP Parameter Pollution
    app.use(hpp());

    // Rate limiting for API routes
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100, // limit each IP to 100 requests per windowMs
        message: 'Too many requests from this IP, please try again later',
        standardHeaders: true, // Return rate limit info in the RateLimit-* headers
        legacyHeaders: false // Disable the X-RateLimit-* headers
    });

    // Apply to all auth routes
    app.use('/api/auth', authLimiter);

    // More strict rate limit for login attempts
    const loginLimiter = rateLimit({
        windowMs: 60 * 60 * 1000, // 1 hour window
        max: 10, // start blocking after 10 requests
        message: 'Too many login attempts from this IP, please try again after an hour',
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Apply to login and citizen face login endpoints specifically
    app.use('/api/auth/login', loginLimiter);
    app.use('/api/citizens/face-login', loginLimiter);

    // Request logging for debugging
    if (process.env.NODE_ENV === 'development') {
        app.use((req, res, next) => {
            console.log(`[${req.id}] ${req.method} ${req.originalUrl}`);
            next();
        });
    }

    // Error handler for unhandled routes
    app.use((req, res, next) => {
        res.status(404).json({
            success: false,
            message: `Route not found: ${req.originalUrl}`
        });
    });

    // Global error handler
    app.use((err, req, res, next) => {
        console.error(`[${req.id}] Error:`, err);

        // Return different error response based on environment
        if (process.env.NODE_ENV === 'production') {
            // Don't expose error details in production
            res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Internal server error'
            });
        } else {
            // Include stack trace in development
            res.status(err.statusCode || 500).json({
                success: false,
                message: err.message || 'Internal server error',
                stack: err.stack
            });
        }
    });
};

module.exports = configureSecurityMiddleware;