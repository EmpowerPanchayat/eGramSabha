const express = require("express");
const router = express.Router();
const Panchayat = require("../models/Panchayat");

/**
 * Get complete location hierarchy for client-side caching
 * Returns optimized structure for cascading dropdowns
 */
router.get("/hierarchy", async (req, res) => {
  try {
    const hierarchy = await Panchayat.getLocationHierarchy();

    // Transform to client-friendly format
    const clientHierarchy = {
      states: [],
      districts: {},
      blocks: {},
      panchayats: {},
    };

    hierarchy.forEach((stateData) => {
      const { state, districts } = stateData;

      // Add state to states array
      clientHierarchy.states.push(state);

      // Process districts for this state
      clientHierarchy.districts[state] = [];

      districts.forEach((districtData) => {
        const { district, blocks } = districtData;

        // Add district to state's districts
        clientHierarchy.districts[state].push(district);

        // Process blocks for this state+district
        const stateDistrictKey = `${state}_${district}`;
        clientHierarchy.blocks[stateDistrictKey] = [];

        blocks.forEach((blockData) => {
          const { block, panchayats } = blockData;

          // Add block to state+district's blocks
          clientHierarchy.blocks[stateDistrictKey].push(block);

          // Process panchayats for this state+district+block
          const stateDistrictBlockKey = `${state}_${district}_${block}`;
          clientHierarchy.panchayats[stateDistrictBlockKey] = panchayats.sort();
        });

        // Sort blocks
        clientHierarchy.blocks[stateDistrictKey].sort();
      });

      // Sort districts
      clientHierarchy.districts[state].sort();
    });

    // Sort states
    clientHierarchy.states.sort();

    res.json({
      success: true,
      data: clientHierarchy,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching location hierarchy:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching location hierarchy",
      error: error.message,
    });
  }
});

/**
 * Get all states
 */
router.get("/states", async (req, res) => {
  try {
    const { search } = req.query;
    let states = await Panchayat.getDistinctStates();

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      states = states.filter((state) => searchRegex.test(state));
    }

    res.json({
      success: true,
      data: states,
    });
  } catch (error) {
    console.error("Error fetching states:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching states",
      error: error.message,
    });
  }
});

/**
 * Get districts for a specific state
 */
router.get("/districts/:state", async (req, res) => {
  try {
    const { state } = req.params;
    const { search } = req.query;

    if (!state) {
      return res.status(400).json({
        success: false,
        message: "State parameter is required",
      });
    }

    let districts = await Panchayat.getDistinctDistricts(state);

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      districts = districts.filter((district) => searchRegex.test(district));
    }

    res.json({
      success: true,
      data: districts,
      state: state,
    });
  } catch (error) {
    console.error("Error fetching districts:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching districts",
      error: error.message,
    });
  }
});

/**
 * Get blocks for a specific state and district
 */
router.get("/blocks/:state/:district", async (req, res) => {
  try {
    const { state, district } = req.params;
    const { search } = req.query;

    if (!state || !district) {
      return res.status(400).json({
        success: false,
        message: "State and district parameters are required",
      });
    }

    let blocks = await Panchayat.getDistinctBlocks(state, district);

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      blocks = blocks.filter((block) => searchRegex.test(block));
    }

    res.json({
      success: true,
      data: blocks,
      state: state,
      district: district,
    });
  } catch (error) {
    console.error("Error fetching blocks:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching blocks",
      error: error.message,
    });
  }
});

/**
 * Get panchayats for a specific state, district, and block
 */
router.get("/panchayats/:state/:district/:block", async (req, res) => {
  try {
    const { state, district, block } = req.params;
    const { search } = req.query;

    if (!state || !district || !block) {
      return res.status(400).json({
        success: false,
        message: "State, district, and block parameters are required",
      });
    }

    let panchayats = await Panchayat.getDistinctPanchayats(
      state,
      district,
      block
    );

    // Apply search filter if provided
    if (search) {
      const searchRegex = new RegExp(search, "i");
      panchayats = panchayats.filter((panchayat) =>
        searchRegex.test(panchayat)
      );
    }

    res.json({
      success: true,
      data: panchayats,
      state: state,
      district: district,
      block: block,
    });
  } catch (error) {
    console.error("Error fetching panchayats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching panchayats",
      error: error.message,
    });
  }
});

