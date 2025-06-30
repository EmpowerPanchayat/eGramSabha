const mongoose = require('mongoose');

uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration';

const Issue = mongoose.model('Issue', new mongoose.Schema({}, { strict: false }), 'issues');

async function migrateAllCreatedFor() {
  try {
    const issues = await Issue.find({ createdFor: { $exists: true } });

    console.log(`Found ${issues.length} issues to migrate.`);

    let migrated = 0;
    let skipped = 0;

    for (const issue of issues) {
      const original = issue.createdFor;
      let createdForId;

      if (original === 'Self') {
        createdForId = issue.creatorId;
      } else if (mongoose.Types.ObjectId.isValid(original)) {
        createdForId = new mongoose.Types.ObjectId(original);
      } else {
        console.warn(`Skipping ${issue._id} — invalid createdFor value:`, original);
        skipped++;
        continue;
      }

      await Issue.updateOne(
        { _id: issue._id },
        {
          $set: { createdForId },
          $unset: { createdFor: "" }
        }
      );
      console.log(`Migrated issue ${issue._id}`);
      migrated++;
    }

    console.log(`Migration complete. Migrated: ${migrated}, Skipped: ${skipped}`);
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    mongoose.disconnect();
  }
}

mongoose.connect(uri).then(() => {
  console.log('Connected to MongoDB');
  migrateAllCreatedFor();
});