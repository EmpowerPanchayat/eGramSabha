// File: backend/models/Official.js (Enhanced with linked citizen support)
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateToken, generateRefreshToken } = require('../config/jwt');
const MODEL_REFS = require('./modelRefs');

const officialSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 4,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
    },
    password: {
        type: String,
        required: true,
        minlength: 8
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        required: true,
        enum: ['ADMIN', 'SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST'],
        default: 'GUEST'
    },
    panchayatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.PANCHAYAT,
        // Not required for ADMIN role
    },
    phone: {
        type: String,
        match: [/^\d{10}$/, 'Please provide a valid 10-digit phone number']
    },
    avatarUrl: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true
    },
    lastLogin: {
        type: Date
    },
    linkedCitizenId: {
        // This links the official to an existing citizen user
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.USER,
        required: function () {
            // Required if role is not ADMIN, GUEST or SECRETARY
            return this.role !== 'ADMIN' && this.role !== 'GUEST' && this.role !== 'SECRETARY';
        }
    },
    wardId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.WARD,
        // Only relevant for WARD_MEMBER role
    },
    passwordResetToken: String,
    passwordResetExpires: Date,
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Pre-save hook to hash password before saving
officialSchema.pre('save', async function (next) {
    // Only hash the password if it has been modified (or is new)
    if (!this.isModified('password')) return next();

    try {
        // Generate a salt
        const salt = await bcrypt.genSalt(10);
        // Hash the password along with the new salt
        this.password = await bcrypt.hash(this.password, salt);
        // Update the updatedAt timestamp
        this.updatedAt = Date.now();
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
officialSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
officialSchema.methods.generateAuthToken = async function () {
    let linkedUser = null;

    // If there's a linked citizen, fetch their data
    if (this.linkedCitizenId) {
        try {
            linkedUser = await mongoose.model('User').findById(this.linkedCitizenId)
                .select('_id name voterIdNumber panchayatId');

            // If linked user exists, format the data
            if (linkedUser) {
                linkedUser = {
                    id: linkedUser._id,
                    name: linkedUser.name,
                    voterIdNumber: linkedUser.voterIdNumber,
                    panchayatId: linkedUser.panchayatId
                };
            }
        } catch (error) {
            console.error('Error fetching linked user:', error);
            // Continue without linked user data
        }
    }

    const payload = {
        id: this._id,
        username: this.username,
        role: this.role,
        panchayatId: this.panchayatId,
        linkedCitizenId: this.linkedCitizenId,
        linkedUser: linkedUser,
        userType: this.role === 'ADMIN' ? 'ADMIN' : 'OFFICIAL',
        wardId: this.wardId
    };

    return generateToken(payload, this.role === 'ADMIN' ? 'ADMIN' : 'OFFICIAL');
};

// Method to generate refresh token
officialSchema.methods.generateRefreshToken = function () {
    return generateRefreshToken({
        id: this._id,
        userType: this.role === 'ADMIN' ? 'ADMIN' : 'OFFICIAL'
    });
};

// Create password reset token
officialSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
        .createHash('sha256')
        .update(resetToken)
        .digest('hex');

    // Token expires in 1 hour
    this.passwordResetExpires = Date.now() + 3600000;

    return resetToken;
};

const Official = mongoose.model('Official', officialSchema);

module.exports = Official;