// File: backend/models/Issue.js
const mongoose = require('mongoose');
const MODEL_REFS = require('./modelRefs');

const attachmentSchema = new mongoose.Schema({
    attachment: {
        type: String,
        required: true
    },
    filename: {
        type: String,
        maxlength: 255
    },
    mimeType: {
        type: String,
        maxlength: 100
    },
    uploadedAt: {
        type: Date,
        default: Date.now
    }
});

const issueSchema = new mongoose.Schema({
    text: {
        type: String,
        // required: true,
        required: false
    },
    category: {
        type: String,
        enum: [
            'CULTURE_AND_NATURE',
            'INFRASTRUCTURE',
            'EARNING_OPPORTUNITIES',
            'BASIC_AMENITIES',
            'SOCIAL_WELFARE_SCHEMES',
            'OTHER'
        ],
        required: true
    },
    subcategory: {
        type: String,
        enum: [
            // Culture and Nature
            'FESTIVALS',
            'TREES_AND_FORESTS',
            'SOIL',
            'NATURAL_WATER_RESOURCES',
            'RELIGIOUS_PLACES',
            // Infrastructure
            'LAND',
            'WATER',
            'ENERGY',
            'TRANSPORTATION',
            'COMMUNICATION',
            // Earning Opportunities
            'AGRICULTURE',
            'ANIMAL_HUSBANDRY',
            'FISHERIES',
            'SMALL_SCALE_INDUSTRIES',
            'MINOR_FOREST_PRODUCE',
            'KHADI_AND_VILLAGE_INDUSTRIES',
            // Basic Amenities
            'HEALTH',
            'EDUCATION',
            'HOUSING_AND_SANITATION',
            'SPORTS_AND_ENTERTAINMENT',
            'FOOD',
            // Social Welfare Schemes
            'WEAKER_SECTIONS',
            'HANDICAPPED_WELFARE',
            'FAMILY_WELFARE',
            'WOMEN_AND_CHILD_DEVELOPMENT',
            'POVERTY_ALLEVIATION',
            // Other
            'OTHER'
        ],
        required: true
    },
    priority: {
        type: String,
        enum: ['URGENT', 'NORMAL'],
        default: 'NORMAL'
    },
    createdForId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.USER,
        required: true
    },
    status: {
        type: String,
        enum: ['REPORTED', 'PICKED_IN_AGENDA', 'DISCUSSED_IN_GRAM_SABHA', 'TRANSFERRED', 'RESOLVED', 'NO_ACTION_NEEDED'],
        default: 'REPORTED'
    },
    toBeResolvedBefore: {
        type: Date
    },
    remark: {
        type: String
    },
    attachments: {
        type: [attachmentSchema],
        default: []
    },
    panchayatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.PANCHAYAT,
        required: true
    },
    gramSabhaId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.GRAM_SABHA,
    },
    creatorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.USER,
        required: true
    },
    transcription: {
        requestId: {
            type: String,
            default: null
        },
        status: {
            type: String,
            enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'],
            default: null
        },
        text: {
            type: String,
            default: null
        },
        originalTranscription: {
            type: String,
            default: null
        },
        enhancedEnglishTranscription: {
            type: String,
            default: null
        },
        enhancedHindiTranscription: {
            type: String,
            default: null
        },
        description: {
            type: Object,
            default: {}
        },
        language: {
            type: String,
            default: 'Hindi'
        },
        processingMode: {
            type: String,
            default: null
        },
        transcriptionProvider: {
            type: String,
            default: null
        },
        providerInfo: {
            type: Object,
            default: null
        },
        llmEnhancementStatus: {
            type: Object,
            default: null
        },
        requestedAt: {
            type: Date,
            default: null
        },
        completedAt: {
            type: Date,
            default: null
        },
        retryCount: {
            type: Number,
            default: 0
        },
        lastError: {
            type: String,
            default: null
        }
    },
    isSummarized: {
        type: Boolean,
        default: false
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
issueSchema.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const Issue = mongoose.model('Issue', issueSchema);

module.exports = Issue;