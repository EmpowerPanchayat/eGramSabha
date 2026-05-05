const express = require("express");
const router = express.Router();
const axios = require("axios");
const GramSabha = require("../models/gramSabha");
const RSVP = require("../models/rsvp");
const auth = require("../middleware/auth");
const { isPanchayatPresident } = require("../middleware/roleCheck");
const Panchayat = require("../models/Panchayat");
const IssueSummary = require("../models/IssueSummary");
const Issue = require("../models/Issue");
const multer = require("multer");
const mongoose = require("mongoose");
const User = require("../models/User");
const {
  getMeetingProvider,
  resolveMeetingPlatform,
} = require("../services/meetingProviders");

const { BACKEND_URL } = process.env;

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

async function getScheduledMeetingFromProvider({
  title,
  startTime,
  endTime,
  currentMeeting = null,
}) {
  const platform = resolveMeetingPlatform();
  const provider = getMeetingProvider(platform);
  if (!provider?.isConfigured?.()) {
    return {
      meetingPlatform: platform,
      meetingLink: null,
      meetingId: null,
      meetingProviderData: null,
      jioMeetData: platform === "jio" ? null : currentMeeting?.jioMeetData || null,
    };
  }

  const updatePayload = {
    title,
    startTime,
    endTime,
    externalMeetingId: currentMeeting?.meetingId || currentMeeting?.meetingProviderData?.eventId,
    metadata: {
      googleCalendarId: currentMeeting?.meetingProviderData?.calendarId,
    },
  };

  const providerResult = currentMeeting
    ? await provider.updateMeeting(updatePayload)
    : await provider.createMeeting(updatePayload);

  return {
    meetingPlatform: providerResult.platform || platform,
    meetingLink: providerResult.meetingLink || null,
    meetingId: providerResult.meetingId || null,
    meetingProviderData: providerResult.providerData || null,
    jioMeetData:
      (providerResult.platform || platform) === "jio"
        ? providerResult.providerData || null
        : currentMeeting?.jioMeetData || null,
  };
}

// Helper function for face comparison
function calculateFaceDistance(descriptor1, descriptor2) {
  if (
    !descriptor1 ||
    !descriptor2 ||
    descriptor1.length !== descriptor2.length
  ) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < descriptor1.length; i++) {
    sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
  }
  return Math.sqrt(sum);
}

// Helper function to update issue summary and linked issues
async function updateIssueSummaryForSelectedAgenda(
  panchayatId,
  selectedAgendaItems,
  currentMeetingAgenda = []
) {
  try {
    let parsedSelectedItems = selectedAgendaItems || [];
    let parsedCurrentAgenda = currentMeetingAgenda || [];

    if (typeof selectedAgendaItems === "string") {
      parsedSelectedItems = JSON.parse(selectedAgendaItems);
    }

    if (typeof currentMeetingAgenda === "string") {
      parsedCurrentAgenda = JSON.parse(currentMeetingAgenda);
    }

    // Get the current issue summary
    const issueSummary = await IssueSummary.findOne({ panchayatId });
    if (!issueSummary) {
      return;
    }

    // Step 1: Add back unselected items from the current meeting agenda to the summary
    const selectedIds = parsedSelectedItems
      .map((item) => (item._id ? item._id.toString() : null))
      .filter(Boolean);
    const itemsToAddBack = parsedCurrentAgenda.filter(
      (item) => !selectedIds.includes(item._id?.toString())
    );

    // Step 2: Remove newly selected items from the summary
    const itemsToRemove = parsedSelectedItems.filter((item) => {
      const itemId = item._id?.toString();
      return (
        itemId &&
        !parsedCurrentAgenda.some(
          (current) => current._id?.toString() === itemId
        )
      );
    });

    const itemsToRemoveIds = itemsToRemove
      .map((item) => item._id?.toString())
      .filter(Boolean);

    // Step 3: Update the issue summary
    const updatedAgendaItems = [
      ...issueSummary.agendaItems.filter(
        (item) => !itemsToRemoveIds.includes(item._id?.toString())
      ),
      ...itemsToAddBack,
    ].map((item) => ({
      ...item,
      createdByType: item.createdByType || "SYSTEM",
      ...(item.createdByType === "USER"
        ? { createdByUserId: item.createdByUserId }
        : {}),
    }));

    // Step 4: Update linked issues
    const linkedIssuesToRemove = itemsToRemove.flatMap((item) =>
      (item.linkedIssues || []).map((id) => id.toString())
    );
    const linkedIssuesToAddBack = itemsToAddBack.flatMap((item) =>
      (item.linkedIssues || []).map((id) => id.toString())
    );

    const existingIssueIds = issueSummary.issues.map((id) => id.toString());
    const updatedIssueIds = [
      ...existingIssueIds.filter((id) => !linkedIssuesToRemove.includes(id)),
      ...linkedIssuesToAddBack.filter((id) => !existingIssueIds.includes(id)),
    ];

    // Update the issue summary
    const updateResult = await IssueSummary.findOneAndUpdate(
      { panchayatId },
      {
        $set: {
          agendaItems: updatedAgendaItems,
          issues: updatedIssueIds.map((id) => new mongoose.Types.ObjectId(id)),
        },
      },
      { new: true }
    );

    if (updateResult) {
      // Update status of linked issues
      if (linkedIssuesToRemove.length > 0) {
        await Issue.updateMany(
          { _id: { $in: linkedIssuesToRemove } },
          { $set: { status: "PICKED_IN_AGENDA" } }
        );
      }

      if (linkedIssuesToAddBack.length > 0) {
        await Issue.updateMany(
          { _id: { $in: linkedIssuesToAddBack } },
          { $set: { status: "REPORTED" } }
        );
      }
    }
  } catch (error) {
    throw error;
  }
}

