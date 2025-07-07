// File: backend/models/Ward.js
const mongoose = require('mongoose');
const MODEL_REFS = require('./modelRefs');

const wardSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    geolocation: {
        type: String
    },
    population: {
        type: Number
    },
    panchayatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.PANCHAYAT,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update 'updatedAt' date on save
wardSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Ward = mongoose.model('Ward', wardSchema);

module.exports = Ward;