// File: backend/routes/panchayatRoutes.js (Enhanced with LGD and location lookup)
const express = require("express");
const router = express.Router();
const Panchayat = require("../models/Panchayat");
const User = require("../models/User");
const Ward = require("../models/Ward");
const Issue = require("../models/Issue");
const Official = require("../models/Official");
const multer = require("multer");
const storageService = require("../storage/storageService");
const auth = require("../middleware/auth");
const mongoose = require("mongoose");

// Configure multer for memory storage (letterhead uploads)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB max
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'image/png' || file.mimetype === 'image/jpeg') {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPEG images are allowed'), false);
    }
  }
});

// Role checking middleware
const hasRole = (roles) => (req, res, next) => {
  const userRole = req.official?.role || req.admin?.role || req.user?.role;
  if (roles.includes(userRole) || userRole === 'ADMIN') {
    next();
  } else {
    res.status(403).json({
      success: false,
      message: 'Insufficient permissions'
    });
  }
};

// Get all panchayats
router.get("/", async (req, res) => {
  try {
    const panchayats = await Panchayat.find({});
    res.json(panchayats);
  } catch (error) {
    console.error("Error fetching panchayats:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching panchayats" });
  }
});

/**
 * NEW: Get panchayat by LGD code
 * For direct login via ?lgdCode=123456
 */
