// File: backend/routes/panchayatRoutes.js (Enhanced with LGD and location lookup)
const express = require("express");
const router = express.Router();
const Panchayat = require("../models/Panchayat");
const User = require("../models/User");
const Ward = require("../models/Ward");
const Issue = require("../models/Issue");

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

module.exports = router;
module.exports = router;