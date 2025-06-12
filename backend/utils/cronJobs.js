const cron = require('node-cron');
const { updateAllMeetingStatuses } = require('./meetingUtils');

const initCronJobs = () => {
    // Run every 30 minutes
    cron.schedule('*/30 * * * *', async () => {
        console.log('Running auto-update meeting statuses check...');
        await updateAllMeetingStatuses();
    });
};

module.exports = { initCronJobs };
