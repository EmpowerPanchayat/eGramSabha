import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    CircularProgress,
    List,
    ListItem,
    ListItemText,
    ListItemSecondaryAction,
    Divider
} from '@mui/material';
import { Event as EventIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import { fetchPastMeetings } from '../../api/gram-sabha';
import { useLanguage } from '../../utils/LanguageContext';
import GramSabhaDetails from './GramSabhaDetails';

const PastMeetingsList = ({ panchayatId, user }) => {
    const { strings } = useLanguage();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedMeeting, setSelectedMeeting] = useState(null);

    useEffect(() => {
        console.log('PastMeetingsList - panchayatId:', panchayatId);
        loadPastMeetings();
    }, [panchayatId]);

    const loadPastMeetings = async () => {
        if (!panchayatId) {
            console.log('PastMeetingsList - No panchayatId provided');
            return;
        }

        try {
            setLoading(true);
            setError('');
            console.log('PastMeetingsList - Fetching meetings for panchayat:', panchayatId);
            const data = await fetchPastMeetings(panchayatId);
            console.log('PastMeetingsList - Received meetings:', data);
            setMeetings(data);
        } catch (error) {
            console.error('PastMeetingsList - Error loading meetings:', error);
            setError(error.message || 'Failed to load past meetings');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" p={3}>
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 3 }}>
                {error}
            </Alert>
        );
    }

    if (meetings.length === 0) {
        return (
            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                <Typography variant="body1" color="text.secondary">
                    {strings.noPastMeetings}
                </Typography>
            </Paper>
        );
    }

    return (
        <Box>
            <Paper sx={{ overflow: 'hidden' }}>
                <Box sx={{ bgcolor: 'primary.main', color: 'white', p: 2 }}>
                    <Typography variant="h6">
                        {strings.pastMeetings}
                    </Typography>
                </Box>

                <List>
                    {meetings.map((meeting, index) => (
                        <React.Fragment key={meeting._id}>
                            <ListItem>
                                <ListItemText
                                    primary={meeting.title}
                                    secondary={
                                        <Box sx={{ mt: 1 }}>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <LocationIcon fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {meeting.location}
                                                </Typography>
                                            </Box>
                                            <Box display="flex" alignItems="center" gap={1}>
                                                <EventIcon fontSize="small" color="action" />
                                                <Typography variant="body2">
                                                    {new Date(meeting.dateTime).toLocaleString('en-IN', {
                                                        year: 'numeric',
                                                        month: 'long',
                                                        day: 'numeric',
                                                        hour: 'numeric',
                                                        minute: 'numeric',
                                                        hour12: true
                                                    })}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    }
                                />
                                <ListItemSecondaryAction>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() => setSelectedMeeting(meeting)}
                                    >
                                        {strings.viewDetails}
                                    </Button>
                                </ListItemSecondaryAction>
                            </ListItem>
                            {index < meetings.length - 1 && <Divider />}
                        </React.Fragment>
                    ))}
                </List>
            </Paper>

            {/* Meeting Details Dialog */}
            <Dialog
                open={!!selectedMeeting}
                onClose={() => setSelectedMeeting(null)}
                maxWidth="lg"
                fullWidth
            >
                <DialogTitle>{strings.meetingDetails}</DialogTitle>
                <DialogContent>
                    {selectedMeeting && (
                        <GramSabhaDetails meetingId={selectedMeeting._id} user={user} />
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSelectedMeeting(null)}>
                        {strings.close}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PastMeetingsList; 