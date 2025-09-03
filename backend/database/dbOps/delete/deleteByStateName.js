// node database\dbOps\delete\deleteByStateName.js Haryana Punjab

const mongoose = require('mongoose');
const Panchayat = require('../../../models/Panchayat');
const deletePanchayats = require('./deleteByPanchayatId');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration';

async function deleteState(states) {
  await mongoose.connect(MONGODB_URI);
  if (!Array.isArray(states)) states = [states];
  const panchayats = await Panchayat.find({ state: { $in: states } });
  const panchayatIds = panchayats.map(p => p._id.toString());
  await mongoose.disconnect();
  await deletePanchayats(panchayatIds);
}

const states = process.argv.slice(2);
if (!states.length) {
  console.error('Usage: node deleteStateData.js <StateName1> [StateName2 ...]');
  process.exit(1);
}
deleteState(states);