// backend/server.js (Enhanced with security and authentication)
const express = require('express');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const cors = require('cors');
const mongoose = require('mongoose');
const path = require('path');
const dotenv = require('dotenv');
const helmet = require('helmet');
const xss = require('xss-clean');
const hpp = require('hpp');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:3001';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Import security middleware
const configureSecurityMiddleware = require('./middleware/securityMiddleware');

// Import routes
const panchayatRoutes = require('./routes/panchayatRoutes');
const userRoutes = require('./routes/userRoutes');
const issueRoutes = require('./routes/issueRoutes');
const citizenRoutes = require('./routes/citizenRoutes');
const authRoutes = require('./routes/authRoutes');
const officialRoutes = require('./routes/officialRoutes');
const gramSabhaRoutes = require('./routes/gramSabhaRoutes');

// Import models
const User = require('./models/User');
const Panchayat = require('./models/Panchayat');
const Issue = require('./models/Issue');
const Ward = require('./models/Ward');
const { createDefaultRoles } = require('./models/Role');

// Basic security middlewares
app.use(helmet({
  crossOriginResourcePolicy: false,
  crossOriginEmbedderPolicy: false
}));
app.use(xss()); // Prevent XSS attacks
app.use(hpp()); // Prevent HTTP Parameter Pollution

// Request logging for development
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  credentials: true
}));

// Body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Serve static files from the uploads directory
app.use('/uploads', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
  res.header('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
}, express.static(uploadsDir));
app.use('/static', express.static(path.join(__dirname, 'public')));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/gram_panchayat', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch(err => {
  console.error('MongoDB connection error:', err);
});

// File upload configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Define allowed file types
    const allowedTypes = /jpeg|jpg|png|gif|csv|pdf|doc|docx|xls|xlsx|application\/vnd.ms-excel/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only specific file types are allowed (images, documents, spreadsheets)'));
    }
  }
});

// Rate limiting for API routes
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 15 minutes
  max: 10000, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  standardHeaders: true, // Return rate limit info in the RateLimit-* headers
  legacyHeaders: false // Disable the X-RateLimit-* headers
});

// Apply more strict rate limit for sensitive routes
const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 100000, // start blocking after 10 requests
  message: 'Too many authentication attempts from this IP, please try again after an hour',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);
// Apply stricter limiting to auth endpoints
app.use('/api/auth/login', authLimiter);
app.use('/api/citizens/face-login', authLimiter);

// Import users from CSV
app.post('/api/import-csv', upload.single('file'), async (req, res) => {
  try {
    // Get panchayatId from the request
    const { panchayatId } = req.body;

    if (!panchayatId) {
      return res.status(400).json({
        success: false,
        message: 'PanchayatId is required for importing users'
      });
    }

    // Verify panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    const results = [];

    // First, log the column headers to identify any issues
    let columnNames = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('headers', (headers) => {
        // Log the exact headers from the CSV file
        console.log('CSV Headers:', headers);
        columnNames = headers;
      })
      .on('data', (data) => {
        // Debug the first row to see what's coming in
        if (results.length === 0) {
          console.log('First row data:', data);
        }

        // Handle the column name with trailing space: "Voter id number "
        let voterIdValue = data['Voter id number'];

        // If not found, try with a space at the end
        if (voterIdValue === undefined) {
          voterIdValue = data['Voter id number '];
        }

        // Try other possible variations if still not found
        if (voterIdValue === undefined) {
          // Try with any key that contains "Voter id"
          const voterIdKey = Object.keys(data).find(key =>
            key.includes('Voter id') || key.includes('voter id'));

          if (voterIdKey) {
            voterIdValue = data[voterIdKey];
          }
        }

        if (!voterIdValue) {
          console.log('Row missing voter ID:', data);
          return; // Skip this row
        }

        results.push({
          name: data.Name || '',
          gender: data.Gender || '',
          fatherName: data['Father Name'] || '',
          husbandName: data['Husband Name'] || '',
          motherName: data['Mother Name'] || '',
          address: data.Address || '',
          mobileNumber: data['Mobile number'] ? data['Mobile number'].toString() : '',
          voterIdNumber: voterIdValue.trim().replaceAll('/', '-'), // Clean up voter ID
          caste: {
            name: data.Caste || '',
            category: data['Caste Category'] || ''
          },
          isRegistered: false,
          panchayatId: panchayatId // Add panchayatId to each user
        });
      })
      .on('end', async () => {
        try {
          console.log(`Processed ${results.length} rows from CSV for panchayat ${panchayatId}`);

          if (results.length === 0) {
            return res.status(400).json({
              success: false,
              message: 'No valid data found in CSV. Column headers: ' + columnNames.join(', ')
            });
          }

          // Only remove existing users for this panchayat
          await User.deleteMany({ panchayatId });

          // Import new data
          await User.insertMany(results);

          fs.unlinkSync(req.file.path); // Delete temp file

          res.json({
            success: true,
            message: `Successfully imported ${results.length} voters to ${panchayat.name} panchayat.`
          });
        } catch (err) {
          console.error('Error saving to database:', err);
          res.status(500).json({
            success: false,
            message: 'Error saving to database: ' + err.message
          });
        }
      });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ success: false, message: 'Error importing CSV' });
  }
});

