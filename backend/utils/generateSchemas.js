const m2s = require('mongoose-to-swagger');
const User = require('../models/User');
const Panchayat = require('../models/Panchayat');
const Ward = require('../models/Ward');
const Issue = require('../models/Issue');
const Official = require('../models/Official');
const GramSabha = require('../models/gramSabha');

// Auto-generate Swagger schemas from Mongoose models
const generateSchemas = () => {
  return {
    User: m2s(User),
    Panchayat: m2s(Panchayat),
    Ward: m2s(Ward),
    Issue: m2s(Issue),
    Official: m2s(Official),
    GramSabha: m2s(GramSabha),
  };
};

module.exports = generateSchemas;