// Create a new Gram Sabha meeting with attachments
router.post(
  "/",
  auth.isOfficial,
  isPanchayatPresident,
  upload.array("attachments"),
  async (req, res) => {
    try {
      const {
        panchayatId,
        title,
        dateTime,
        date,
        time,
        location,
        agenda,
        description,
        scheduledDurationHours,
        selectedAgendaItems,
      } = req.body;

      // Validate that either agenda or selectedAgendaItems is provided
      let parsedAgenda = agenda || [];
      let parsedSelectedItems = [];

      if (selectedAgendaItems) {
        try {
          parsedSelectedItems =
            typeof selectedAgendaItems === "string"
              ? JSON.parse(selectedAgendaItems)
              : selectedAgendaItems;
        } catch (err) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid selectedAgendaItems format. Must be a JSON array.",
          });
        }
      }

      // If no agenda is provided but selectedAgendaItems is, create agenda from selected items
      if ((!agenda || agenda.length === 0) && parsedSelectedItems.length > 0) {
        parsedAgenda = parsedSelectedItems.map((item) => ({
          title: item.title,
          description: item.description,
          linkedIssues: item.linkedIssues || [],
          createdByType: item.createdByType || "SYSTEM",
          createdByUserId:
            item.createdByType === "USER" ? item.createdByUserId : null,
        }));
      }

      // Validate that we have some agenda content
      if (
        (!parsedAgenda || parsedAgenda.length === 0) &&
        parsedSelectedItems.length === 0
      ) {
        return res.status(400).json({
          success: false,
          message: "Either agenda or selectedAgendaItems must be provided.",
        });
      }

      try {
        if (typeof parsedAgenda === "string") {
          parsedAgenda = JSON.parse(parsedAgenda);
          if (!Array.isArray(parsedAgenda)) {
            return res.status(400).json({
              success: false,
              message: "Agenda must be an array.",
            });
          }
        }
      } catch (err) {
        return res.status(400).json({
          success: false,
          message: "Invalid agenda format. Must be a JSON array.",
        });
      }

      // Ensure agenda is an array of objects with title, description, linkedIssues
      parsedAgenda = parsedAgenda.map((item) => ({
        title: item.title,
        description: item.description,
        linkedIssues: item.linkedIssues || [],
        createdByType: item.createdByType || "SYSTEM",
        createdByUserId:
          item.createdByType === "USER" ? item.createdByUserId : null,
      }));

      // Generate default title if not provided
      let generatedTitle = title;
      if (!title) {
        const panchayat = await Panchayat.findById(panchayatId);
        if (!panchayat) {
          return res
            .status(404)
            .json({ success: false, message: "Panchayat not found" });
        }

        const formattedDate = new Date(date).toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        const formattedTime = new Date(`2000-01-01T${time}`).toLocaleTimeString(
          "en-IN",
          {
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
          }
        );

        generatedTitle = `Gram Sabha - ${panchayat.name} - ${formattedDate} - ${formattedTime}`;
      }

      // Process attachments if any
      const attachments = req.files
        ? req.files.map((file) => ({
            filename: file.originalname,
            mimeType: file.mimetype,
            attachment: file.buffer.toString("base64"), // Store as base64 string in MongoDB
            uploadedAt: new Date(),
          }))
        : [];

      // Calculate end time based on dateTime and duration
      const startTime = new Date(dateTime);
      const endTime = new Date(startTime);
      endTime.setMinutes(
        endTime.getMinutes() + parseInt(scheduledDurationHours * 60)
      );

      const meetingProvision = await getScheduledMeetingFromProvider({
        title: generatedTitle,
        startTime,
        endTime,
      });

      const gramSabha = new GramSabha({
        panchayatId,
        title: generatedTitle,
        dateTime,
        location,
        agenda: parsedAgenda,
        description,
        scheduledById: req.official.id,
        scheduledDurationHours,
        jioMeetData: meetingProvision.jioMeetData,
        meetingPlatform: meetingProvision.meetingPlatform,
        meetingProviderData: meetingProvision.meetingProviderData,
        meetingLink: meetingProvision.meetingLink,
        meetingId: meetingProvision.meetingId,
        attachments,
      });

      await gramSabha.save();

      // Update issue summary and linked issues if selected agenda items are provided
      if (parsedSelectedItems.length > 0) {
        await updateIssueSummaryForSelectedAgenda(
          panchayatId,
          parsedSelectedItems,
          []
        );
      }

      res.status(201).json({
        success: true,
        data: {
          ...gramSabha.toObject(),
          attachments: gramSabha.attachments.map((att) => ({
            ...att,
            attachment: `data:${att.mimeType};base64,${att.attachment}`, // Convert to data URL for frontend
          })),
        },
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Error creating Gram Sabha",
        error: error.message,
      });
    }
  }
);

