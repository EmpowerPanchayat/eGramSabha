const mongoose = require("mongoose");

const PlatformConfigurationSchema = new mongoose.Schema(
  {
    settings: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    collection: "platform_configurations",
    timestamps: true,
  }
);

module.exports = mongoose.model(
  "PlatformConfiguration",
  PlatformConfigurationSchema
);
