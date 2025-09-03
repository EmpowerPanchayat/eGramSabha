const mongoose = require('mongoose');
const Official = require('../../models/Official');
const PlatformConfiguration = require('../../models/PlatformConfiguration');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration');

  // Seed default admin if not exists
  const adminExists = await Official.findOne({ username: 'admin' });
  if (!adminExists) {
    const admin = new Official({
      username: 'admin',
      email: 'admin@example.com',
      password: '', //Set Password here before running the script
      name: 'System Administrator',
      role: 'ADMIN',
      phone: '1234567890',
      isActive: true
    });
    await admin.save();
    console.log('Default admin user created.');
  } else {
    console.log('Admin user already exists.');
  }

  // Seed platform configuration if not exists
  const configExists = await PlatformConfiguration.findOne({});
  if (!configExists) {
    await PlatformConfiguration.create({
      settings: {
        camera: {
          liveliness: {
            faceRegistration: true,
            citizenLogin: true,
            attendance: true
          },
          blink_count: {
            faceRegistration: 4,
            citizenLogin: 4,
            attendance: 4
          },
          movement_count: {
            faceRegistration: 5,
            citizenLogin: 5,
            attendance: 5
          }
        }
      }
    });
    console.log('Default platform configuration seeded.');
  } else {
    console.log('Platform configuration already exists.');
  }

  await mongoose.disconnect();
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});