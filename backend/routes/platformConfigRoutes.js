const express = require("express");
const router = express.Router();
const PlatformConfiguration = require("../models/PlatformConfiguration");
const defaultSettings = require("../defaults/defaultPlatformSettings");

// Utility: get nested value by dot notation
function getNested(obj, path) {
  return path.split(".").reduce((o, k) => (o || {})[k], obj);
}

// Utility: set nested value by dot notation (update all nested leaf keys if target is object)
function setNested(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  const lastKey = keys[keys.length - 1];
  // If the target is an object, update all leaf keys recursively
  if (typeof current[lastKey] === "object" && current[lastKey] !== null) {
    function updateAllLeaves(o) {
      if (typeof o !== "object" || o === null) return value;
      for (const k of Object.keys(o)) {
        o[k] = updateAllLeaves(o[k]);
      }
      return o;
    }
    updateAllLeaves(current[lastKey]);
  } else {
    // Otherwise, just set the value
    current[lastKey] = value;
  }
}

// Utility: recursively set all subkeys under a given path
function setAllNested(obj, path, value) {
  const keys = path.split(".");
  let current = obj;
  for (let i = 0; i < keys.length; i++) {
    if (!current[keys[i]]) current[keys[i]] = {};
    current = current[keys[i]];
  }
  function recurseSetAll(o) {
    if (typeof o !== "object" || o === null) return value;
    for (const k of Object.keys(o)) {
      o[k] = recurseSetAll(o[k]);
    }
    return o;
  }
  recurseSetAll(current);
}

// Ensure config exists with defaults
async function ensureConfig() {
  let config = await PlatformConfiguration.findOne();
  if (!config) {
    config = await PlatformConfiguration.create({ settings: defaultSettings });
  }
  return config;
}

// Get the settings.json-style config
router.get("/", async (req, res) => {
  const config = await ensureConfig();
  res.json(config.settings);
});

// Get a nested config value by dot notation key
router.get("/:key", async (req, res) => {
  const config = await ensureConfig();
  const value = getNested(config.settings, req.params.key);
  if (typeof value === "undefined")
    return res.status(404).json({ error: "Not found" });
  res.json({ value });
});

// Set a nested config value by dot notation key (optionally recursively)
router.put("/:key", async (req, res) => {
  let config = await ensureConfig();
  const { value } = req.body;

  try {
    setNested(config.settings, req.params.key, value);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }

  config.markModified("settings");
  await config.save();
  res.json({ success: true, settings: config.settings });
});

// Delete a nested config value by dot notation key
router.delete("/:key", async (req, res) => {
  let config = await ensureConfig();
  const keys = req.params.key.split(".");
  let current = config.settings;
  for (let i = 0; i < keys.length - 1; i++) {
    if (!current[keys[i]]) return res.status(404).json({ error: "Not found" });
    current = current[keys[i]];
  }
  delete current[keys[keys.length - 1]];
  config.markModified("settings");
  await config.save();
  res.json({ success: true });
});

module.exports = router;