// Get all Gram Sabha meetings for a panchayat
router.get("/panchayat/:panchayatId", async (req, res) => {
  try {
    let gramSabhas = await GramSabha.find({
      panchayatId: req.params.panchayatId,
    })
      .populate("scheduledById", "name")
      .sort({ dateTime: -1 });

    res.send(gramSabhas);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Get a specific Gram Sabha meeting
router.get("/:id", async (req, res) => {
  try {
    const gramSabha = await GramSabha.findById(req.params.id)
      .populate("scheduledById", "name")
      .populate("panchayatId", "name")
      .lean(); // Convert to plain JS object

    if (!gramSabha) {
      return res.status(404).send();
    }

    // Manual population of linkedIssues
    for (const agendaItem of gramSabha.agenda || []) {
      if (
        Array.isArray(agendaItem.linkedIssues) &&
        agendaItem.linkedIssues.length > 0
      ) {
        const issues = await Issue.find({
          _id: { $in: agendaItem.linkedIssues },
        })
          .select("transcription creatorId createdForId")
          .populate("createdForId", "name")
          .lean();
        agendaItem.linkedIssues = issues;
      }
    }

    res.send(gramSabha);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Update a Gram Sabha meeting
router.patch(
  "/:id",
  auth.isOfficial,
  isPanchayatPresident,
  upload.array("attachments"),
  async (req, res) => {
    try {
      // Find the existing gram sabha first to verify it exists
      const gramSabha = await GramSabha.findOne({
        _id: req.params.id,
        scheduledById: req.official.id,
      });

      if (!gramSabha) {
        return res.status(404).send({
          error:
            "Gram Sabha not found or you do not have permission to update it",
        });
      }

      // Handle selectedAgendaItems if provided
      let parsedSelectedItems = [];
      let originalAgenda = []; // Capture original agenda before any updates

      if (req.body.selectedAgendaItems) {
        try {
          parsedSelectedItems =
            typeof req.body.selectedAgendaItems === "string"
              ? JSON.parse(req.body.selectedAgendaItems)
              : req.body.selectedAgendaItems;

          // Capture the original agenda before updating
          originalAgenda = gramSabha.agenda || [];

          // Update the meeting's agenda with the selected items
          if (parsedSelectedItems.length > 0) {
            gramSabha.agenda = parsedSelectedItems.map((item) => ({
              title: item.title,
              description: item.description,
              linkedIssues: item.linkedIssues || [],
              createdByType: item.createdByType || "SYSTEM",
              createdByUserId:
                item.createdByType === "USER" ? item.createdByUserId : null,
              _id: item._id, // Preserve the _id for proper matching
            }));
          } else {
            // If no items selected, clear the agenda
            gramSabha.agenda = [];
          }
        } catch (err) {
          return res.status(400).send({
            error: "Invalid selectedAgendaItems format. Must be a JSON array.",
          });
        }
      }

      // Parse agenda string if needed
      if (req.body.agenda && typeof req.body.agenda === "string") {
        try {
          req.body.agenda = JSON.parse(req.body.agenda);
          if (!Array.isArray(req.body.agenda)) {
            return res.status(400).send({
              error: "Agenda must be an array.",
            });
          }
        } catch (e) {
          return res.status(400).send({
            error: "Invalid JSON in agenda field.",
          });
        }
      }

      // Get the updates from the request body
      const updates = Object.keys(req.body);

      const allowedUpdates = [
        "title",
        "agenda",
        "dateTime",
        "date",
        "time",
        "location",
        "scheduledDurationHours",
        "meetingLink",
        "meetingId",
        "meetingPlatform",
        "meetingProviderData",
        "status",
        "minutes",
        "meetingNotes",
        "recordingLink",
        "jioMeetData",
        "panchayatId",
        "actualDurationMinutes",
        "transcript",
        "conclusion",
        "issues",
        "guests",
      ];

      // Only keep allowed updates
      const validUpdates = updates.filter((update) =>
        allowedUpdates.includes(update)
      );

      // Apply only the provided updates
      validUpdates.forEach((update) => {
        if (req.body[update] !== undefined) {
          gramSabha[update] = req.body[update];
        }
      });

      // Handle file attachments if any
      if (req.files && req.files.length > 0) {
        const newAttachments = req.files.map((file) => ({
          filename: file.originalname,
          mimeType: file.mimetype,
          attachment: file.buffer.toString("base64"),
          uploadedAt: new Date(),
        }));

        // Add new attachments to existing ones
        if (!gramSabha.attachments) {
          gramSabha.attachments = [];
        }

        gramSabha.attachments = [...gramSabha.attachments, ...newAttachments];
      }

      // Handle meeting provider updates if meeting schedule details changed
      if (
        updates.includes("title") ||
        updates.includes("dateTime") ||
        updates.includes("date") ||
        updates.includes("time") ||
        updates.includes("scheduledDurationHours")
      ) {
        try {
          const startTime = new Date(req.body.dateTime || gramSabha.dateTime);
          const endTime = new Date(startTime);
          const duration =
            req.body.scheduledDurationHours || gramSabha.scheduledDurationHours;
          endTime.setMinutes(endTime.getMinutes() + parseInt(duration * 60));
          const meetingProvision = await getScheduledMeetingFromProvider({
            title: req.body.title || gramSabha.title,
            startTime,
            endTime,
            currentMeeting: gramSabha,
          });

          gramSabha.jioMeetData = meetingProvision.jioMeetData;
          gramSabha.meetingPlatform = meetingProvision.meetingPlatform;
          gramSabha.meetingProviderData = meetingProvision.meetingProviderData;
          gramSabha.meetingLink = meetingProvision.meetingLink;
          gramSabha.meetingId = meetingProvision.meetingId;
        } catch (error) {
          // Continue without failing meeting update if provider call fails
        }
      }

      // Save the updated gram sabha
      await gramSabha.save();

      // Update issue summary and linked issues if selected agenda items are provided
      if (parsedSelectedItems.length > 0 || req.body.selectedAgendaItems) {
        await updateIssueSummaryForSelectedAgenda(
          gramSabha.panchayatId,
          parsedSelectedItems,
          originalAgenda
        );
      }

      // Return the updated gram sabha with attachment data URLs for frontend
      const responseData = {
        ...gramSabha.toObject(),
        attachments: gramSabha.attachments?.map((att) => ({
          ...att,
          attachment: att.attachment
            ? `data:${att.mimeType};base64,${att.attachment}`
            : null,
        })),
      };

      res.send(responseData);
    } catch (error) {
      res
        .status(400)
        .send({ error: error.message || "Error updating Gram Sabha" });
    }
  }
);

// Delete a Gram Sabha meeting
router.delete(
  "/:id",
  auth.isOfficial,
  isPanchayatPresident,
  async (req, res) => {
    try {
      const gramSabha = await GramSabha.findOneAndDelete({
        _id: req.params.id,
        scheduledById: req.official.id,
      });

      if (!gramSabha) {
        return res.status(404).send();
      }
      res.send(gramSabha);
    } catch (error) {
      res.status(500).send(error);
    }
  }
);

// Add attendance to a Gram Sabha meeting
router.post("/:id/attendance", auth.isOfficial, async (req, res) => {
  try {
    const gramSabha = await GramSabha.findById(req.params.id);
    if (!gramSabha) {
      return res.status(404).send();
    }

    gramSabha.attendances.push({
      ...req.body,
      userId: req.official._id,
    });
    await gramSabha.save();
    res.status(201).send(gramSabha);
  } catch (error) {
    res.status(400).send(error);
  }
});

// Get specific details of users and panchayats of past Gram Sabha meeting
router.get("/:id/attendance", auth.isAuthenticated, async (req, res) => {
  try {
    const gramSabha = await GramSabha.findById(req.params.id)
      .select("attendances panchayatId guests") // include only these
      .populate("attendances.userId", "name gender caste")
      .populate("panchayatId", "name block district state");
    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: "Gram Sabha meeting not found",
      });
    }
    res.send(gramSabha);
  } catch (error) {
    res.status(500).send(error);
  }
});

// Add attachment to a Gram Sabha meeting
router.post(
  "/:id/attachments",
  auth.isOfficial,
  upload.single("file"),
  async (req, res) => {
    try {
      const gramSabha = await GramSabha.findById(req.params.id);
      if (!gramSabha) {
        return res
          .status(404)
          .json({ success: false, message: "Gram Sabha not found" });
      }

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      // Create new attachment object
      const attachment = {
        filename: req.file.originalname,
        mimeType: req.file.mimetype,
        attachment: req.file.buffer.toString("base64"),
        uploadedAt: new Date(),
      };

      // Add to attachments array
      gramSabha.attachments.push(attachment);
      await gramSabha.save();

      // Return the attachment with data URL for immediate display
      const dataUrl = `data:${attachment.mimeType};base64,${attachment.attachment}`;

      res.status(201).json({
        success: true,
        data: {
          _id: gramSabha.attachments[gramSabha.attachments.length - 1]._id,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          uploadedAt: attachment.uploadedAt,
          attachment: dataUrl,
        },
      });
    } catch (error) {
      res
        .status(400)
        .json({ success: false, message: "Failed to add attachment" });
    }
  }
);

// Get upcoming meetings for a panchayat
router.get("/panchayat/:panchayatId/upcoming", async (req, res) => {
  try {
    const now = new Date().toISOString(); // Get current time in ISO format (UTC/GMT)
    const gramSabhas = await GramSabha.find({
      panchayatId: req.params.panchayatId,
      dateTime: { $gt: now },
      status: { $in: ["SCHEDULED", "RESCHEDULED"] },
    })
      .populate("scheduledById", "name")
      .sort({ dateTime: 1 })
      .limit(5);

    // Get RSVP counts for each meeting
    const meetingsWithRSVP = await Promise.all(
      gramSabhas.map(async (meeting) => {
        const rsvpCounts = await RSVP.aggregate([
          { $match: { gramSabhaId: meeting._id } },
          {
            $group: {
              _id: "$status",
              count: { $sum: 1 },
            },
          },
        ]);

        const counts = {
          CONFIRMED: 0,
          DECLINED: 0,
          MAYBE: 0,
        };
        rsvpCounts.forEach((count) => {
          counts[count._id] = count.count;
        });

        return {
          ...meeting.toObject(),
          rsvpCounts: counts,
        };
      })
    );

    res.json(meetingsWithRSVP);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch upcoming meetings" });
  }
});

// Get past meetings for a panchayat
router.get("/panchayat/:panchayatId/past", async (req, res) => {
  try {
    const now = new Date();
    const gramSabhas = await GramSabha.find({
      panchayatId: req.params.panchayatId,
      dateTime: { $lt: now },
    })
      .populate("scheduledById", "name")
      .sort({ dateTime: -1 })
      .limit(10);

    res.json(gramSabhas);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch past meetings" });
  }
});

// RSVP for a meeting
router.post("/:id/rsvp/:usedId", async (req, res) => {
  try {
    const { status, comments } = req.body;
    const gramSabhaId = req.params.id;
    const userId = req.params.usedId;

    // Validate meeting exists and is upcoming
    const meeting = await GramSabha.findById(gramSabhaId);
    if (!meeting) {
      return res
        .status(404)
        .json({ success: false, message: "Meeting not found" });
    }

    if (new Date(meeting.dateTime) < new Date()) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot RSVP for past meetings" });
    }

    // Create or update RSVP
    const rsvp = await RSVP.findOneAndUpdate(
      { gramSabhaId, userId },
      { status, comments },
      { upsert: true, new: true }
    );

    res.json({ success: true, data: rsvp });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to handle RSVP" });
  }
});

// Get RSVP status for a user
router.get("/:id/rsvp/:usedId", async (req, res) => {
  try {
    const rsvp = await RSVP.findOne({
      gramSabhaId: req.params.id,
      userId: req.params.usedId,
    });

    res.json({ success: true, data: rsvp });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch RSVP status" });
  }
});

// Get RSVP statistics for a meeting
router.get("/:id/rsvp-stats", async (req, res) => {
  try {
    const rsvpCounts = await RSVP.aggregate([
      { $match: { gramSabhaId: new mongoose.Types.ObjectId(req.params.id) } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const counts = {
      CONFIRMED: 0,
      DECLINED: 0,
      MAYBE: 0,
    };
    rsvpCounts.forEach((count) => {
      counts[count._id] = count.count;
    });

    // Get total registered users in the panchayat
    const gramSabha = await GramSabha.findById(req.params.id);
    const totalUsers = await User.countDocuments({
      panchayatId: gramSabha.panchayatId,
    });
    const noResponse =
      totalUsers - (counts.CONFIRMED + counts.DECLINED + counts.MAYBE);

    res.json({
      success: true,
      data: {
        ...counts,
        NO_RESPONSE: noResponse,
        TOTAL: totalUsers,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch RSVP statistics" });
  }
});

/**
 * @route   POST /api/gram-sabha/:id/mark-attendance
 * @desc    Mark attendance for a meeting using face recognition
 * @access  Private (Officials only)
 */
router.post("/:id/mark-attendance", auth.isOfficial, async (req, res) => {
  try {
    const { id } = req.params;
    const { faceDescriptor, voterIdLastFour, panchayatId, verificationMethod } =
      req.body;

    // Validation
    if (
      !faceDescriptor ||
      !Array.isArray(faceDescriptor) ||
      faceDescriptor.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Valid face descriptor is required for verification",
      });
    }

    if (!voterIdLastFour || voterIdLastFour.length !== 4) {
      return res.status(400).json({
        success: false,
        message: "Last 4 digits of voter ID are required",
      });
    }

    // Verify gram sabha exists and belongs to panchayat
    const gramSabha = await GramSabha.findOne({ _id: id, panchayatId });
    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: "Gram Sabha meeting not found",
      });
    }

    // Search for users with matching voter ID last 4 digits and registered faces
    const registeredUsers = await User.find({
      panchayatId,
      isRegistered: true,
      faceDescriptor: { $exists: true, $ne: null },
      voterIdNumber: { $regex: voterIdLastFour + "$", $options: "i" }, // Match ending with last 4 digits
    });

    if (registeredUsers.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No registered users found with matching voter ID",
      });
    }

    // Find the best match among filtered users using the face-login algorithm
    let bestMatch = null;
    let minDistance = 0.5; // Threshold for face similarity

    for (const user of registeredUsers) {
      const distance = calculateFaceDistance(
        user.faceDescriptor,
        faceDescriptor
      );

      if (distance < minDistance) {
        minDistance = distance;
        bestMatch = user;
      }
    }

    if (!bestMatch) {
      return res.status(401).json({
        success: false,
        message:
          "Face not recognized. Please try again or contact administrator.",
      });
    }

    // Check if the user is already marked as present
    const existingAttendance = gramSabha.attendances.find(
      (attendance) => attendance.userId.toString() === bestMatch._id.toString()
    );

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: "Attendance already marked for this user",
      });
    }

    // Add attendance record
    const newAttendance = {
      userId: bestMatch._id,
      checkInTime: new Date(),
      verificationMethod,
      status: "PRESENT",
    };

    gramSabha.attendances.push(newAttendance);
    await gramSabha.save();

    // Get panchayat to check quorum criteria and total registered users
    const panchayat = await Panchayat.findById(gramSabha.panchayatId);

    // If the meeting status is SCHEDULED and quorum is met, update status to IN_PROGRESS
    if (gramSabha.status === "SCHEDULED") {
      // Get total voters in the panchayat
      const totalVoters = await User.countDocuments({
        panchayatId,
      });
      // Calculate quorum as 10% of total voters
      const quorumRequired = Math.ceil(
        totalVoters * (panchayat.sabhaCriteria / 100 || 0.1)
      );

      // Calculate if quorum is met
      const attendanceCount = gramSabha.attendances.length;

      if (attendanceCount >= quorumRequired) {
        gramSabha.status = "IN_PROGRESS";
        await gramSabha.save();
      }
    }

    return res.status(200).json({
      success: true,
      message: "Attendance marked successfully",
      data: {
        user: {
          _id: bestMatch._id,
          name: bestMatch.name,
          voterIdNumber: bestMatch.voterIdNumber,
        },
        attendance: newAttendance,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while marking attendance: " + error.message,
    });
  }
});