/**
 * Validate if a location exists (for form validation)
 */
router.post("/validate", async (req, res) => {
  try {
    const { state, district, block, panchayat } = req.body;

    // Build query based on provided fields
    const query = {};
    if (state) query.state = new RegExp(`^${state}$`, "i");
    if (district) query.district = new RegExp(`^${district}$`, "i");
    if (block) query.block = new RegExp(`^${block}$`, "i");
    if (panchayat) query.name = new RegExp(`^${panchayat}$`, "i");

    const exists = await Panchayat.findOne(query);

    res.json({
      success: true,
      exists: !!exists,
      query: req.body,
    });
  } catch (error) {
    console.error("Error validating location:", error);
    res.status(500).json({
      success: false,
      message: "Error validating location",
      error: error.message,
    });
  }
});

/**
 * Get suggestions for auto-complete (fuzzy search)
 */
router.get("/suggest", async (req, res) => {
  try {
    const { term, type, state, district, block } = req.query;

    if (!term || !type) {
      return res.status(400).json({
        success: false,
        message: "Term and type parameters are required",
      });
    }

    let suggestions = [];

    switch (type) {
      case "state":
        suggestions = await Panchayat.getDistinctStates();
        break;
      case "district":
        if (!state) {
          return res.status(400).json({
            success: false,
            message: "State parameter is required for district suggestions",
          });
        }
        suggestions = await Panchayat.getDistinctDistricts(state);
        break;
      case "block":
        if (!state || !district) {
          return res.status(400).json({
            success: false,
            message:
              "State and district parameters are required for block suggestions",
          });
        }
        suggestions = await Panchayat.getDistinctBlocks(state, district);
        break;
      case "panchayat":
        if (!state || !district || !block) {
          return res.status(400).json({
            success: false,
            message:
              "State, district, and block parameters are required for panchayat suggestions",
          });
        }
        suggestions = await Panchayat.getDistinctPanchayats(
          state,
          district,
          block
        );
        break;
      default:
        return res.status(400).json({
          success: false,
          message:
            "Invalid type. Must be one of: state, district, block, panchayat",
        });
    }

    // Apply fuzzy search
    const searchRegex = new RegExp(term, "i");
    const filteredSuggestions = suggestions
      .filter((item) => searchRegex.test(item))
      .slice(0, 10); // Limit to 10 suggestions

    res.json({
      success: true,
      data: filteredSuggestions,
      term: term,
      type: type,
    });
  } catch (error) {
    console.error("Error getting suggestions:", error);
    res.status(500).json({
      success: false,
      message: "Error getting suggestions",
      error: error.message,
    });
  }
});

/**
 * Get location statistics (for admin purposes)
 */
router.get("/stats", async (req, res) => {
  try {
    const pipeline = [
      {
        $group: {
          _id: null,
          totalPanchayats: { $sum: 1 },
          totalStates: { $addToSet: "$state" },
          totalDistricts: {
            $addToSet: { state: "$state", district: "$district" },
          },
          totalBlocks: {
            $addToSet: {
              state: "$state",
              district: "$district",
              block: "$block",
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          totalPanchayats: 1,
          totalStates: { $size: "$totalStates" },
          totalDistricts: { $size: "$totalDistricts" },
          totalBlocks: { $size: "$totalBlocks" },
        },
      },
    ];

    const stats = await Panchayat.aggregate(pipeline);

    res.json({
      success: true,
      data: stats[0] || {
        totalPanchayats: 0,
        totalStates: 0,
        totalDistricts: 0,
        totalBlocks: 0,
      },
    });
  } catch (error) {
    console.error("Error fetching location stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching location statistics",
      error: error.message,
    });
  }
});

module.exports = router;
