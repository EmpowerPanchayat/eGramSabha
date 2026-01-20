// File: backend/models/SupportTicket.js
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

const supportTicketSchema = new mongoose.Schema({
    ticketNumber: {
        type: String,
        unique: true,
        required: true,
        index: true
    },
    category: {
        type: String,
        enum: [
            // Technical categories
            'LOGIN_ISSUE',
            'FACE_RECOGNITION',
            'AUDIO_RECORDING',
            'FILE_UPLOAD',
            'APP_CRASH',
            'PERFORMANCE',
            'OTHER_TECHNICAL',
            // General categories
            'GRAM_SABHA_QUERY',
            'ISSUE_TRACKING',
            'ACCOUNT_HELP',
            'FEEDBACK',
            'SUGGESTION',
            'OTHER_GENERAL'
        ],
        required: true
    },
    description: {
        type: String,
        maxlength: 5000
    },
    contactInfo: {
        type: {
            type: String,
            enum: ['PHONE', 'EMAIL']
        },
        value: {
            type: String,
            maxlength: 255
        }
    },
    screenshot: {
        type: attachmentSchema,
        default: null
    },
    voiceNote: {
        type: attachmentSchema,
        default: null
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
    status: {
        type: String,
        enum: ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'],
        default: 'OPEN'
    },
    submittedBy: {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            refPath: 'submittedBy.userModel'
        },
        userModel: {
            type: String,
            enum: [MODEL_REFS.USER, MODEL_REFS.OFFICIAL]
        },
        userType: {
            type: String,
            enum: ['CITIZEN', 'OFFICIAL', 'ADMIN', 'ANONYMOUS']
        },
        userName: {
            type: String,
            maxlength: 255
        }
    },
    panchayatId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: MODEL_REFS.PANCHAYAT
    },
    sourcePortal: {
        type: String,
        enum: ['CITIZEN', 'OFFICIAL', 'ADMIN'],
        required: true
    },
    resolutionNotes: {
        type: String,
        maxlength: 2000
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

// Indexes for efficient querying
supportTicketSchema.index({ status: 1 });
supportTicketSchema.index({ category: 1 });
supportTicketSchema.index({ panchayatId: 1 });
supportTicketSchema.index({ sourcePortal: 1 });
supportTicketSchema.index({ createdAt: -1 });
supportTicketSchema.index({ 'submittedBy.userId': 1 });

// Pre-save middleware to update timestamps
supportTicketSchema.pre('save', function(next) {
    this.updatedAt = new Date();
    next();
});

// Pre-update middleware to update timestamps
supportTicketSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
    this.set({ updatedAt: new Date() });
    next();
});

// Static method to generate unique ticket number
supportTicketSchema.statics.generateTicketNumber = async function() {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2);
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const prefix = `ST${year}${month}`;

    // Find the last ticket number with this prefix
    const lastTicket = await this.findOne({
        ticketNumber: new RegExp(`^${prefix}`)
    }).sort({ ticketNumber: -1 });

    let sequence = 1;
    if (lastTicket) {
        const lastSequence = parseInt(lastTicket.ticketNumber.slice(-6), 10);
        sequence = lastSequence + 1;
    }

    return `${prefix}${sequence.toString().padStart(6, '0')}`;
};

const SupportTicket = mongoose.model(MODEL_REFS.SUPPORT_TICKET, supportTicketSchema);

module.exports = SupportTicket;
