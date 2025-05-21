// File: backend/models/User.js
const mongoose = require('mongoose');

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
  faceDescriptor: Array,
  faceImagePath: String,
  isRegistered: {
    type: Boolean,
    default: false
  },
  registrationDate: Date,
  // Reference to panchayat
  panchayatId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Panchayat',
    required: true
  }
});

// Compound index for voterIdNumber + panchayatId to ensure uniqueness within a panchayat
userSchema.index({ voterIdNumber: 1, panchayatId: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

module.exports = User;