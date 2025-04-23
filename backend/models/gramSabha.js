const mongoose = require("mongoose");

const gramSabhaSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      maxLength: 255,
    },
    dateTime: {
      type: Date,
      required: true,
    },
    location: {
      type: String,
      required: true,
      maxLength: 255,
    },
    agenda: {
      type: String,
      required: true,
    },
    scheduledDurationHours: {
      type: Number,
      required: true,
    },
    meetingLink: {
      type: String,
      maxLength: 255,
    },
    status: {
      type: String,
      enum: [
        "SCHEDULED",
        "CANCELLED",
        "UNSCHEDULED",
        "CONCLUDED",
        "IN_PROGRESS",
        "RESCHEDULED",
      ],
      required: true,
      default: "SCHEDULED",
    },
    minutes: {
      type: String,
    },
    meetingNotes: {
      type: String,
    },
    recordingLink: {
      type: String,
      maxLength: 255,
    },
    actualDurationMinutes: {
      type: Number,
    },
    transcript: {
      type: String,
    },
    conclusion: {
      type: String,
    },
    jioMeetData: {
      type: mongoose.Schema.Types.Mixed,
      required: false,
    },
    issues: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Issue",
      },
    ],
    attendances: [
      {
        checkInTime: {
          type: Date,
          required: true,
        },
        verificationMethod: {
          type: String,
          required: true,
          maxLength: 50,
        },
        status: {
          type: String,
          enum: ["PRESENT", "ABSENT", "LATE"],
          required: true,
        },
        remarks: String,
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
          ref: "User",
        },
      },
    ],
    guests: [
      {
        name: {
          type: String,
          required: true,
          maxLength: 255,
        },
        phoneNumber: {
          type: String,
          required: true,
          maxLength: 20,
        },
        email: {
          type: String,
          maxLength: 255,
        },
        designation: {
          type: String,
          maxLength: 255,
        },
      },
    ],
    attachments: [
      {
        attachment: {
          type: String, // Base64 encoded data
        },
        filename: {
          type: String,
          maxLength: 255,
        },
        mimeType: {
          type: String,
          maxLength: 100,
        },
        uploadedAt: {
          type: Date,
          required: true,
          default: Date.now,
        },
      },
    ],
    panchayatId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "Panchayat",
    },
    scheduledById: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("GramSabha", gramSabhaSchema);