// Get registration statistics with optional panchayatId filter
app.get('/api/stats', async (req, res) => {
  try {
    const { panchayatId } = req.query;
    const filter = panchayatId ? { panchayatId } : {};

    const totalUsers = await User.countDocuments(filter);
    const registeredUsers = await User.countDocuments({ ...filter, isRegistered: true });

    // Get issue statistics if panchayat is specified
    let issueStats = null;
    if (panchayatId) {
      const totalIssues = await Issue.countDocuments({ panchayatId });
      const resolvedIssues = await Issue.countDocuments({
        panchayatId,
        status: 'RESOLVED'
      });
      const pendingIssues = await Issue.countDocuments({
        panchayatId,
        status: { $in: ['REPORTED', 'AGENDA_CREATED'] }
      });

      issueStats = {
        totalIssues,
        resolvedIssues,
        pendingIssues
      };
    }

    res.json({
      totalUsers,
      registeredUsers,
      pendingUsers: totalUsers - registeredUsers,
      panchayatId: panchayatId || 'all',
      issueStats
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching stats' });
  }
});

// Direct endpoint for backward compatibility
app.post('/api/register-face', async (req, res) => {
  try {
    const { voterId, faceDescriptor, faceImage, panchayatId } = req.body;
    console.log('Legacy register-face endpoint called with voterId:', voterId);
    console.log('PanchayatId received:', panchayatId);

    // Validate panchayatId is provided
    if (!panchayatId) {
      return res.status(400).json({
        success: false,
        message: 'PanchayatId is required for face registration'
      });
    }

    // Verify panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Find the user
    const user = await User.findOne({ voterIdNumber: voterId, panchayatId });

    if (!user) {
      return res.status(404).json({ success: false, message: 'Member not found' });
    }

    // Check if face already exists for another user in the same panchayat
    const allUsers = await User.find({
      faceDescriptor: { $exists: true, $ne: null },
      voterIdNumber: { $ne: voterId },
      panchayatId
    });

    // Face similarity check
    const threshold = 0.38; // Lower = more strict comparison
    let existingMatch = null;

    for (const existingUser of allUsers) {
      if (existingUser.faceDescriptor && existingUser.faceDescriptor.length > 0) {
        const distance = calculateFaceDistance(existingUser.faceDescriptor, faceDescriptor);
        console.log(`Face distance with ${existingUser.voterIdNumber}: ${distance}`);

        if (distance < threshold) {
          existingMatch = existingUser;
          break;
        }
      }
    }

    if (existingMatch) {
      return res.status(400).json({
        success: false,
        message: `This face appears to be already registered with voter ID: ${existingMatch.voterIdNumber} (${existingMatch.name})`
      });
    }

    console.log('Attempting to save face image...');
    // Save face image if provided
    let faceImagePath = null;
    if (faceImage) {
      // Remove header from base64 string
      const base64Data = faceImage.replace(/^data:image\/\w+;base64,/, '');

      // Create a faces subdirectory within panchayat directory if it doesn't exist
      const panchayatDir = path.join(__dirname, 'uploads', panchayatId.toString());
      const facesDir = path.join(panchayatDir, 'faces');

      if (!fs.existsSync(panchayatDir)) {
        fs.mkdirSync(panchayatDir, { recursive: true });
      }

      if (!fs.existsSync(facesDir)) {
        fs.mkdirSync(facesDir, { recursive: true });
      }

      // Create a safe filename based on voter ID (removing any slashes or problematic characters)
      const safeVoterId = voterId.replace(/[\/\\:*?"<>|]/g, '_');
      const filename = `${safeVoterId}_${Date.now()}.jpg`;

      // Use a path format that works with our static file serving
      faceImagePath = `/uploads/${panchayatId}/faces/${filename}`;

      // Save the image
      try {
        fs.writeFileSync(path.join(facesDir, filename), base64Data, 'base64');
        console.log(`Face image saved at: ${faceImagePath}`);
      } catch (error) {
        console.error('Error saving face image:', error);
        throw new Error('Failed to save face image: ' + error.message);
      }
    }

    // Helper function for face comparison
    function calculateFaceDistance(descriptor1, descriptor2) {
      if (!descriptor1 || !descriptor2 || descriptor1.length !== descriptor2.length) {
        return Infinity;
      }

      let sum = 0;
      for (let i = 0; i < descriptor1.length; i++) {
        sum += Math.pow(descriptor1[i] - descriptor2[i], 2);
      }
      return Math.sqrt(sum);
    }

    // Update user
    user.faceDescriptor = faceDescriptor;
    user.faceImagePath = faceImagePath;
    user.isRegistered = true;
    user.registrationDate = new Date();
    await user.save();

    res.json({
      success: true,
      message: 'Face registered successfully',
      user: {
        name: user.name,
        voterIdNumber: user.voterIdNumber,
        panchayatId: user.panchayatId,
        isRegistered: user.isRegistered,
        faceImagePath: user.faceImagePath
      }
    });
  } catch (error) {
    console.error('Error registering face:', error);
    res.status(500).json({ success: false, message: 'Error registering face: ' + error.message });
  }
});

// Routes
app.use('/api/panchayats', panchayatRoutes);
app.use('/api/users', userRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/citizens', citizenRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/officials', officialRoutes);
app.use('/api/gram-sabha', gramSabhaRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    serverTime: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    backendUrl: BACKEND_URL
  });
});

// Create default roles
createDefaultRoles().catch(console.error);

// Debug route for file paths
app.get('/api/debug/paths', (req, res) => {
  res.json({
    uploadsDir: uploadsDir,
    dirExists: fs.existsSync(uploadsDir),
    backendUrl: BACKEND_URL
  });
});

// Error handling middleware (should be last)
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  console.error(err.stack);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal server error';

  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'production' ? '🥞' : err.stack
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  console.log(`CORS Origin: ${CORS_ORIGIN}`);
  console.log(`Environment: ${NODE_ENV}`);
});