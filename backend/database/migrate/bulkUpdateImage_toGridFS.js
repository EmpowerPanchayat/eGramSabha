const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const storageService = require('../../storage/storageService');
const User = require('../../models/User');

// MongoDB connection
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration');
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function migrate() {
  await connectToDatabase();
  const db = mongoose.connection.db;

  // 1. Gather all users
  const allUsers = await User.find({}).lean();
  const totalUsers = allUsers.length;

  // 2. Registered users
  const registeredUsers = allUsers.filter(u => u.isRegistered);
  const totalRegisteredUsers = registeredUsers.length;

  // 3. Registered users with faceImagePath
  const registeredWithFaceImagePath = registeredUsers.filter(u => u.faceImagePath);
  console.log(registeredWithFaceImagePath);
  const totalRegisteredWithFaceImagePath = registeredWithFaceImagePath.length;

  // 4. Registered users with faceImagePath but folder path does not exist
  const registeredWithFaceImagePathButNoFolder = [];
  // 5. Registered users but no folder path
  const registeredButNoFaceImagePath = [];
  // 6. Registered users with faceImagePath and folder path exists (the correct ones)
  const correctUsers = [];

  for (const user of registeredWithFaceImagePath) {
    // Extract panchayatId and voterIdNumber
    const panchayatId = user.panchayatId?.toString();
    const voterIdNumber = user.voterIdNumber;
    // Compose expected folder and file path
    const facesDir = path.join(UPLOADS_DIR, panchayatId, 'faces');
    let fileExists = false;
    let filePath = '';
    if (fs.existsSync(facesDir)) {
      // Try to find the file by voterIdNumber prefix
      const files = fs.readdirSync(facesDir);
      const found = files.find(f => f.startsWith(voterIdNumber + '_'));
      if (found) {
        fileExists = true;
        filePath = path.join(facesDir, found);
      }
    }
    if (fileExists) {
      correctUsers.push({ user, filePath });
    } else {
      registeredWithFaceImagePathButNoFolder.push(user);
    }
  }

  // Registered users but no folder path (no imagePath at all)
  for (const user of registeredUsers) {
    if (!(user.faceImagePath)) {
      registeredButNoFaceImagePath.push(user);
    }
  }

  // Write summary report
  const report = {
    totalUsers,
    totalRegisteredUsers,
    totalRegisteredWithFaceImagePath,
    registeredButNoFaceImagePath: registeredButNoFaceImagePath.length,
    registeredWithFaceImagePathButNoFolder: registeredWithFaceImagePathButNoFolder.length,
    correctUsers: correctUsers.length,
    correctUsersList: correctUsers.map(({ user, filePath }) => ({
      _id: user._id,
      name: user.name,
      voterIdNumber: user.voterIdNumber,
      panchayatId: user.panchayatId,
      filePath
    }))
  };

  fs.writeFileSync(
    path.join(__dirname, 'migration_report.json'),
    JSON.stringify(report, null, 2)
  );
  console.log('Migration report written to migration_report.json');

  // Now migrate only the correct users (chunked for safety)
  const chunkSize = 50;
  for (let i = 0; i < correctUsers.length; i += chunkSize) {
    const chunk = correctUsers.slice(i, i + chunkSize);
    for (const { user, filePath } of chunk) {
      try {
        if (!user.faceImageId) {
          const buffer = fs.readFileSync(filePath);
          const imageId = await storageService.uploadImage(buffer, path.basename(filePath), {
            userId: user._id,
            voterIdNumber: user.voterIdNumber,
            panchayatId: user.panchayatId,
            type: 'profile'
          });
          await User.updateOne({ _id: user._id }, { faceImageId: imageId });
          console.log(`Migrated face image for user ${user._id} (${user.voterIdNumber})`);
        } else {
          console.log(`Skipped user ${user._id} (${user.voterIdNumber}) - already has faceImageId`);
        }
      } catch (err) {
        console.error(`Failed to migrate for user ${user._id}:`, err);
      }
    }
    // Optional: wait between chunks to avoid overloading
    await new Promise(res => setTimeout(res, 500));
  }

  await mongoose.disconnect();
  console.log('Migration complete. Disconnected from MongoDB.');
}

migrate().catch(err => {
  console.error(err);
  process.exit(1);
});