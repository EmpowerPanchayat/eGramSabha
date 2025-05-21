const mongoose = require('mongoose');
const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');
const User = require('../models/User');

// MongoDB connection
const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('Connected to MongoDB');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

// Bulk update caste data
const bulkUpdateCaste = async (csvFilePath, panchayatId) => {
  if (!fs.existsSync(csvFilePath)) {
    console.error('CSV file not found:', csvFilePath);
    process.exit(1);
  }

  const updates = [];
  fs.createReadStream(csvFilePath)
    .pipe(csv())
    .on('data', (row) => {
      const voterIdNumber = row['Voter id number']?.trim();
      const casteName = row['Caste']?.trim();
      const casteCategory = row['Caste Category']?.trim();

      if (voterIdNumber && (casteName || casteCategory)) {
        updates.push({ voterIdNumber, caste: { name: casteName || '', category: casteCategory || '' } });
      }
    })
    .on('end', async () => {
      console.log(`Parsed ${updates.length} rows from CSV`);

      try {
        for (const { voterIdNumber, caste } of updates) {
          const voterId = voterIdNumber.replaceAll("/", "-");
          const user = await User.findOneAndUpdate(
            {
              voterIdNumber: voterId,
              panchayatId: new mongoose.Types.ObjectId(panchayatId)
            },
            { $set: { caste } },
            { new: true }
          );

          if (user) {
            console.log(`Updated caste for Voter ID: ${voterId} to`, caste);
          } else {
            console.warn(`No user found for Voter ID: ${voterId} in Panchayat ID: ${panchayatId}`);
          }
        }

        console.log('Bulk caste update completed');
        process.exit(0);
      } catch (error) {
        console.error('Error updating caste data:', error);
        process.exit(1);
      }
    });
};

// Main function
const main = async () => {
  const csvFilePath = process.argv[2];
  const panchayatId = process.argv[3];

  if (!csvFilePath || !panchayatId) {
    console.error('Usage: node bulkUpdateCaste.js <csvFilePath> <panchayatId>');
    process.exit(1);
  }

  await connectToDatabase();
  await bulkUpdateCaste(csvFilePath, panchayatId);
};

main();
