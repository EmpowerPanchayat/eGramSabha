// node database/dbOps/delete/deleteByPanchayatId.js <PanchayatId1> <PanchayatId2> ...

const mongoose = require('mongoose');
const Panchayat = require('../../../models/Panchayat');
const GramSabha = require('../../../models/gramSabha');
const User = require('../../../models/User');
const Issue = require('../../../models/Issue');
const Ward = require('../../../models/Ward');
const RSVP = require('../../../models/rsvp');
const SummaryRequest = require('../../../models/SummaryRequest');
const IssueSummary = require('../../../models/IssueSummary');
const Official = require('../../../models/Official');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration';

async function deletePanchayats(panchayatIds) {
  await mongoose.connect(MONGODB_URI);

  if (!Array.isArray(panchayatIds)) panchayatIds = [panchayatIds];

  const gramSabhas = await GramSabha.find({ panchayatId: { $in: panchayatIds } });
  const gramSabhaIds = gramSabhas.map(gs => gs._id);
  const users = await User.find({ panchayatId: { $in: panchayatIds } });
  const userIds = users.map(u => u._id);
  const voterIdNumbers = users.map(u => u.voterIdNumber);
  const issues = await Issue.find({
    $or: [
      { creatorId: { $in: userIds } },
      { panchayatId: { $in: panchayatIds } }
    ]
  });
  const issueIds = issues.map(i => i._id);
  await RSVP.deleteMany({ gramSabhaId: { $in: gramSabhaIds }, userId: { $in: userIds } });
  await SummaryRequest.deleteMany({ panchayatId: { $in: panchayatIds } });
  await IssueSummary.deleteMany({ panchayatId: { $in: panchayatIds } });
  await Issue.deleteMany({ _id: { $in: issueIds } });
  await User.deleteMany({ panchayatId: { $in: panchayatIds } });
  await Ward.deleteMany({ panchayatId: { $in: panchayatIds } });
  await GramSabha.deleteMany({ panchayatId: { $in: panchayatIds } });
  await Official.deleteMany({ panchayatId: { $in: panchayatIds } });
  await Panchayat.deleteMany({ _id: { $in: panchayatIds } });

  // GridFS
  const db = mongoose.connection.db;
  const fileIds = (await db.collection('fs.files').find({ 'metadata.voterIdNumber': { $in: voterIdNumbers } }).toArray()).map(f => f._id);
  await db.collection('fs.chunks').deleteMany({ files_id: { $in: fileIds } });
  await db.collection('fs.files').deleteMany({ _id: { $in: fileIds } });

  console.log(`Deleted all data for panchayatIds: ${panchayatIds.join(', ')}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.error('Usage: node delete.js <PanchayatId1> [PanchayatId2 ...]');
    process.exit(1);
  }
  deletePanchayats(ids);
}

module.exports = deletePanchayats;