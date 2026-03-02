// backend/server.js (Enhanced with security and authentication)
const express = require("express");
const multer = require("multer");
const csv = require("csv-parser");
const fs = require("fs");
const cors = require("cors");
const mongoose = require("mongoose");
const PlatformConfiguration = require("./models/PlatformConfiguration");
const defaultSettings = require("./defaults/defaultPlatformSettings");
const path = require("path");
const storageService = require('./storage/storageService');

const dotenv = require("dotenv");
const helmet = require("helmet");
const xss = require("xss-clean");
const hpp = require("hpp");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const auth = require("./middleware/auth");

const { startCronJobs, stopCronJobs } = require("./utils/cronJobs");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:5000";
const CORS_ORIGIN = process.env.CORS_ORIGIN || "http://localhost:3000";
const NODE_ENV = process.env.NODE_ENV || "development";

// Import Swagger setup
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger-output.json');

// Import security middleware
const configureSecurityMiddleware = require("./middleware/securityMiddleware");

// Import routes
const panchayatRoutes = require('./routes/panchayatRoutes');
const userRoutes = require('./routes/userRoutes');
const issueRoutes = require('./routes/issueRoutes');
const citizenRoutes = require('./routes/citizenRoutes');
const adminAuthRoutes = require('./routes/adminAuthRoutes');
const officialAuthRoutes = require('./routes/officialAuthRoutes');
const citizenAuthRoutes = require('./routes/citizenAuthRoutes');
const officialRoutes = require('./routes/officialRoutes');
const gramSabhaRoutes = require('./routes/gramSabhaRoutes');
const platformConfigRoutes = require('./routes/platformConfigRoutes');
const issueSummaryRoutes = require('./routes/issueSummaryRoutes');
const locationRoutes = require("./routes/locationRoutes");
const supportTicketRoutes = require('./routes/supportTicketRoutes');

// Import models
const User = require("./models/User");
const Panchayat = require("./models/Panchayat");
const Issue = require("./models/Issue");
const Ward = require("./models/Ward");
const { createDefaultRoles } = require("./models/Role");