router.get("/by-lgd/:lgdCode", async (req, res) => {
  try {
    const { lgdCode } = req.params;

    // Validate LGD code format
    if (!/^\d{1,10}$/.test(lgdCode)) {
      return res.status(400).json({
        success: false,
        message: "invalidLgdCode",
        error: "LGD Code must be a numeric string with maximum 10 digits",
      });
    }

    const panchayat = await Panchayat.findByLgdCode(lgdCode);

    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: "lgdCodeNotFound",
        error: "No panchayat found with the provided LGD code",
      });
    }

    res.json({
      success: true,
      data: {
        panchayat: {
          _id: panchayat._id,
          name: panchayat.name,
          state: panchayat.state,
          district: panchayat.district,
          block: panchayat.block,
          lgdCode: panchayat.lgdCode,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching panchayat by LGD code:", error);
    res.status(500).json({
      success: false,
      message: "locationError",
      error: "Error fetching panchayat by LGD code",
    });
  }
});

/**
 * NEW: Get panchayat by location path
 * For URL path like /Bihar/Patna/Danapur/Rampur
 */
router.get(
  "/by-location/:state/:district/:block/:panchayat",
  async (req, res) => {
    try {
      const { state, district, block, panchayat } = req.params;

      // Decode URL parameters in case they contain special characters
      const decodedState = decodeURIComponent(state);
      const decodedDistrict = decodeURIComponent(district);
      const decodedBlock = decodeURIComponent(block);
      const decodedPanchayat = decodeURIComponent(panchayat);

      const foundPanchayat = await Panchayat.findByLocation(
        decodedState,
        decodedDistrict,
        decodedBlock,
        decodedPanchayat
      );

      if (!foundPanchayat) {
        return res.status(404).json({
          success: false,
          message: "locationNotFound",
          error: "No panchayat found with the provided location details",
          searchCriteria: {
            state: decodedState,
            district: decodedDistrict,
            block: decodedBlock,
            panchayat: decodedPanchayat,
          },
        });
      }

      res.json({
        success: true,
        data: {
          panchayat: {
            _id: foundPanchayat._id,
            name: foundPanchayat.name,
            state: foundPanchayat.state,
            district: foundPanchayat.district,
            block: foundPanchayat.block,
            lgdCode: foundPanchayat.lgdCode,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching panchayat by location:", error);
      res.status(500).json({
        success: false,
        message: "locationError",
        error: "Error fetching panchayat by location",
      });
    }
  }
);

/**
 * NEW: Validate location path (for error handling)
 * Checks if the path format is correct before attempting lookup
 */
router.post("/validate-location-path", async (req, res) => {
  try {
    const { pathSegments } = req.body;

    if (!pathSegments || !Array.isArray(pathSegments)) {
      return res.status(400).json({
        success: false,
        message: "incompleteLocationPath",
        error: "Path segments are required",
      });
    }

    // Check if we have the required number of segments
    if (pathSegments.length < 4) {
      return res.status(400).json({
        success: false,
        message: "missingBlockInUrl",
        error:
          "Block is required in the location path. Expected format: /State/District/Block/Panchayat",
        received: pathSegments.length,
        expected: 4,
      });
    }

    if (pathSegments.length > 4) {
      return res.status(400).json({
        success: false,
        message: "incompleteLocationPath",
        error:
          "Too many path segments. Expected format: /State/District/Block/Panchayat",
        received: pathSegments.length,
        expected: 4,
      });
    }

    // If validation passes, return success
    res.json({
      success: true,
      message: "Valid location path format",
      pathSegments: pathSegments,
    });
  } catch (error) {
    console.error("Error validating location path:", error);
    res.status(500).json({
      success: false,
      message: "locationError",
      error: "Error validating location path",
    });
  }
});

/**
 * NEW: Search panchayats for manual selection
 * Used in citizen login dropdown with search functionality
 */
router.get("/search-login", async (req, res) => {
  try {
    const { state, district, block, search, limit = 50 } = req.query;

    // Build query based on provided filters
    const query = {};
    if (state) query.state = new RegExp(`^${state}$`, "i");
    if (district) query.district = new RegExp(`^${district}$`, "i");
    if (block) query.block = new RegExp(`^${block}$`, "i");

    // Add search term if provided
    if (search) {
      query.name = new RegExp(search, "i");
    }

    const panchayats = await Panchayat.find(query)
      .select("_id name state district block lgdCode")
      .limit(parseInt(limit))
      .sort({ name: 1 });

    res.json({
      success: true,
      data: panchayats,
      count: panchayats.length,
      filters: { state, district, block, search },
    });
  } catch (error) {
    console.error("Error searching panchayats for login:", error);
    res.status(500).json({
      success: false,
      message: "locationError",
      error: "Error searching panchayats",
    });
  }
});

// Add a new ward to a panchayat
router.post('/:id/wards', async (req, res) => {
  try {
    const panchayatId = req.params.id;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Create new ward with panchayatId
    const ward = new Ward({
      ...req.body,
      panchayatId
    });

    await ward.save();

    res.status(201).json({
      success: true,
      ward
    });
  } catch (error) {
    console.error('Error creating ward:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating ward: ' + error.message
    });
  }
});

// Get all wards for a panchayat
router.get('/:id/wards', async (req, res) => {
  try {
    const panchayatId = req.params.id;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Fetch wards for this panchayat
    const wards = await Ward.find({ panchayatId });

    res.json({
      success: true,
      wards
    });
  } catch (error) {
    console.error('Error fetching wards:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching wards: ' + error.message
    });
  }
});

// Update a ward
router.put('/:panchayatId/wards/:wardId', async (req, res) => {
  try {
    const { panchayatId, wardId } = req.params;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Update the ward
    const ward = await Ward.findOneAndUpdate(
      { _id: wardId, panchayatId },
      { ...req.body, updatedAt: new Date() },
      { new: true }
    );

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found or does not belong to this panchayat'
      });
    }

    res.json({
      success: true,
      ward
    });
  } catch (error) {
    console.error('Error updating ward:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating ward: ' + error.message
    });
  }
});

// Delete a ward
router.delete('/:panchayatId/wards/:wardId', async (req, res) => {
  try {
    const { panchayatId, wardId } = req.params;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Delete the ward
    const ward = await Ward.findOneAndDelete({ _id: wardId, panchayatId });

    if (!ward) {
      return res.status(404).json({
        success: false,
        message: 'Ward not found or does not belong to this panchayat'
      });
    }

    res.json({
      success: true,
      message: 'Ward deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting ward:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting ward: ' + error.message
    });
  }
});


// Get a specific panchayat
router.get('/:id', async (req, res) => {
  try {
    const panchayat = await Panchayat.findById(req.params.id);
    if (!panchayat) {
      return res.status(404).json({ success: false, message: 'Panchayat not found' });
    }
    res.json({ success: true, panchayat });
  } catch (error) {
    console.error('Error fetching panchayat:', error);
    res.status(500).json({ success: false, message: 'Error fetching panchayat' });
  }
});