/**
 * @route   GET /api/gram-sabha/:id/attendance-stats
 * @desc    Get attendance statistics for a meeting
 * @access  Private
 */
router.get("/:id/attendance-stats", async (req, res) => {
  try {
    const { id } = req.params;

    // Get gram sabha meeting
    const gramSabha = await GramSabha.findById(id);
    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: "Gram Sabha meeting not found",
      });
    }

    // Get panchayat to check quorum criteria and total registered users
    const panchayat = await Panchayat.findById(gramSabha.panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: "Panchayat not found",
      });
    }

    // Get total registered users in the panchayat
    const totalRegistered = await User.countDocuments({
      panchayatId: gramSabha.panchayatId,
      isRegistered: true,
    });

    // Get total voters in the panchayat (all users whether registered or not)
    const totalVoters = await User.countDocuments({
      panchayatId: gramSabha.panchayatId,
    });

    // Count present users
    const presentCount = gramSabha.attendances.length;

    // Calculate quorum as 10% of total voters
    const quorumRequired = Math.ceil(
      totalVoters * (panchayat.sabhaCriteria / 100 || 0.1)
    );

    return res.status(200).json({
      success: true,
      totalRegistered,
      totalVoters,
      present: presentCount,
      quorumRequired,
      quorumMet: presentCount >= quorumRequired,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message:
        "Server error while fetching attendance statistics: " + error.message,
    });
  }
});

