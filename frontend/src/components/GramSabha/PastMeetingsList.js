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
    Divider,
    Card,
    CardHeader,
    CardContent
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
        loadPastMeetings();
    }, [panchayatId]);

    const loadPastMeetings = async () => {
        if (!panchayatId) {
            return;
        }

        try {
            setLoading(true);
            setError('');
            const data = await fetchPastMeetings(panchayatId);
            setMeetings(data);
        } catch (error) {
            setError(error.message || 'Failed to load past meetings');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Paper elevation={0} sx={{ p: 3, display: 'flex', justifyContent: 'center' }}>
                <CircularProgress size={40} />
            </Paper>
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
            <Paper
                elevation={1}
                sx={{
                    p: 3,
                    textAlign: 'center',
                    bgcolor: 'background.default',
                    borderRadius: 2,
                    mb: 3
                }}
            >
                <Typography variant="body1" color="text.secondary">
                    {strings.noPastMeetings}
                </Typography>
            </Paper>
        );
    }

    return (
        <Box sx={{ mb: 3 }}>
            <Card
                elevation={1}
                sx={{
                    borderRadius: 2,
                    overflow: 'hidden',
                    border: '1px solid',
                    borderColor: 'divider'
                }}
            >
                <CardHeader
                    sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        py: 1,
                        '& .MuiCardHeader-title': {
                            fontSize: '1rem',
                            fontWeight: 'bold'
                        }
                    }}
                    title={strings.pastMeetings}
                    disableTypography
                />

                <CardContent sx={{ p: 0 }}>
                    <List>
                    {meetings.map((meeting, index) => {
                        const attended = meeting.attendances?.some(
                        (att) => att.userId?.toString() === user.id
                        );

                        return (
                            <React.Fragment key={meeting._id}>
                                <ListItem>
                                    <ListItemText
                                        primary={
                                            <Typography
                                                variant="h6"
                                                fontWeight="bold"
                                                color="text.primary"
                                                gutterBottom
                                            >
                                                {meeting.title}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box sx={{ mt: 1 }}>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <LocationIcon fontSize="small" color="primary" />
                                                    <Typography variant="body1" color="text.secondary">
                                                        {meeting.location}
                                                    </Typography>
                                                </Box>
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <EventIcon fontSize="small" color="primary" />
                                                    <Typography variant="body1" color="text.secondary">
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
                                                {/* Attendance status */}
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography
                                                        variant="body2"
                                                        color={attended ? "success.main" : "error.main"}
                                                    >
                                                        {attended
                                                        ? strings.attended
                                                        : strings.notAttended}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        }
                                    />
                                    <ListItemSecondaryAction>
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            onClick={() => setSelectedMeeting(meeting)}
                                            sx={{ px: 3 }}
                                        >
                                            {strings.viewDetails}
                                        </Button>
                                    </ListItemSecondaryAction>
                                </ListItem>
                                {index < meetings.length - 1 && <Divider />}
                            </React.Fragment>
                        );
                    })}
                    </List>
                </CardContent>
            </Card>

            {/* Meeting Details Dialog */}
            <Dialog
                open={!!selectedMeeting}
                onClose={() => setSelectedMeeting(null)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 2 }
                }}
            >
                <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white' }}>
                    {strings.meetingDetails}
                </DialogTitle>
                <DialogContent sx={{ pt: 3 }}>
                    {selectedMeeting && (
                        <GramSabhaDetails meetingId={selectedMeeting._id} user={user} />
                    )}
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setSelectedMeeting(null)}
                        variant="contained"
                    >
                        {strings.close}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PastMeetingsList; 