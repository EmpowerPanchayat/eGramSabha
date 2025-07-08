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
    Stack,
    Divider,
    Card,
    CardHeader,
    CardContent,
    CardActions,
    Menu,
    MenuItem,
    IconButton
} from '@mui/material';
import {
    Event as EventIcon,
    LocationOn as LocationIcon,
    Add as AddIcon,
    Visibility as ViewIcon,
    CheckCircle as CheckCircleIcon,
    Cancel as CancelIcon,
    Help as HelpIcon,
    MoreVert as MoreVertIcon
} from '@mui/icons-material';
import { fetchUpcomingMeetings, submitRSVP, getRSVPStatus } from '../../api/gram-sabha';
import { useLanguage } from '../../utils/LanguageContext';
import GramSabhaDetails from './GramSabhaDetails';

const UpcomingMeetingsBanner = ({ panchayatId, user }) => {
    const { strings } = useLanguage();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [selectedMeeting, setSelectedMeeting] = useState(null);
    const [rsvpStatus, setRsvpStatus] = useState({});
    const [rsvpLoading, setRsvpLoading] = useState({});
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedMeetingId, setSelectedMeetingId] = useState(null);

    useEffect(() => {
        if (panchayatId) {
            loadUpcomingMeetings();
        }
    }, [panchayatId]);

    const loadUpcomingMeetings = async () => {
        if (!panchayatId) return;

        try {
            setLoading(true);
            setError('');
            const data = await fetchUpcomingMeetings(panchayatId);
            setMeetings(data);
            // Load RSVP status for each meeting
            data.forEach(meeting => {
                loadRSVPStatus(meeting._id);
            });
        } catch (error) {
            console.error('Error loading meetings:', error);
            setError(error.message || 'Failed to load upcoming meetings');
        } finally {
            setLoading(false);
        }
    };

    const loadRSVPStatus = async (meetingId) => {
        if (!user?.id) return;
        try {
            const response = await getRSVPStatus(meetingId, user.id);
            setRsvpStatus(prev => ({
                ...prev,
                [meetingId]: response?.data?.status || null
            }));
        } catch (error) {
            console.error('Error loading RSVP status:', error);
        }
    };

    const handleRSVP = async (meetingId, status) => {
        if (!user?._id && !user?.id) {
            setError('Please login to RSVP');
            return;
        }
        try {
            setRsvpLoading(prev => ({ ...prev, [meetingId]: true }));
            await submitRSVP(meetingId, { status }, user.id);
            await loadRSVPStatus(meetingId);
            setAnchorEl(null); // Close the menu after selection
        } catch (error) {
            setError(error.message || 'Failed to submit RSVP');
        } finally {
            setRsvpLoading(prev => ({ ...prev, [meetingId]: false }));
        }
    };

    const handleMenuOpen = (event, meetingId) => {
        setAnchorEl(event.currentTarget);
        setSelectedMeetingId(meetingId);
    };

    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedMeetingId(null);
    };

    const getRSVPButtonProps = (meetingId) => {
        const status = rsvpStatus[meetingId];
        switch (status) {
            case 'CONFIRMED':
                return {
                    color: 'success',
                    icon: <CheckCircleIcon />,
                    text: strings.attending
                };
            case 'DECLINED':
                return {
                    color: 'error',
                    icon: <CancelIcon />,
                    text: strings.notAttending
                };
            case 'MAYBE':
                return {
                    color: 'warning',
                    icon: <HelpIcon />,
                    text: strings.mayAttend
                };
            default:
                return {
                    color: 'primary',
                    icon: <CheckCircleIcon />,
                    text: strings.rsvp
                };
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
                    {strings.noUpcomingMeetings}
                </Typography>
            </Paper>
        );
    }

    // Just display the first meeting in the banner as per wireframe
    const meeting = meetings[0];
    const rsvpProps = getRSVPButtonProps(meeting._id);

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
                {/* Banner Header */}
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
                    title={strings.upcomingMeeting}
                    disableTypography
                />

                {/* Meeting Content */}
                <CardContent sx={{ px: 3, py: 2 }}>
                    <Typography
                        variant="h6"
                        fontWeight="bold"
                        color="text.primary"
                        gutterBottom
                    >
                        {meeting.title}
                    </Typography>

                    <Stack spacing={1.5} sx={{ mb: 2 }}>
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
                    </Stack>

                    {/* Action Buttons */}
                    <Box
                        display="flex"
                        justifyContent="flex-end"
                        gap={2}
                        sx={{ mt: 1 }}
                    >
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setSelectedMeeting(meeting)}
                            sx={{ px: 3 }}
                        >
                            {strings.viewDetails}
                        </Button>

                        <Button
                            variant="contained"
                            color={rsvpProps.color}
                            onClick={(e) => handleMenuOpen(e, meeting._id)}
                            disabled={rsvpLoading[meeting._id]}
                            sx={{ 
                                px: 3,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                minWidth: '150px'
                            }}
                        >
                            {rsvpProps.icon}
                            {rsvpProps.text}
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {/* RSVP Menu */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
            >
                <MenuItem
                    onClick={() => handleRSVP(selectedMeetingId, 'CONFIRMED')}
                    disabled={rsvpStatus[selectedMeetingId] === 'CONFIRMED'}
                >
                    <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                    {strings.attending}
                </MenuItem>
                <MenuItem
                    onClick={() => handleRSVP(selectedMeetingId, 'DECLINED')}
                    disabled={rsvpStatus[selectedMeetingId] === 'DECLINED'}
                >
                    <CancelIcon sx={{ mr: 1, color: 'error.main' }} />
                    {strings.notAttending}
                </MenuItem>
                <MenuItem
                    onClick={() => handleRSVP(selectedMeetingId, 'MAYBE')}
                    disabled={rsvpStatus[selectedMeetingId] === 'MAYBE'}
                >
                    <HelpIcon sx={{ mr: 1, color: 'warning.main' }} />
                    {strings.mayAttend}
                </MenuItem>
            </Menu>

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

export default UpcomingMeetingsBanner;