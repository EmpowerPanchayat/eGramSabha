const mongoose = require('mongoose');
const GramSabha = require('../../models/gramSabha');

async function migrate() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/voter_registration');
    console.log('Connected to MongoDB');

    const meetings = await GramSabha.find({ 'agenda.0': { $exists: true } });

    for (const meeting of meetings) {
      let modified = false;

      const updatedAgenda = (meeting.agenda || []).map(item => {
        const updatedItem = {
          ...item.toObject(), // convert Mongoose object to plain
          title: item.title || {},
          description: item.description || {},
          createdByType: 'SYSTEM',
        };

        // Optional: If you have logic to detect user-created ones, apply it here
        // e.g. if (someCondition) { createdByType: 'USER', createdByUserId: ... }

        modified = true;
        return updatedItem;
      });

      if (modified) {
        meeting.agenda = updatedAgenda;
        await meeting.save();
        console.log(`✅ Updated agenda for meeting ID ${meeting._id}`);
      }
    }

    console.log('Migration complete');
    mongoose.disconnect();
  } catch (err) {
    console.error('❌ Migration error:', err);
    process.exit(1);
  }
}

migrate();
