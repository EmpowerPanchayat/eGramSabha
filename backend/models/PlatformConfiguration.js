const mongoose = require('mongoose');

const PlatformConfigurationSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  value: { type: mongoose.Schema.Types.Mixed, required: true }
}, {
  collection: 'platform_configurations',
  timestamps: true // adds both createdAt and updatedAt
});

module.exports = mongoose.model('PlatformConfiguration', PlatformConfigurationSchema);