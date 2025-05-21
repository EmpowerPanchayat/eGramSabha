const express = require('express');
const router = express.Router();
const PlatformConfiguration = require('../models/PlatformConfiguration');

// Get all configs
router.get('/', async (req, res) => {
  const configs = await PlatformConfiguration.find();
  res.json(configs);
});

// Get a config by key
router.get('/:key', async (req, res) => {
  const config = await PlatformConfiguration.findOne({ key: req.params.key });
  if (!config) return res.status(404).json({ error: 'Not found' });
  res.json(config);
});

// Create a new config
router.post('/', async (req, res) => {
  try {
    const config = new PlatformConfiguration(req.body);
    await config.save();
    res.status(201).json(config);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Update a config by key
router.put('/:key', async (req, res) => {
  const config = await PlatformConfiguration.findOneAndUpdate(
    { key: req.params.key },
    { value: req.body.value },
    { new: true }
  );
  if (!config) return res.status(404).json({ error: 'Not found' });
  res.json(config);
});

// Delete a config by key
router.delete('/:key', async (req, res) => {
  const result = await PlatformConfiguration.deleteOne({ key: req.params.key });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;