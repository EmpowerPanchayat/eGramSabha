const mongoose = require('mongoose');

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
        ref: 'Issue'
    }]
});

const issueSummarySchema = new mongoose.Schema({
    panchayatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Panchayat',
        required: true,
        unique: true
    },
    agendaItems: [agendaItemSchema],
    issues: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Issue'
    }]
}, { timestamps: true });

const IssueSummary = mongoose.model('IssueSummary', issueSummarySchema);

module.exports = IssueSummary; 