// Get today's meetings for a panchayat
router.get("/panchayat/:panchayatId/active", async (req, res) => {
  try {
    const panchayatId = req.params.panchayatId;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    let gramSabhas = await GramSabha.find({
      panchayatId,
      $or: [
        // Today's meetings
        { dateTime: { $gte: today, $lt: tomorrow } },
        // Past meetings that are still in progress
        { dateTime: { $lt: today }, status: "IN_PROGRESS" }
      ]
    })
      .select("-attachments")
      .populate("scheduledById", "name")
      .sort({ dateTime: 1 })
      .lean();
    
    // Get panchayat to check quorum criteria and total registered users
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: "Panchayat not found",
      });
    }

    // Get total registered users in the panchayat
    const totalRegistered = await User.countDocuments({
      panchayatId,
      isRegistered: true,
    });

    // Get total voters in the panchayat (all users whether registered or not)
    const totalVoters = await User.countDocuments({
      panchayatId,
    });

    // Calculate quorum as 10% of total voters
    const quorumRequired = Math.ceil(
      totalVoters * (panchayat.sabhaCriteria / 100 || 0.1)
    );
    const updatedGramSabhas = gramSabhas.map((gramSabha) => {
    const presentCount = gramSabha.attendances.length;

    const gs = {
      ...gramSabha,
      attendanceStats: {
        success: true,
        totalRegistered,
        totalVoters,
        present: presentCount,
        quorumRequired,
        quorumMet: presentCount >= quorumRequired,
      },
    };
    delete gs.attendances;
    return gs;
  });

    res.json(updatedGramSabhas);
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch today's meetings" });
  }
});

