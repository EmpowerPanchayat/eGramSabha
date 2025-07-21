const mongoose = require('mongoose');
const MODEL_REFS = require('./modelRefs');
const agendaItemSchema = require('./agendaItemSchema');

const issueSummarySchema = new mongoose.Schema({
    panchayatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.PANCHAYAT,
        required: true,
        unique: true
    },
    agendaItems: [agendaItemSchema],
    issues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.ISSUE,
    }]
}, { timestamps: true });

const IssueSummary = mongoose.model('IssueSummary', issueSummarySchema);

module.exports = IssueSummary; 