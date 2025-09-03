// node database/dbOps/import/importByPanchayatId.js backup_<PanchayatId1>_<PanchayatId2>_...

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
const backupBase = process.env.BACKUP_PATH || path.join(__dirname, '../../dbBackups');

async function importPanchayats(backupDirName) {
  const backupDir = path.join(backupBase, backupDirName);

  // --- Call validateBeforeImport.js first ---
  const validateScriptPath = path.join(__dirname, '../../utils/validateBeforeImport.js');
  console.log('Running validation before import...');
  execSync(`node "${validateScriptPath}" "${backupDir}"`, { stdio: 'inherit' });

  console.log('Validation passed, starting import...');

  await mongoose.connect(MONGODB_URI);

  async function importCollection(model, filename) {
    const filePath = path.join(backupDir, filename);
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`);
      return;
    }
    const data = JSON.parse(fs.readFileSync(filePath));
    if (!Array.isArray(data) || data.length === 0) return;

    // Special handling for officials
    if (model.modelName === 'Official') {
      for (const official of data) {
        if (official.role === 'ADMIN') {
          // Check if an ADMIN already exists
          const existingAdmin = await model.findOne({ role: 'ADMIN' });
          if (!existingAdmin) {
            await model.create(official);
            console.log('Inserted ADMIN official');
          } else {
            console.log('ADMIN already exists, skipping insert');
          }
        } else {
          await model.updateOne(
            { _id: official._id },
            { $set: official },
            { upsert: true }
          );
        }
      }
      console.log(`Imported/updated ${data.length} officials`);
    } else {
      await model.insertMany(data, { ordered: false });
      console.log(`Imported ${data.length} records into ${model.collection.name}`);
    }
  }

  await importCollection(Panchayat, 'panchayats.json');
  await importCollection(GramSabha, 'gramSabhas.json');
  await importCollection(User, 'users.json');
  await importCollection(Issue, 'issues.json');
  await importCollection(Ward, 'wards.json');
  await importCollection(RSVP, 'rsvps.json');
  await importCollection(SummaryRequest, 'summaryRequests.json');
  await importCollection(IssueSummary, 'issueSummaries.json');
  await importCollection(Official, 'officials.json');

  // GridFS
  const db = mongoose.connection.db;
  const filesPath = path.join(backupDir, 'fs.files.json');
  const chunksPath = path.join(backupDir, 'fs.chunks.json');
  if (fs.existsSync(filesPath)) {
    const files = JSON.parse(fs.readFileSync(filesPath));
    if (files.length) await db.collection('fs.files').insertMany(files);
    console.log(`Imported ${files.length} GridFS files`);
  }
  if (fs.existsSync(chunksPath)) {
    const chunks = JSON.parse(fs.readFileSync(chunksPath));
    if (chunks.length) await db.collection('fs.chunks').insertMany(chunks);
    console.log(`Imported ${chunks.length} GridFS chunks`);
  }

  console.log(`Import completed from ${backupDir}`);
  await mongoose.disconnect();
}

if (require.main === module) {
  const backupDirName = process.argv[2];
  if (!backupDirName) {
    console.error('Usage: node importByPanchayatId.js <BackupDirName>');
    process.exit(1);
  }
  importPanchayats(backupDirName);
}

module.exports = importPanchayats;