router.post("/recording/start", async (req, res) => {
  const { jiomeetId, roomPIN, gramSabhaId } = req.body;

  try {
    const gramSabha = gramSabhaId
      ? await GramSabha.findById(gramSabhaId)
      : await GramSabha.findOne({
          "jioMeetData.jiomeetId": jiomeetId,
          "jioMeetData.roomPIN": roomPIN,
        });

    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: "Gram Sabha not found",
      });
    }

    const platform = (
      gramSabha.meetingPlatform ||
      resolveMeetingPlatform()
    ).toLowerCase();
    const provider = getMeetingProvider(platform);
    const providerData = await provider.startRecording({
      jiomeetId,
      roomPIN,
      providerData: gramSabha.meetingProviderData || gramSabha.jioMeetData || {},
      gramSabhaId: gramSabha._id.toString(),
    });

    if (platform === "jio") {
      gramSabha.jioMeetData = {
        ...(gramSabha.jioMeetData || {}),
        recordingStatus: providerData.recordingStatus,
        historyId: providerData.historyId,
        prefix: providerData.prefix,
      };
    } else {
      gramSabha.meetingProviderData = {
        ...(gramSabha.meetingProviderData || {}),
        recordingStatus:
          providerData.recordingStatus || "managed_by_google_meet",
        recordingStartMetadata: providerData,
      };
    }
    await gramSabha.save();

    return res.status(200).json({
      success: true,
      message:
        platform === "jio"
          ? "Recording started and historyId saved"
          : "Google Meet recording is managed at host level",
      data: providerData,
      platform,
    });
  } catch (error) {
    console.error("Start recording error:", error.message, error.response?.data);
    return res.status(500).json({
      success: false,
      message: "Failed to start recording",
      error: error.message,
    });
  }
});