// Create a new panchayat
router.post('/', async (req, res) => {
  try {
    const panchayat = new Panchayat(req.body);
    await panchayat.save();
    res.status(201).json({ success: true, panchayat });
  } catch (error) {
    console.error('Error creating panchayat:', error);
    res.status(500).json({ success: false, message: 'Error creating panchayat: ' + error.message });
  }
});

// Update a panchayat
router.put('/:id', async (req, res) => {
  try {
    const updates = { ...req.body, updatedAt: new Date() };
    const panchayat = await Panchayat.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!panchayat) {
      return res.status(404).json({ success: false, message: 'Panchayat not found' });
    }

    res.json({ success: true, panchayat });
  } catch (error) {
    console.error('Error updating panchayat:', error);
    res.status(500).json({ success: false, message: 'Error updating panchayat' });
  }
});

// Delete a panchayat
router.delete('/:id', async (req, res) => {
  try {
    const panchayatId = req.params.id;

    // Check if panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Delete all related data
    const deleteOperations = [
      User.deleteMany({ panchayatId }),
      Ward.deleteMany({ panchayatId }),
      Issue.deleteMany({ panchayatId }),
      // Add other related collections here
      Panchayat.findByIdAndDelete(panchayatId)
    ];

    // Execute all delete operations
    const results = await Promise.all(deleteOperations);

    // Check if panchayat was deleted
    if (!results[results.length - 1]) {
      throw new Error('Failed to delete panchayat');
    }

    res.json({
      success: true,
      message: 'Panchayat and related data deleted successfully',
      deletedUsers: results[0].deletedCount,
      deletedIssues: results[1].deletedCount,
      deletedWards: results[2].deletedCount
    });

  } catch (error) {
    console.error('Error deleting panchayat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete panchayat and related data',
      error: error.message
    });
  }
});

// Get statistics for a specific panchayat
router.get('/:id/stats', async (req, res) => {
  try {
    const panchayatId = req.params.id;

    // First verify that the panchayat exists
    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({ success: false, message: 'Panchayat not found' });
    }

    const totalUsers = await User.countDocuments({ panchayatId });
    const registeredUsers = await User.countDocuments({ panchayatId, isRegistered: true });
    const wardCount = await Ward.countDocuments({ panchayatId });

    res.json({
      success: true,
      panchayatId,
      totalUsers,
      registeredUsers,
      pendingUsers: totalUsers - registeredUsers,
      wardCount
    });
  } catch (error) {
    console.error('Error fetching panchayat stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching panchayat stats' });
  }
});

// Get overall statistics
router.get('/stats', async (req, res) => {
  try {
    const { panchayatId } = req.query;

    let query = {};
    if (panchayatId) {
      query.panchayatId = panchayatId;
    }

    const totalUsers = await User.countDocuments(query);
    const registeredUsers = await User.countDocuments({ ...query, isRegistered: true });
    const pendingUsers = totalUsers - registeredUsers;
    const wardCount = await Ward.countDocuments(query);

    res.json({
      success: true,
      data: {
        totalUsers,
        registeredUsers,
        pendingUsers,
        wardCount
      }
    });
  } catch (error) {
    console.error('Error fetching overall stats:', error);
    res.status(500).json({ success: false, message: 'Error fetching overall stats' });
  }
});

// ==================== LETTERHEAD MANAGEMENT ROUTES ====================

/**
 * POST /:panchayatId/letterhead
 * Upload letterhead image (President/Secretary/Admin only)
 */
