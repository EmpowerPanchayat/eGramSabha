//node database/dbOps/backup/backupByStateName.js Haryana Punjab

const mongoose = require('mongoose');
const Panchayat = require('../../../models/Panchayat');
const backupPanchayats = require('./backupByPanchayatId');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration';

async function backupState(states) {
  await mongoose.connect(MONGODB_URI);
  if (!Array.isArray(states)) states = [states];
  const panchayats = await Panchayat.find({ state: { $in: states } });
  const panchayatIds = panchayats.map(p => p._id.toString());
  await mongoose.disconnect();
  await backupPanchayats(panchayatIds, 'backup_' + states.join('_'));
}

const states = process.argv.slice(2);
if (!states.length) {
  console.error('Usage: node backupStateData.js <StateName1> [StateName2 ...]');
  process.exit(1);
}
backupState(states);