router.post("/recordings/list", async (req, res) => {
  const { jiomeetId, roomPIN, historyId, gramSabhaId } = req.body;

  if (!gramSabhaId && (!jiomeetId || !roomPIN || !historyId)) {
    return res.status(412).json({
      success: false,
      message: "Validation Error",
      error: {
        customCode: 412,
        message:
          "Either gramSabhaId or (jiomeetId, roomPIN, historyId) must be provided",
      },
    });
  }

  try {
    const gramSabha = gramSabhaId
      ? await GramSabha.findById(gramSabhaId)
      : await GramSabha.findOne({
          "jioMeetData.jiomeetId": jiomeetId,
          "jioMeetData.roomPIN": roomPIN,
        });

    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: "Gram Sabha not found",
      });
    }

    const platform = (
      gramSabha.meetingPlatform ||
      resolveMeetingPlatform()
    ).toLowerCase();
    const provider = getMeetingProvider(platform);

    const providerResult = await provider.listRecordings({
      jiomeetId,
      roomPIN,
      historyId,
      providerData: gramSabha.meetingProviderData || gramSabha.jioMeetData || {},
      gramSabhaId: gramSabha._id.toString(),
    });

    const callRecordings = providerResult.callRecordings || [];
    if (platform === "jio") {
      gramSabha.jioMeetData = {
        ...(gramSabha.jioMeetData || {}),
        historyId,
        recordingStatus:
          callRecordings.length > 0 ? "available" : "not_available",
        recordings: callRecordings,
      };
    } else {
      gramSabha.meetingProviderData = {
        ...(gramSabha.meetingProviderData || {}),
        recordingStatus:
          callRecordings.length > 0 ? "available" : "not_available",
        recordings: callRecordings,
      };
    }
    await gramSabha.save();

    return res.status(200).json({
      success: true,
      message: "Recording details fetched successfully",
      recordings: callRecordings,
      platform,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch recording details",
      error: error?.response?.data || error.message,
    });
  }
});

router.get("/recordings/download", async (req, res) => {
  const { videoUrl, gramSabhaId, platform } = req.query;

  if (!videoUrl) {
    return res.status(400).json({
      success: false,
      message: "Missing required parameter: videoUrl",
    });
  }

  try {
    let resolvedPlatform = platform || resolveMeetingPlatform();
    if (gramSabhaId) {
      const gramSabha = await GramSabha.findById(gramSabhaId).select(
        "meetingPlatform"
      );
      if (gramSabha?.meetingPlatform) {
        resolvedPlatform = gramSabha.meetingPlatform;
      }
    }

    const provider = getMeetingProvider(String(resolvedPlatform).toLowerCase());
    const stream = await provider.downloadRecordingStream(videoUrl);

    res.setHeader("Content-Disposition", "attachment; filename=recording.mp4");
    res.setHeader("Content-Type", "video/mp4");
    stream.pipe(res);
  } catch (err) {
    console.error("Download error:", err?.response?.data || err.message);
    res.status(500).json({
      success: false,
      message: "Failed to download video",
      error: err?.response?.data || err.message,
    });
  }
});
module.exports = router;