router.post('/:panchayatId/letterhead',
  auth.isOfficial,
  hasRole(['PRESIDENT', 'SECRETARY']),
  upload.single('file'),
  async (req, res) => {
    try {
      const { panchayatId } = req.params;
      const { letterheadType, margins, imageTransform } = req.body;

      // Verify panchayat exists
      const panchayat = await Panchayat.findById(panchayatId);
      if (!panchayat) {
        return res.status(404).json({
          success: false,
          message: 'Panchayat not found'
        });
      }

      // Verify the official belongs to this panchayat
      if (req.official.panchayatId?.toString() !== panchayatId && req.official.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'You can only manage letterhead for your own panchayat'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Delete old letterhead if exists
      if (panchayat.letterheadConfig?.letterheadImageId) {
        try {
          await storageService.deleteImage(panchayat.letterheadConfig.letterheadImageId);
        } catch (e) {
          console.warn('Failed to delete old letterhead:', e);
        }
      }

      // Upload new letterhead to GridFS
      const filename = `letterhead_${panchayatId}_${Date.now()}_${req.file.originalname}`;
      const letterheadImageId = await storageService.uploadImage(
        req.file.buffer,
        filename,
        {
          panchayatId,
          type: 'letterhead',
          uploadedBy: req.official.id
        }
      );

      // Parse margins if provided as string
      let parsedMargins = { top: 1.5, bottom: 0.5, left: 0.5, right: 0.5 };
      if (margins) {
        try {
          parsedMargins = typeof margins === 'string' ? JSON.parse(margins) : margins;
        } catch (e) {
          console.warn('Failed to parse margins, using defaults');
        }
      }

      // Parse imageTransform if provided as string
      let parsedImageTransform = { scale: 1, x: 0, y: 0 };
      if (imageTransform) {
        try {
          parsedImageTransform = typeof imageTransform === 'string' ? JSON.parse(imageTransform) : imageTransform;
        } catch (e) {
          console.warn('Failed to parse imageTransform, using defaults');
        }
      }

      // Update panchayat with letterhead config
      panchayat.letterheadConfig = {
        letterheadImageId,
        letterheadType: letterheadType || 'header',
        margins: parsedMargins,
        imageTransform: parsedImageTransform,
        originalFilename: req.file.originalname,
        mimeType: req.file.mimetype,
        uploadedAt: new Date(),
        uploadedBy: req.official.id
      };

      await panchayat.save();

      res.json({
        success: true,
        message: 'Letterhead uploaded successfully',
        data: {
          letterheadConfig: panchayat.letterheadConfig
        }
      });
    } catch (error) {
      console.error('Error uploading letterhead:', error);
      res.status(500).json({
        success: false,
        message: 'Error uploading letterhead: ' + error.message
      });
    }
  }
);

/**
 * GET /:panchayatId/letterhead
 * Get letterhead image stream (any authenticated user)
 */
router.get('/:panchayatId/letterhead', auth.anyAuthenticated, async (req, res) => {
  try {
    const { panchayatId } = req.params;

    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    if (!panchayat.letterheadConfig?.letterheadImageId) {
      return res.status(404).json({
        success: false,
        message: 'No letterhead configured for this panchayat'
      });
    }

    const imageStream = await storageService.getImageStream(
      panchayat.letterheadConfig.letterheadImageId
    );

    res.set('Content-Type', panchayat.letterheadConfig.mimeType || 'image/png');
    imageStream.pipe(res);
  } catch (error) {
    console.error('Error fetching letterhead:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching letterhead'
    });
  }
});

/**
 * GET /:panchayatId/letterhead/config
 * Get letterhead configuration (any authenticated user)
 */
router.get('/:panchayatId/letterhead/config', auth.anyAuthenticated, async (req, res) => {
  try {
    const { panchayatId } = req.params;

    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    res.json({
      success: true,
      data: {
        letterheadConfig: panchayat.letterheadConfig || null,
        hasLetterhead: !!panchayat.letterheadConfig?.letterheadImageId
      }
    });
  } catch (error) {
    console.error('Error fetching letterhead config:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching letterhead config'
    });
  }
});

/**
 * PUT /:panchayatId/letterhead/config
 * Update letterhead configuration (margins/type) without re-uploading image
 */
