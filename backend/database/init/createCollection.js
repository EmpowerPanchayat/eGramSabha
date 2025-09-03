const mongoose = require('mongoose');
const User = require('../../models/User');
const Panchayat = require('../../models/Panchayat');
const Ward = require('../../models/Ward');
const Issue = require('../../models/Issue');
const Official = require('../../models/Official');
const GramSabha = require('../../models/gramSabha');
const { createDefaultRoles } = require('../../models/Role');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration');

  // Ensure indexes for all models
  await Promise.all([
    User.init(),
    Panchayat.init(),
    Ward.init(),
    Issue.init(),
    Official.init(),
    GramSabha.init(),
  ]);

  // Create default roles if not present
  await createDefaultRoles();

  console.log('Collections and indexes ensured, default roles created.');
  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});