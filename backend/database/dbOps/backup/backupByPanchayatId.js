// node database/dbOps/backup/backupByPanchayatId.js <PanchayatId1> <PanchayatId2>

const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
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

async function backupPanchayats(panchayatIds, backupDirName = 'backup_panchayats') {
  await mongoose.connect(MONGODB_URI);

  if (!Array.isArray(panchayatIds)) panchayatIds = [panchayatIds];

  const backupBase = process.env.BACKUP_PATH || path.join(__dirname, '../../dbBackups');
  if (!fs.existsSync(backupBase)) fs.mkdirSync(backupBase);

  const backupDir = path.join(backupBase, backupDirName);
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir);

  // --- Call exportSchema.js before backup ---
  const exportScriptPath = path.join(__dirname, '../../utils/exportSchema.js');
  console.log('Exporting schema before backup...');
  execSync(`node "${exportScriptPath}" "${backupDir}"`, { stdio: 'inherit' });

  // --- your existing backup code continues here ---
  const panchayats = await Panchayat.find({ _id: { $in: panchayatIds } });
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
  const wards = await Ward.find({ panchayatId: { $in: panchayatIds } });
  const rsvps = await RSVP.find({ gramSabhaId: { $in: gramSabhaIds }, userId: { $in: userIds } });
  const summaryRequests = await SummaryRequest.find({ panchayatId: { $in: panchayatIds } });
  const issueSummaries = await IssueSummary.find({ panchayatId: { $in: panchayatIds } });
  const officials = await Official.find({
    $or: [
      { panchayatId: { $in: panchayatIds } },
      { role: 'ADMIN' }
    ]
  });

  // GridFS
  const files = await mongoose.connection.db.collection('fs.files').find({ 'metadata.voterIdNumber': { $in: voterIdNumbers } }).toArray();
  const fileIds = files.map(f => f._id);
  const chunks = await mongoose.connection.db.collection('fs.chunks').find({ files_id: { $in: fileIds } }).toArray();

  // Save
  fs.writeFileSync(path.join(backupDir, 'panchayats.json'), JSON.stringify(panchayats, null, 2));
  fs.writeFileSync(path.join(backupDir, 'gramSabhas.json'), JSON.stringify(gramSabhas, null, 2));
  fs.writeFileSync(path.join(backupDir, 'users.json'), JSON.stringify(users, null, 2));
  fs.writeFileSync(path.join(backupDir, 'issues.json'), JSON.stringify(issues, null, 2));
  fs.writeFileSync(path.join(backupDir, 'wards.json'), JSON.stringify(wards, null, 2));
  fs.writeFileSync(path.join(backupDir, 'rsvps.json'), JSON.stringify(rsvps, null, 2));
  fs.writeFileSync(path.join(backupDir, 'summaryRequests.json'), JSON.stringify(summaryRequests, null, 2));
  fs.writeFileSync(path.join(backupDir, 'issueSummaries.json'), JSON.stringify(issueSummaries, null, 2));
  fs.writeFileSync(path.join(backupDir, 'officials.json'), JSON.stringify(officials, null, 2));
  fs.writeFileSync(path.join(backupDir, 'fs.files.json'), JSON.stringify(files, null, 2));
  fs.writeFileSync(path.join(backupDir, 'fs.chunks.json'), JSON.stringify(chunks, null, 2));

  console.log(`Backup completed for panchayatIds: ${panchayatIds.join(', ')} in ${backupDir}`);
  await mongoose.disconnect();
}

// CLI usage
if (require.main === module) {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.error('Usage: node backupByPanchayatId.js <PanchayatId1> [PanchayatId2 ...]');
    process.exit(1);
  }
  backupPanchayats(ids, 'backup_' + ids.join('_'));
}

module.exports = backupPanchayats;