router.put('/:panchayatId/letterhead/config',
  auth.isOfficial,
  hasRole(['PRESIDENT', 'SECRETARY']),
  async (req, res) => {
    try {
      const { panchayatId } = req.params;
      const { letterheadType, margins, imageTransform } = req.body;

      const panchayat = await Panchayat.findById(panchayatId);
      if (!panchayat) {
        return res.status(404).json({
          success: false,
          message: 'Panchayat not found'
        });
      }

      // Verify the official belongs to this panchayat
      if (req.official.panchayatId?.toString() !== panchayatId && req.official.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'You can only manage letterhead for your own panchayat'
        });
      }

      if (!panchayat.letterheadConfig?.letterheadImageId) {
        return res.status(400).json({
          success: false,
          message: 'No letterhead uploaded. Please upload a letterhead first.'
        });
      }

      // Update config
      if (letterheadType) {
        panchayat.letterheadConfig.letterheadType = letterheadType;
      }
      if (margins) {
        panchayat.letterheadConfig.margins = typeof margins === 'string' ? JSON.parse(margins) : margins;
      }
      if (imageTransform) {
        panchayat.letterheadConfig.imageTransform = typeof imageTransform === 'string' ? JSON.parse(imageTransform) : imageTransform;
      }

      await panchayat.save();

      res.json({
        success: true,
        message: 'Letterhead configuration updated',
        data: {
          letterheadConfig: panchayat.letterheadConfig
        }
      });
    } catch (error) {
      console.error('Error updating letterhead config:', error);
      res.status(500).json({
        success: false,
        message: 'Error updating letterhead config'
      });
    }
  }
);

/**
 * DELETE /:panchayatId/letterhead
 * Remove letterhead from panchayat
 */
router.delete('/:panchayatId/letterhead',
  auth.isOfficial,
  hasRole(['PRESIDENT', 'SECRETARY']),
  async (req, res) => {
    try {
      const { panchayatId } = req.params;

      const panchayat = await Panchayat.findById(panchayatId);
      if (!panchayat) {
        return res.status(404).json({
          success: false,
          message: 'Panchayat not found'
        });
      }

      // Verify the official belongs to this panchayat
      if (req.official.panchayatId?.toString() !== panchayatId && req.official.role !== 'ADMIN') {
        return res.status(403).json({
          success: false,
          message: 'You can only manage letterhead for your own panchayat'
        });
      }

      if (!panchayat.letterheadConfig?.letterheadImageId) {
        return res.status(400).json({
          success: false,
          message: 'No letterhead to delete'
        });
      }

      // Delete image from GridFS
      try {
        await storageService.deleteImage(panchayat.letterheadConfig.letterheadImageId);
      } catch (e) {
        console.warn('Failed to delete letterhead image:', e);
      }

      // Clear letterhead config
      panchayat.letterheadConfig = {
        letterheadImageId: null,
        letterheadType: 'header',
        margins: { top: 1.5, bottom: 0.5, left: 0.5, right: 0.5 },
        imageTransform: { scale: 1, x: 0, y: 0 },
        originalFilename: null,
        mimeType: null,
        uploadedAt: null,
        uploadedBy: null
      };

      await panchayat.save();

      res.json({
        success: true,
        message: 'Letterhead deleted successfully'
      });
    } catch (error) {
      console.error('Error deleting letterhead:', error);
      res.status(500).json({
        success: false,
        message: 'Error deleting letterhead'
      });
    }
  }
);

/**
 * GET /:panchayatId/letterhead/base64
 * Get letterhead as base64 data URL for PDF generation
 */
router.get('/:panchayatId/letterhead/base64', auth.anyAuthenticated, async (req, res) => {
  try {
    const { panchayatId } = req.params;

    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    if (!panchayat.letterheadConfig?.letterheadImageId) {
      return res.status(404).json({
        success: false,
        message: 'No letterhead configured'
      });
    }

    // Get image stream and convert to base64
    const imageStream = await storageService.getImageStream(
      panchayat.letterheadConfig.letterheadImageId
    );

    const chunks = [];
    imageStream.on('data', (chunk) => chunks.push(chunk));
    imageStream.on('end', () => {
      const buffer = Buffer.concat(chunks);
      const base64 = buffer.toString('base64');
      const mimeType = panchayat.letterheadConfig.mimeType || 'image/png';
      const dataUrl = `data:${mimeType};base64,${base64}`;

      res.json({
        success: true,
        data: {
          base64: dataUrl,
          letterheadType: panchayat.letterheadConfig.letterheadType,
          margins: panchayat.letterheadConfig.margins,
          imageTransform: panchayat.letterheadConfig.imageTransform
        }
      });
    });
    imageStream.on('error', (err) => {
      console.error('Error streaming letterhead:', err);
      res.status(500).json({
        success: false,
        message: 'Error reading letterhead image'
      });
    });
  } catch (error) {
    console.error('Error fetching letterhead base64:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching letterhead'
    });
  }
});

