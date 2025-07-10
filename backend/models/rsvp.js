const mongoose = require('mongoose');
const MODEL_REFS = require('./modelRefs');

const rsvpSchema = new mongoose.Schema({
    gramSabhaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.GRAM_SABHA,
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.USER,
        required: true
    },
    status: {
        type: String,
        enum: ['CONFIRMED', 'DECLINED', 'MAYBE'],
        required: true
    },
    comments: {
        type: String,
        maxLength: 500
    }
}, {
    timestamps: true
});

// Compound index to ensure a user can only RSVP once per meeting
rsvpSchema.index({ gramSabhaId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('RSVP', rsvpSchema); 