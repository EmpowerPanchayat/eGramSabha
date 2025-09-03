const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const storageService = require('../../storage/storageService');
const User = require('../../models/User');

const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

async function exportImages() {
  await connectToDatabase();

  const users = await User.find({
    $or: [
      { faceImageId: { $exists: true, $ne: null } },
      { thumbnailImageId: { $exists: true, $ne: null } }
    ]
  }).lean();

  for (const user of users) {
    try {
      const panchayatId = user.panchayatId?.toString();
      const voterIdNumber = user.voterIdNumber;
      const facesDir = path.join(UPLOADS_DIR, panchayatId, 'faces');
      if (!fs.existsSync(facesDir)) {
        fs.mkdirSync(facesDir, { recursive: true });
      }

      // Export full image if available
      if (user.faceImageId) {
        const fullFilename = `${voterIdNumber}_${user.faceImageId}.jpg`;
        const fullFilePath = path.join(facesDir, fullFilename);
        try {
          const imageStream = await storageService.getImageStream(user.faceImageId);
          const writeStream = fs.createWriteStream(fullFilePath);
          await new Promise((resolve) => {
            imageStream.pipe(writeStream)
              .on('finish', resolve);
            imageStream.on('error', (err) => {
              console.error(`File not found (full image) for user ${user._id}:`, err.message);
              resolve(); // Continue even if file not found
            });
            writeStream.on('error', (err) => {
              console.error(`Write error (full image) for user ${user._id}:`, err.message);
              resolve();
            });
          });
          console.log(`Exported full image for user ${user._id} (${voterIdNumber})`);
        } catch (err) {
          console.error(`Failed to export full image for user ${user._id}:`, err);
        }
      }

      // Export thumbnail if available
      if (user.thumbnailImageId) {
        const thumbFilename = `${voterIdNumber}_thumb_${user.thumbnailImageId}.jpg`;
        const thumbFilePath = path.join(facesDir, thumbFilename);
        try {
          const thumbStream = await storageService.getImageStream(user.thumbnailImageId);
          const thumbWriteStream = fs.createWriteStream(thumbFilePath);
          await new Promise((resolve) => {
            thumbStream.pipe(thumbWriteStream)
              .on('finish', resolve);
            thumbStream.on('error', (err) => {
              console.error(`File not found (thumbnail) for user ${user._id}:`, err.message);
              resolve();
            });
            thumbWriteStream.on('error', (err) => {
              console.error(`Write error (thumbnail) for user ${user._id}:`, err.message);
              resolve();
            });
          });
          console.log(`Exported thumbnail for user ${user._id} (${voterIdNumber})`);
        } catch (err) {
          console.error(`Failed to export thumbnail for user ${user._id}:`, err);
        }
      }

    } catch (err) {
      console.error(`Failed to export images for user ${user._id}:`, err);
    }
  }

  await mongoose.disconnect();
  console.log('Export complete. Disconnected from MongoDB.');
}

exportImages().catch(err => {
  console.error(err);
  process.exit(1);
});