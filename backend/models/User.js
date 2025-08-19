// backend/models/User.js
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { generateToken, generateRefreshToken } = require('../config/jwt');
const MODEL_REFS = require('./modelRefs');

const userSchema = new mongoose.Schema({
  name: String,
  gender: String,
  fatherName: String,
  husbandName: String,
  motherName: String,
  address: String,
  mobileNumber: String,
  voterIdNumber: {
    type: String,
    required: true
  },
  caste: {
    name: { type: String, default: '' },
    category: {
      type: String,
      enum: ['General', 'Scheduled Caste', 'Scheduled Tribe', 'Other Backward Classes', ''],
      default: ''
    }
  },
  faceDescriptor: {
    type: [Number],
    default: []
  },
  faceImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fs.files', // or your GridFS collection name
  },
  thumbnailImageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'fs.files',
  },
  isRegistered: {
    type: Boolean,
    default: false
  },
  registrationDate: Date,
  // Reference to panchayat
  panchayatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: MODEL_REFS.PANCHAYAT,
    required: true
  },
  // New fields for authentication
  lastLogin: {
    type: Date
  },
  wardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: MODEL_REFS.WARD,
  },
  // Security token for passwordless sessions
  securityToken: String,
  securityTokenExpires: Date
});

// Compound index for voterIdNumber + panchayatId to ensure uniqueness within a panchayat
userSchema.index({ voterIdNumber: 1, panchayatId: 1 }, { unique: true });

// Method to generate JWT token for citizen
userSchema.methods.generateAuthToken = function () {
  const payload = {
    id: this._id,
    name: this.name,
    voterIdNumber: this.voterIdNumber,
    panchayatId: this.panchayatId,
    wardId: this.wardId,
    userType: 'CITIZEN'
  };

  return generateToken(payload, 'CITIZEN');
};

// Method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
  return generateRefreshToken({ id: this._id, userType: 'CITIZEN' });
};

// Method to create security token for face login initiation
userSchema.methods.createSecurityToken = function () {
  const token = crypto.randomBytes(20).toString('hex');

  this.securityToken = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  // Token expires in 10 minutes
  this.securityTokenExpires = Date.now() + 600000;

  return token;
};

const User = mongoose.model('User', userSchema);
module.exports = User;