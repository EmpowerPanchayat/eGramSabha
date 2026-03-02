const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const axios = require("axios");
const fs = require("fs");
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

const { JIOMEET_APP_ID, JIOMEET_API, BACKEND_URL, PRIVATE_KEY_PATH, PUBLIC_KEY_PATH } = process.env;

// Log JioMeet configuration status at startup
console.log('[JioMeet Config] JIOMEET_APP_ID:', JIOMEET_APP_ID ? 'SET' : 'NOT SET');
console.log('[JioMeet Config] JIOMEET_API:', JIOMEET_API ? JIOMEET_API : 'NOT SET');
console.log('[JioMeet Config] PRIVATE_KEY_PATH:', PRIVATE_KEY_PATH || 'NOT SET');
console.log('[JioMeet Config] PUBLIC_KEY_PATH:', PUBLIC_KEY_PATH || 'NOT SET');

// Load keys from file paths
let privateKey = null;
let publicKey = null;

try {
  if (PRIVATE_KEY_PATH) {
    privateKey = fs.readFileSync(PRIVATE_KEY_PATH, 'utf8');
    console.log('[JioMeet Config] Private key loaded successfully, length:', privateKey.length);
  } else {
    console.warn('[JioMeet Config] PRIVATE_KEY_PATH not set - JioMeet JWT signing will fail');
  }
  if (PUBLIC_KEY_PATH) {
    publicKey = fs.readFileSync(PUBLIC_KEY_PATH, 'utf8');
    console.log('[JioMeet Config] Public key loaded successfully, length:', publicKey.length);
  } else {
    console.warn('[JioMeet Config] PUBLIC_KEY_PATH not set');
  }
} catch (error) {
  console.error('[JioMeet Config] ERROR: Could not load RSA keys from file paths:', error.message);
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

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

      // Initialize JioMeet data as null
      let jioMeetData = null;
      let meetingLink = null;

      // Try to create JioMeet meeting if configuration is available
      console.log('[JioMeet Create] Checking JioMeet config - APP_ID:', !!JIOMEET_APP_ID, ', API:', !!JIOMEET_API, ', privateKey:', !!privateKey);
      if (JIOMEET_APP_ID && JIOMEET_API) {
        try {
          const jioMeetRequestBody = {
            topic: generatedTitle,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            isAutoRecordingEnabled: true,
          };
          console.log('[JioMeet Create] Request body:', JSON.stringify(jioMeetRequestBody));

          if (!privateKey) {
            console.error('[JioMeet Create] ERROR: privateKey is null - cannot sign JWT. Check PRIVATE_KEY_PATH and key file.');
          }

          const payload = { app: JIOMEET_APP_ID, timestamp: Date.now() };
          console.log('[JioMeet Create] JWT payload:', JSON.stringify(payload));
          const jioMeetToken = jwt.sign(payload, privateKey, {
            algorithm: "RS256",
          });
          console.log('[JioMeet Create] JWT token generated successfully, length:', jioMeetToken.length);

          const apiUrl = `${JIOMEET_API}/schedule/meeting`;
          console.log('[JioMeet Create] Calling JioMeet API:', apiUrl);

          // Adding JioMeet API call
          const response = await axios.post(
            apiUrl,
            jioMeetRequestBody,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jioMeetToken}`,
              },
            }
          );

          console.log('[JioMeet Create] API response status:', response.status);
          console.log('[JioMeet Create] API response data:', JSON.stringify(response.data));

          jioMeetData = response.data;
          meetingLink = response.data.hostUrl;

          console.log('[JioMeet Create] Meeting created successfully - meetingLink:', meetingLink);
          if (!meetingLink) {
            console.warn('[JioMeet Create] WARNING: hostUrl is missing from response data. Available keys:', Object.keys(response.data));
          }
        } catch (jioMeetError) {
          console.error('[JioMeet Create] ERROR creating JioMeet meeting:', jioMeetError.message);
          if (jioMeetError.response) {
            console.error('[JioMeet Create] API error status:', jioMeetError.response.status);
            console.error('[JioMeet Create] API error data:', JSON.stringify(jioMeetError.response.data));
            console.error('[JioMeet Create] API error headers:', JSON.stringify(jioMeetError.response.headers));
          } else if (jioMeetError.request) {
            console.error('[JioMeet Create] No response received - network/timeout error');
          } else {
            console.error('[JioMeet Create] Error details:', jioMeetError.stack);
          }
          // Continue without JioMeet - meeting will be created without video link
        }
      } else {
        console.warn('[JioMeet Create] SKIPPED - JioMeet not configured. JIOMEET_APP_ID:', !!JIOMEET_APP_ID, ', JIOMEET_API:', !!JIOMEET_API);
      }

      console.log('[GramSabha Create] Saving with jioMeetData:', jioMeetData ? 'PRESENT' : 'NULL', ', meetingLink:', meetingLink || 'NULL');

      const gramSabha = new GramSabha({
        panchayatId,
        title: generatedTitle,
        dateTime,
        location,
        agenda: parsedAgenda,
        description,
        scheduledById: req.official.id,
        scheduledDurationHours,
        jioMeetData,
        meetingLink,
        attachments,
      });

      await gramSabha.save();
      console.log('[GramSabha Create] Saved successfully, id:', gramSabha._id, ', meetingLink:', gramSabha.meetingLink || 'NULL');

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

      // Handle JioMeet updates if configuration is available
      const hasJioMeetRelevantUpdates = updates.includes("title") ||
        updates.includes("dateTime") ||
        updates.includes("date") ||
        updates.includes("time") ||
        updates.includes("scheduledDurationHours");
      console.log('[JioMeet Update] Relevant fields changed:', hasJioMeetRelevantUpdates, ', APP_ID:', !!JIOMEET_APP_ID, ', API:', !!JIOMEET_API, ', privateKey:', !!privateKey);

      if (
        hasJioMeetRelevantUpdates &&
        JIOMEET_APP_ID &&
        JIOMEET_API
      ) {
        try {
          // Calculate end time based on dateTime and duration
          const startTime = new Date(req.body.dateTime || gramSabha.dateTime);
          const endTime = new Date(startTime);
          const duration =
            req.body.scheduledDurationHours || gramSabha.scheduledDurationHours;
          endTime.setMinutes(endTime.getMinutes() + parseInt(duration * 60));

          // Prepare JioMeet API request body
          const jioMeetRequestBody = {
            topic: req.body.title || gramSabha.title,
            startTime: startTime.toISOString(),
            endTime: endTime.toISOString(),
            isAutoRecordingEnabled: true,
          };
          console.log('[JioMeet Update] Request body:', JSON.stringify(jioMeetRequestBody));

          if (!privateKey) {
            console.error('[JioMeet Update] ERROR: privateKey is null - cannot sign JWT');
          }

          const payload = { app: JIOMEET_APP_ID, timestamp: Date.now() };
          const jioMeetToken = jwt.sign(payload, privateKey, {
            algorithm: "RS256",
          });
          console.log('[JioMeet Update] JWT token generated successfully');

          const apiUrl = `${JIOMEET_API}/schedule/meeting`;
          console.log('[JioMeet Update] Calling JioMeet API:', apiUrl);

          // Update the meeting in JioMeet
          const response = await axios.post(
            apiUrl,
            jioMeetRequestBody,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${jioMeetToken}`,
              },
            }
          );

          console.log('[JioMeet Update] API response status:', response.status);
          console.log('[JioMeet Update] API response data:', JSON.stringify(response.data));

          // Update JioMeet data in the database
          gramSabha.jioMeetData = response.data;
          gramSabha.meetingLink = response.data.hostUrl;
          gramSabha.meetingId = response.data.meetingId;

          console.log('[JioMeet Update] Meeting updated successfully - meetingLink:', gramSabha.meetingLink);
          if (!gramSabha.meetingLink) {
            console.warn('[JioMeet Update] WARNING: hostUrl is missing from response data. Available keys:', Object.keys(response.data));
          }
        } catch (jioMeetError) {
          console.error('[JioMeet Update] ERROR updating JioMeet meeting:', jioMeetError.message);
          if (jioMeetError.response) {
            console.error('[JioMeet Update] API error status:', jioMeetError.response.status);
            console.error('[JioMeet Update] API error data:', JSON.stringify(jioMeetError.response.data));
          } else if (jioMeetError.request) {
            console.error('[JioMeet Update] No response received - network/timeout error');
          } else {
            console.error('[JioMeet Update] Error details:', jioMeetError.stack);
          }
          // Continue without JioMeet - it's optional
        }
      } else if (!hasJioMeetRelevantUpdates) {
        console.log('[JioMeet Update] SKIPPED - no relevant fields changed in this update');
      } else {
        console.warn('[JioMeet Update] SKIPPED - JioMeet not configured. JIOMEET_APP_ID:', !!JIOMEET_APP_ID, ', JIOMEET_API:', !!JIOMEET_API);
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
  const { jiomeetId, roomPIN } = req.body;

  try {
    const payload = { app: JIOMEET_APP_ID, timestamp: Date.now() };
    const token = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
    });

    // Call JioMeet Start Recording API
    const response = await axios.post(
      `${JIOMEET_API}/recordings/start`,
      req.body,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { historyId, recordingStatus, prefix } = response.data;

    // 🔍 Find the GramSabha by nested fields using dot notation
    const gramSabha = await GramSabha.findOne({
      "jioMeetData.jiomeetId": jiomeetId,
      "jioMeetData.roomPIN": roomPIN,
    });

    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: "Gram Sabha not found",
      });
    }

    // 📝 Update jioMeetData with recording details (non-destructive)
    gramSabha.jioMeetData = {
      ...gramSabha.jioMeetData,
      recordingStatus,
      historyId,
      prefix,
    };

    await gramSabha.save();

    return res.status(200).json({
      success: true,
      message: "Recording started and historyId saved",
      data: {
        jiomeetId,
        historyId,
        recordingStatus,
        prefix,
      },
    });
  } catch (error) {
    console.error(
      "Start recording error:",
      error.message,
      error.response?.data
    );
    return res.status(500).json({
      success: false,
      message: "Failed to start recording",
      error: error.message,
    });
  }
});

