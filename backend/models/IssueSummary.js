const mongoose = require('mongoose');
const MODEL_REFS = require('./modelRefs');

const agendaItemSchema = new mongoose.Schema({
    title: {
        type: Map,
        of: String,
        required: true
    },
    description: {
        type: Map,
        of: String,
        required: true
    },
    linkedIssues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.ISSUE,
    }]
});

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