const mongoose = require('mongoose');

const panchayatSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        maxlength: 255
    },
    state: {
        type: String,
        required: true,
        maxlength: 100
    },
    district: {
        type: String,
        required: true,
        maxlength: 100
    },
    villages: {
        type: String
    },
    block: {
        type: String,
        maxlength: 100
    },
    geolocation: {
        type: String
    },
    population: {
        type: Number
    },
    language: {
        type: String,
        maxlength: 100
    },
    sabhaCriteria: {
        type: Number
    },
    officialWhatsappNumber: {
        type: String,
        maxlength: 10
    },
    officials: [{
        officialId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Official'
        },
        role: {
            type: String,
            enum: ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST']
        },
        wardId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Ward',
            // Only required for WARD_MEMBER role
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const Panchayat = mongoose.model('Panchayat', panchayatSchema);

module.exports = Panchayat;