// Swagger documentation setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument, {
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info .title { color: #2E7D32; }
    .swagger-ui .scheme-container { background: #E8F5E8; }
  `,
  customSiteTitle: "Gram Sabha API Documentation",
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    docExpansion: 'list',
    filter: true,
    showRequestHeaders: true,
  }
}));

// Basic security middlewares
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Request logging for development
if (NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// CORS configuration
app.use(
  cors({
    origin: CORS_ORIGIN,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
    credentials: true,
    exposedHeaders: ['x-total-count'],
  })
);

// Body parsers
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// MongoDB Connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/voter_registration";

mongoose
  .connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {})
  .catch((err) => {
    console.error("Database connection error:", err);
  });

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Define allowed file types
    const allowedTypes =
      /jpeg|jpg|png|gif|csv|pdf|doc|docx|xls|xlsx|application\/vnd.ms-excel/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase()
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Only specific file types are allowed (images, documents, spreadsheets)"
        )
      );
    }
  },
});

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later",
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false, // Disable the X-RateLimit-* headers
});

// Apply more strict rate limit for sensitive routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100000, // start blocking after 10 requests
  message:
    "Too many authentication attempts from this IP, please try again after an hour",
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use("/api/", apiLimiter);
// Apply stricter limiting to auth endpoints
app.use("/api/auth/login", authLimiter);
app.use("/api/citizens/face-login", authLimiter);

//Check liveness
app.get("/api/liveliness", (req, res) => {
  res.status(200).send("OK");
});

// Import users from CSV
app.post('/api/import-csv', auth.isAdmin, upload.single('file'), async (req, res) => {
  try {
    // Get panchayatId from the request
    const { panchayatId } = req.body;

    if (!panchayatId) {
      return res.status(400).json({
        success: false,
        message: "PanchayatId is required for importing users",
      });
    }

    // Verify panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: "Panchayat not found",
      });
    }

    const results = [];

    // First, log the column headers to identify any issues
    let columnNames = [];
    let skippedDueToMissingVoterID = 0;

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("headers", (headers) => {
        // Log the exact headers from the CSV file
        console.log("CSV Headers:", headers);
        columnNames = headers;
      })
      .on("data", (data) => {
        // Debug the first row to see what's coming in
        if (results.length === 0) {
          console.log("First row data:", data);
        }

        // Handle the column name with trailing space: "Voter id number "
        let voterIdValue = data["Voter id number"];

        // If not found, try with a space at the end
        if (voterIdValue === undefined) {
          voterIdValue = data["Voter id number "];
        }

        // Try other possible variations if still not found
        if (voterIdValue === undefined) {
          // Try with any key that contains "Voter id"
          const voterIdKey = Object.keys(data).find(
            (key) => key.includes("Voter id") || key.includes("voter id")
          );

          if (voterIdKey) {
            voterIdValue = data[voterIdKey];
          }
        }

        if (!voterIdValue) {
          skippedDueToMissingVoterID++;
          console.log("Row missing voter ID:", data);
          return; // Skip this row
        }

        results.push({
          name: data.Name || "",
          gender: data.Gender || "",
          fatherName: data["Father Name"] || "",
          husbandName: data["Husband Name"] || "",
          motherName: data["Mother Name"] || "",
          address: data.Address || "",
          mobileNumber: data["Mobile number"]
            ? data["Mobile number"].toString()
            : "",
          voterIdNumber: voterIdValue.trim().replaceAll("/", "-"), // Clean up voter ID
          caste: {
            name: data.Caste || "",
            category: data["Caste Category"] || "",
          },
          isRegistered: false,
          panchayatId: panchayatId, // Add panchayatId to each user
        });
      })
      .on("end", async () => {
        try {
          console.log(
            `Processed ${results.length} rows from CSV for panchayat ${panchayatId}. Skipped ${skippedDueToMissingVoterID} rows.`
          );

          if (results.length === 0) {
            return res.status(400).json({
              success: false,
              message: `No valid data found in CSV. Skipped ${skippedDueToMissingVoterID} rows. Headers: ${columnNames.join(
                ", "
              )}`,
            });
          }

          if (results.length > 10000) {
            return res.status(400).json({
              success: false,
              message:
                "CSV import limit exceeded. Maximum allowed is 10,000 records.",
            });
          }

          // Create bulk operations
          const bulkOps = results.map((user) => ({
            updateOne: {
              filter: { voterIdNumber: user.voterIdNumber, panchayatId },
              update: { $set: user },
              upsert: true,
            },
          }));

          const bulkResult = await User.bulkWrite(bulkOps);

          const created = bulkResult.upsertedCount || 0;
          const updated = bulkResult.modifiedCount || 0;
          const matched = bulkResult.matchedCount || 0;
          const unchanged = matched - updated;

          fs.unlinkSync(req.file.path); // Delete temp file

          res.json({
            success: true,
            message: `Import complete: ${created} added, ${updated} updated, ${unchanged} unchanged, ${skippedDueToMissingVoterID} skipped due to missing voter ID.`,
            skippedDueToMissingVoterID,
          });
        } catch (err) {
          console.error("Import error:", err);
          res
            .status(500)
            .json({
              success: false,
              message: "Error saving data: " + err.message,
            });
        }
      });
  } catch (error) {
    console.error("CSV import error:", error);
    res.status(500).json({ success: false, message: "Internal server error." });
  }
});

// Get registration statistics with optional panchayatId filter
app.get('/api/stats', auth.isAdmin, async (req, res) => {
  try {
    const { panchayatId } = req.query;
    const filter = panchayatId ? { panchayatId } : {};

    const totalUsers = await User.countDocuments(filter);
    const registeredUsers = await User.countDocuments({
      ...filter,
      isRegistered: true,
    });

    // Get issue statistics if panchayat is specified
    let issueStats = null;
    if (panchayatId) {
      const totalIssues = await Issue.countDocuments({ panchayatId });
      const resolvedIssues = await Issue.countDocuments({
        panchayatId,
        status: "RESOLVED",
      });
      const pendingIssues = await Issue.countDocuments({
        panchayatId,
        status: { $in: ["REPORTED", "AGENDA_CREATED"] },
      });

      issueStats = {
        totalIssues,
        resolvedIssues,
        pendingIssues,
      };
    }

    res.json({
      totalUsers,
      registeredUsers,
      pendingUsers: totalUsers - registeredUsers,
      panchayatId: panchayatId || "all",
      issueStats,
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({ success: false, message: "Error fetching stats" });
  }
});

// Direct endpoint for backward compatibility
app.post('/api/register-face', auth.isAdmin, async (req, res) => {
  try {
    const { voterId, faceDescriptor, faceImage, panchayatId } = req.body;
    console.log("Legacy register-face endpoint called with voterId:", voterId);
    console.log("PanchayatId received:", panchayatId);

    // Validate panchayatId is provided
    if (!panchayatId) {
      return res.status(400).json({
        success: false,
        message: "PanchayatId is required for face registration",
      });
    }

    // Verify panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: "Panchayat not found",
      });
    }

    // Find the user
    const user = await User.findOne({ voterIdNumber: voterId, panchayatId });

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "Member not found" });
    }

    // Check if face already exists for another user in the same panchayat
    const allUsers = await User.find({
      faceDescriptor: { $exists: true, $ne: null },
      voterIdNumber: { $ne: voterId },
      panchayatId,
    });

    // Face similarity check
    const threshold = 0.38; // Lower = more strict comparison
    let existingMatch = null;

    for (const existingUser of allUsers) {
      if (
        existingUser.faceDescriptor &&
        existingUser.faceDescriptor.length > 0
      ) {
        const distance = calculateFaceDistance(
          existingUser.faceDescriptor,
          faceDescriptor
        );
        console.log(
          `Face distance with ${existingUser.voterIdNumber}: ${distance}`
        );

        if (distance < threshold) {
          existingMatch = existingUser;
          break;
        }
      }
    }

    if (existingMatch) {
      return res.status(400).json({
        success: false,
        message: `This face appears to be already registered with voter ID: ${existingMatch.voterIdNumber} (${existingMatch.name})`,
      });
    }

    console.log("Attempting to save face image...");
    // Save face image if provided
    let faceImageId = null;
    if (faceImage) {
      // Remove header from base64 string
      const base64Data = faceImage.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, 'base64');
      const filename = `${safeVoterId}_${Date.now()}.jpg`;

      // Upload original image
      const faceImageId = await storageService.uploadImage(buffer, filename, {
        userId: user._id,
        voterId,
        panchayatId,
        type: 'profile'
      });

      // Create thumbnail
      const sharp = require('sharp');
      const thumbBuffer = await sharp(buffer).resize(100, 100).jpeg({ quality: 80 }).toBuffer();
      const thumbFilename = `${safeVoterId}_thumb_${Date.now()}.jpg`;
      const thumbImageId = await storageService.uploadImage(thumbBuffer, thumbFilename, {
        userId: user._id,
        voterId,
        panchayatId,
        type: 'thumbnail',
        originalImageId: faceImageId
      });

      user.faceImageId = faceImageId;
      user.thumbnailImageId = thumbImageId;
      await user.save();
    }

    // Update user
    user.faceDescriptor = faceDescriptor;
    user.isRegistered = true;
    if (faceImageId) user.faceImageId = faceImageId;
    user.registrationDate = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Face registered successfully",
      user: {
        name: user.name,
        voterIdNumber: user.voterIdNumber,
        panchayatId: user.panchayatId,
        isRegistered: user.isRegistered,
        faceImageId: user.faceImageId,
        thumbnailImageId: user.thumbnailImageId,
      },
    });
  } catch (error) {
    console.error("Error registering face:", error);
    res
      .status(500)
      .json({
        success: false,
        message: "Error registering face: " + error.message,
      });
  }
});

// Routes
app.use('/api/panchayats', panchayatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/citizens', citizenRoutes);

// Authentication routes
app.use('/api/auth/admin', adminAuthRoutes);
app.use('/api/auth/official', officialAuthRoutes);
app.use('/api/auth/citizen', citizenAuthRoutes);

// Deprecated - will be removed in future versions
app.use('/api/auth', require('./routes/authRoutes'));

app.use('/api/officials', officialRoutes);
app.use('/api/gram-sabha', gramSabhaRoutes);
app.use('/api/platform-configurations', platformConfigRoutes);
app.use('/api/summaries', issueSummaryRoutes);
app.use("/api/locations", locationRoutes);
app.use('/api/support-tickets', supportTicketRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    backendUrl: BACKEND_URL,
  });
});

// Create default roles
createDefaultRoles().catch(console.error);

// Debug route for file paths
app.get("/api/debug/paths", (req, res) => {
  res.json({
    uploadsDir: uploadsDir,
    dirExists: fs.existsSync(uploadsDir),
    backendUrl: BACKEND_URL,
  });
});

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === "production" ? "🥞" : err.stack,
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`CORS Origin: ${CORS_ORIGIN}`);
  console.log(`Environment: ${NODE_ENV}`);
  console.log(`Swagger docs at ${BACKEND_URL}/api-docs`);
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

// Ensure platform config is initialized at server start
async function initializePlatformConfig() {
  const config = await PlatformConfiguration.findOne();
  if (!config) {
    await PlatformConfiguration.create({ settings: defaultSettings });
    console.log("PlatformConfiguration initialized with default settings.");
  }
}

// Call this after DB connection is established
mongoose.connection.once("open", async () => {
  await initializePlatformConfig();
  // ...other startup logic...
});

// Initialize cron jobs
try {
    console.log(`[Server] Initializing cron jobs at ${new Date().toISOString()}`);
    startCronJobs();
    console.log(`[Server] Cron jobs initialized successfully`);
} catch (error) {
    console.error(`[Server] Error initializing cron jobs:`, {
        error: error.message,
        stack: error.stack
    });
}
