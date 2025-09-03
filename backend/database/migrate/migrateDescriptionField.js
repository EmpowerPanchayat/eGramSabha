const mongoose = require('mongoose');
const Issue = require('../../models/Issue');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/voter_registration', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

async function migrateDescriptionField() {
    try {
        console.log('Starting migration to fix transcription.description field...');
        
        // Find all issues where transcription.description is null
        const nullDescriptionIssues = await Issue.find({
            'transcription.description': null
        });
        
        console.log(`Found ${nullDescriptionIssues.length} issues with null transcription.description`);
        
        if (nullDescriptionIssues.length === 0) {
            console.log('No issues need migration. All transcription.description fields are already objects.');
            return;
        }
        
        // Update all issues with null transcription.description to have an empty object
        const result = await Issue.updateMany(
            { 'transcription.description': null },
            { $set: { 'transcription.description': {} } }
        );
        
        console.log(`Migration completed successfully!`);
        console.log(`Updated ${result.modifiedCount} issues`);
        
        // Verify the migration
        const remainingNullIssues = await Issue.find({
            'transcription.description': null
        });
        
        console.log(`Remaining issues with null transcription.description: ${remainingNullIssues.length}`);
        
    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        mongoose.connection.close();
        console.log('Database connection closed');
    }
}

// Run the migration
migrateDescriptionField(); 