/**
 * GET /:panchayatId/overview
 * Get panchayat overview data for settings page
 */
router.get('/:panchayatId/overview', auth.isOfficial, async (req, res) => {
  try {
    const { panchayatId } = req.params;

    const panchayat = await Panchayat.findById(panchayatId);
    if (!panchayat) {
      return res.status(404).json({
        success: false,
        message: 'Panchayat not found'
      });
    }

    // Get officials for this panchayat
    const officials = await Official.find({ panchayatId, isActive: true })
      .select('name username role linkedCitizenId')
      .populate('linkedCitizenId', 'name voterIdNumber');

    // Get wards first
    const wards = await Ward.find({ panchayatId }).select('name');

    // Get citizens count first for stats (using aggregation for efficiency)
    const totalCitizens = await User.countDocuments({ panchayatId });
    const registeredCitizens = await User.countDocuments({ panchayatId, isRegistered: true });
    const pendingCitizens = totalCitizens - registeredCitizens;

    // Get gender stats using aggregation (normalize gender values)
    const genderAgg = await User.aggregate([
      { $match: { panchayatId: new mongoose.Types.ObjectId(panchayatId) } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $regexMatch: { input: { $trim: { input: { $ifNull: ['$gender', ''] } } }, regex: /^male$/i } }, then: 'Male' },
                { case: { $regexMatch: { input: { $trim: { input: { $ifNull: ['$gender', ''] } } }, regex: /^female$/i } }, then: 'Female' },
                { case: { $regexMatch: { input: { $trim: { input: { $ifNull: ['$gender', ''] } } }, regex: /^other$/i } }, then: 'Other' }
              ],
              default: 'Unknown'
            }
          },
          count: { $sum: 1 }
        }
      }
    ]);
    const genderStats = genderAgg.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get ward stats using aggregation
    const wardAgg = await User.aggregate([
      { $match: { panchayatId: new mongoose.Types.ObjectId(panchayatId) } },
      {
        $lookup: {
          from: 'wards',
          localField: 'wardId',
          foreignField: '_id',
          as: 'ward'
        }
      },
      { $unwind: { path: '$ward', preserveNullAndEmptyArrays: true } },
      { $group: { _id: { $ifNull: ['$ward.name', 'Unassigned'] }, count: { $sum: 1 } } }
    ]);
    const wardStats = wardAgg.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get caste stats using aggregation
    const casteAgg = await User.aggregate([
      { $match: { panchayatId: new mongoose.Types.ObjectId(panchayatId) } },
      { $group: { _id: { $ifNull: ['$caste.category', 'Unknown'] }, count: { $sum: 1 } } }
    ]);
    const casteStats = casteAgg.reduce((acc, item) => {
      acc[item._id] = item.count;
      return acc;
    }, {});

    // Get all citizens with lean() for better performance
    const citizens = await User.find({ panchayatId })
      .select('name voterIdNumber gender mobileNumber isRegistered wardId caste address')
      .populate('wardId', 'name')
      .sort({ name: 1 })
      .lean();

    res.json({
      success: true,
      data: {
        panchayat: {
          _id: panchayat._id,
          name: panchayat.name,
          state: panchayat.state,
          district: panchayat.district,
          block: panchayat.block,
          lgdCode: panchayat.lgdCode,
          officialWhatsappNumber: panchayat.officialWhatsappNumber,
          supportEmail: panchayat.supportEmail,
          supportPhoneNumber: panchayat.supportPhoneNumber,
          supportContactPersonName: panchayat.supportContactPersonName,
          letterheadConfig: panchayat.letterheadConfig
        },
        officials,
        citizens,
        wards,
        stats: {
          totalCitizens,
          registeredCitizens,
          pendingCitizens,
          wardCount: wards.length,
          genderStats,
          wardStats,
          casteStats
        }
      }
    });
  } catch (error) {
    console.error('Error fetching panchayat overview:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching panchayat overview'
    });
  }
});

module.exports = router;