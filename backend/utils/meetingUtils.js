const GramSabha = require('../models/gramSabha');

const autoUpdateMeetingStatus = async (meeting) => {
    const now = new Date();
    const meetingStart = new Date(meeting.dateTime);
    const meetingEnd = new Date(meetingStart.getTime() + (meeting.scheduledDurationHours * 60 * 60 * 1000));

    // If meeting is not concluded and current time is past the end time
    if ((meeting.status === 'IN_PROGRESS' || meeting.status === 'SCHEDULED') && now > meetingEnd) {
        meeting.status = 'CONCLUDED';
        await meeting.save();
    }

    return meeting;
};

const updateAllMeetingStatuses = async () => {
    try {
        // Find all non-concluded meetings
        const meetings = await GramSabha.find({
            status: { $in: ['SCHEDULED', 'IN_PROGRESS'] }
        });

        // Update each meeting's status
        await Promise.all(meetings.map(meeting => autoUpdateMeetingStatus(meeting)));
    } catch (error) {
        console.error('Error in updateAllMeetingStatuses:', error);
    }
};

module.exports = {
    autoUpdateMeetingStatus,
    updateAllMeetingStatuses
};