router.post("/recordings/list", async (req, res) => {
  const { jiomeetId, roomPIN, historyId } = req.body;

  if (!jiomeetId || !roomPIN || !historyId) {
    return res.status(412).json({
      success: false,
      message: "Validation Error",
      error: {
        customCode: 412,
        message: "Validation Error",
        errorsArray: [
          !jiomeetId && {
            property: "jiomeetId",
            message: "should have required property 'jiomeetId'",
          },
          !roomPIN && {
            property: "roomPIN",
            message: "should have required property 'roomPIN'",
          },
          !historyId && {
            property: "historyId",
            message: "should have required property 'historyId'",
          },
        ].filter(Boolean),
      },
    });
  }

  try {
    // 🔐 Create signed token
    const payload = {
      app: JIOMEET_APP_ID,
      timestamp: Date.now(),
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
    });

    // 📡 Fetch recording list from JioMeet
    const listRes = await axios.post(
      `${JIOMEET_API}/recordings/list`,
      { jiomeetId, roomPIN, historyId },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const { callRecordings = [] } = listRes.data;

    // 🔍 Find the GramSabha using nested jioMeetData
    const gramSabha = await GramSabha.findOne({
      "jioMeetData.jiomeetId": jiomeetId,
      "jioMeetData.roomPIN": roomPIN,
    });

    if (!gramSabha) {
      return res.status(404).json({
        success: false,
        message: "Gram Sabha not found",
      });
    }

    // 📝 Update jioMeetData (non-destructive)
    gramSabha.jioMeetData = {
      ...gramSabha.jioMeetData,
      historyId,
      recordingStatus:
        callRecordings.length > 0 ? "available" : "not_available",
      recordings: callRecordings,
    };

    await gramSabha.save();

    return res.status(200).json({
      success: true,
      message: "Recording details fetched successfully",
      recordings: callRecordings,
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
  const { videoUrl } = req.query;

  if (!videoUrl) {
    return res.status(400).json({
      success: false,
      message: "Missing required parameter: videoUrl",
    });
  }

  try {
    // ✅ Create JWT token
    const payload = {
      app: JIOMEET_APP_ID,
      timestamp: Date.now(),
    };

    const token = jwt.sign(payload, privateKey, {
      algorithm: "RS256",
    });

    // ✅ Fetch video stream from JioMeet API
    const response = await axios.get(videoUrl, {
      responseType: "stream", // So we can pipe the video stream
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    // 📦 Set headers to force download in browser
    res.setHeader("Content-Disposition", "attachment; filename=recording.mp4");
    res.setHeader("Content-Type", "video/mp4");

    // 🌀 Pipe the video stream to the client
    response.data.pipe(res);
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
