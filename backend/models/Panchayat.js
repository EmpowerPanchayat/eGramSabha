const mongoose = require('mongoose');
const MODEL_REFS = require('./modelRefs');

const panchayatSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    maxlength: 255,
    index: true,
  },
  state: {
    type: String,
    required: true,
    maxlength: 100,
    index: true,
  },
  district: {
    type: String,
    required: true,
    maxlength: 100,
    index: true,
  },
  block: {
    type: String,
    required: true, // Now mandatory
    maxlength: 100,
    index: true,
  },
  villages: {
    type: String,
  },
  geolocation: {
    type: String,
  },
  population: {
    type: Number,
  },
  language: {
    type: String,
    maxlength: 100,
  },
  sabhaCriteria: {
    type: Number,
  },
  officialWhatsappNumber: {
    type: String,
    maxlength: 10,
  },
  supportEmail: {
    type: String,
    maxlength: 255,
  },
  supportPhoneNumber: {
    type: String,
    maxlength: 15,
  },
  supportContactPersonName: {
    type: String,
    maxlength: 255,
  },
  letterheadConfig: {
    letterheadImageId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    letterheadType: {
      type: String,
      enum: ['header', 'background'],
      default: 'header'
    },
    margins: {
      top: { type: Number, default: 1.5 },    // inches
      bottom: { type: Number, default: 0.5 },
      left: { type: Number, default: 0.5 },
      right: { type: Number, default: 0.5 }
    },
    imageTransform: {
      scale: { type: Number, default: 1 },
      x: { type: Number, default: 0 },
      y: { type: Number, default: 0 }
    },
    originalFilename: { type: String, default: null },
    mimeType: { type: String, enum: ['image/png', 'image/jpeg', null], default: null },
    uploadedAt: { type: Date, default: null },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Official', default: null }
  },
  lgdCode: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
    maxlength: 10,
    index: true,
    validate: {
      validator: function (v) {
        // Only validate if lgdCode is provided (not null/undefined)
        return v == null || /^\d{1,10}$/.test(v);
      },
      message: "LGD Code must be a numeric string with maximum 10 digits",
    },
    state: {
        type: String,
        required: true,
        maxlength: 100
    },
    district: {
        type: String,
        required: true,
        maxlength: 100
    },
    villages: {
        type: String
    },
    block: {
        type: String,
        maxlength: 100
    },
    geolocation: {
        type: String
    },
    population: {
        type: Number
    },
    language: {
        type: String,
        maxlength: 100
    },
    sabhaCriteria: {
        type: Number
    },
    officialWhatsappNumber: {
        type: String,
        maxlength: 10
    },
    officials: {
        type: [{
            officialId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: MODEL_REFS.OFFICIAL
            },
            role: {
                type: String,
                enum: ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY', 'GUEST']
            },
            wardId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: MODEL_REFS.WARD,
                // Only required for WARD_MEMBER role
            }
        }],
        default: []
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
  },
});

// Compound indexes for cascading dropdown queries and performance
panchayatSchema.index({ state: 1 });
panchayatSchema.index({ state: 1, district: 1 });
panchayatSchema.index({ state: 1, district: 1, block: 1 });
panchayatSchema.index({ state: 1, district: 1, block: 1, name: 1 });

// Text search index for dropdown filtering
panchayatSchema.index(
  {
    state: "text",
    district: "text",
    block: "text",
    name: "text",
  },
  {
    weights: {
      name: 4,
      block: 3,
      district: 2,
      state: 1,
    },
    name: "location_text_index",
    default_language: "none", // disable stemming (safer for Indian languages)
    language_override: "dummyLang" // point to a non-existent field, so it never conflicts
  }
);

// Pre-save middleware to update timestamps
panchayatSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

// Pre-update middleware to update timestamps
panchayatSchema.pre(
  ["findOneAndUpdate", "updateOne", "updateMany"],
  function (next) {
    this.set({ updatedAt: new Date() });
    next();
  }
);

// Static method to find by LGD code
panchayatSchema.statics.findByLgdCode = function (lgdCode) {
  return this.findOne({ lgdCode: lgdCode });
};

// Static method to find by location path
panchayatSchema.statics.findByLocation = function (
  state,
  district,
  block,
  name
) {
  return this.findOne({
    state: new RegExp(`^${state}$`, "i"),
    district: new RegExp(`^${district}$`, "i"),
    block: new RegExp(`^${block}$`, "i"),
    name: new RegExp(`^${name}$`, "i"),
  });
};

// Static method to get location hierarchy for caching
panchayatSchema.statics.getLocationHierarchy = async function () {
  const pipeline = [
    {
      $group: {
        _id: {
          state: "$state",
          district: "$district",
          block: "$block",
        },
        panchayats: { $push: "$name" },
      },
    },
    {
      $group: {
        _id: {
          state: "$_id.state",
          district: "$_id.district",
        },
        blocks: {
          $push: {
            block: "$_id.block",
            panchayats: "$panchayats",
          },
        },
      },
    },
    {
      $group: {
        _id: "$_id.state",
        districts: {
          $push: {
            district: "$_id.district",
            blocks: "$blocks",
          },
        },
      },
    },
    {
      $project: {
        _id: 0,
        state: "$_id",
        districts: 1,
      },
    },
    {
      $sort: { state: 1 },
    },
  ];

  return await this.aggregate(pipeline);
};

// Static method to get distinct values for dropdowns
panchayatSchema.statics.getDistinctStates = function () {
  return this.distinct("state").then((states) => states.sort());
};

panchayatSchema.statics.getDistinctDistricts = function (state) {
  return this.distinct("district", {
    state: new RegExp(`^${state}$`, "i"),
  }).then((districts) => districts.sort());
};

panchayatSchema.statics.getDistinctBlocks = function (state, district) {
  return this.distinct("block", {
    state: new RegExp(`^${state}$`, "i"),
    district: new RegExp(`^${district}$`, "i"),
  }).then((blocks) => blocks.sort());
};

panchayatSchema.statics.getDistinctPanchayats = function (
  state,
  district,
  block
) {
  return this.distinct("name", {
    state: new RegExp(`^${state}$`, "i"),
    district: new RegExp(`^${district}$`, "i"),
    block: new RegExp(`^${block}$`, "i"),
  }).then((panchayats) => panchayats.sort());
};

const Panchayat = mongoose.model("Panchayat", panchayatSchema);

module.exports = Panchayat;
