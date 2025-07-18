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
    }],
    //createdByType : USER or LLM System
    createdByType: {
        type: String,
        enum: ['USER', 'SYSTEM'],
        required: true
    },
    //createdByUserId only if createdByType is "USER"
    createdByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.USER,
        required: function() { return this.createdByType === 'USER'; }
    },
});

module.exports = agendaItemSchema;