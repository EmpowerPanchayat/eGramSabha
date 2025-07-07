const mongoose = require('mongoose');
const MODEL_REFS = require('./modelRefs');

const summaryRequestSchema = new mongoose.Schema({
    requestId: {
        type: String,
        required: true,
        unique: true
    },
    status_url: {
        type: String,
        required: true,
    },
    result_url: {
        type: String,
        required: true,
    },
    panchayatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.PANCHAYAT,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
        default: 'PROCESSING'
    },
    requestType: {
        type: String,
        enum: ['CREATE', 'UPDATE'],
        required: true
    },
    retryCount: {
        type: Number,
        default: 0
    },
    lastError: {
        type: String
    }
}, { timestamps: true });

const SummaryRequest = mongoose.model('SummaryRequest', summaryRequestSchema);

module.exports = SummaryRequest; 