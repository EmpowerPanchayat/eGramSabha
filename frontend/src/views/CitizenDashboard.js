import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Paper,
    Container,
    Grid,
    Card,
    CardContent,
    CardActions,
    Divider,
    Avatar,
    Chip,
    Alert,
    CircularProgress,
    Stack,
    IconButton,
    useTheme,
    useMediaQuery
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import PersonIcon from '@mui/icons-material/Person';
import BadgeIcon from '@mui/icons-material/Badge';
import HomeIcon from '@mui/icons-material/Home';
import PhoneIcon from '@mui/icons-material/Phone';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import LanguageSwitcher from '../components/LanguageSwitcher';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import NotificationsIcon from '@mui/icons-material/Notifications';
import SettingsIcon from '@mui/icons-material/Settings';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlagIcon from '@mui/icons-material/Flag';
import { useLanguage } from '../utils/LanguageContext';
import { getFaceImageUrl } from '../api/index';
import UpcomingMeetingsBanner from '../components/GramSabha/UpcomingMeetingsBanner';
import PastMeetingsList from '../components/GramSabha/PastMeetingsList';

const CitizenDashboard = ({ user, onCreateIssue, onViewIssues, onLogout }) => {
    const { strings } = useLanguage();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [panchayatInfo, setPanchayatInfo] = useState(null);
    const [userState, setUserState] = useState(user);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profileCollapsed, setProfileCollapsed] = useState(false);
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchUserDetails = async () => {
            console.log({user})
            if (!user || !user._id) return;
            setLoading(true);
            try {
                console.log('CitizenDashboard - Fetching user details for:', user._id);
                const response = await fetch(`${API_URL}/citizens/profile/${user._id}`);
                if (!response.ok) throw new Error('Failed to fetch user profile');
                const data = await response.json();
                console.log('CitizenDashboard - Received user data:', data);
                setPanchayatInfo(data.user.panchayat);
                console.log('CitizenDashboard - Set panchayatInfo:', data.user.panchayat);

                // Set face image URL properly if it exists
                if (data.user.faceImagePath) {
                    // Get the correct URL using the same function as RegistrationView
                    let imageUrl = getFaceImageUrl(data.user.faceImagePath);

                    // Fix duplicate /uploads/ if present
                    if (imageUrl.includes('//uploads')) {
                        imageUrl = imageUrl.replace('//uploads', '/uploads');
                    }

                    setUserState(prev => ({ ...prev, faceImageUrl: imageUrl }));
                }
            } catch (error) {
                console.error('CitizenDashboard - Error fetching user details:', error);
                setError(error.message || 'Error fetching user details');
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, [user, API_URL]);

    return (
        <Container maxWidth="lg" sx={{ py: { xs: 2, md: 4 } }}>
            {/* Header with greeting and language selector */}
            <Paper
                elevation={0}
                sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    py: 2,
                    px: 3,
                    mb: 3,
                    borderRadius: 2,
                    boxShadow: theme.shadows[3],
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    width: '100%'
                }}
            >
                <Typography variant="h5" component="h1">
                    {strings.welcomeCitizen}, {user?.name || ''}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    {/* {!isMobile && (
                        <>
                            <IconButton color="inherit" size="small">
                                <HelpOutlineIcon />
                            </IconButton>
                            <IconButton color="inherit" size="small">
                                <NotificationsIcon />
                            </IconButton>
                            <IconButton color="inherit" size="small">
                                <SettingsIcon />
                            </IconButton>
                            <Divider orientation="vertical" flexItem sx={{ mx: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
                        </>
                    )} */}
                    <LanguageSwitcher sx={{
                        '& .MuiButton-outlined': {
                            bgcolor: 'rgba(255,255,255,0.2)',
                            borderColor: 'rgba(255,255,255,0.3)',
                            opacity: 1
                        }
                    }} />
                </Box>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                    <CircularProgress size={60} />
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {/* User Profile Card - Collapsible */}
                    <Grid item xs={12} md={4} lg={3}>
                        <Card elevation={2} sx={{
                            borderRadius: 3,
                            height: profileCollapsed ? 'auto' : '100%',
                            boxShadow: theme.shadows[3],
                            transition: 'all 0.3s ease',
                            overflow: 'hidden'
                        }}>
                            {/* Profile header with background and collapse toggle */}
                            <Box
                                sx={{
                                    bgcolor: 'primary.dark',
                                    background: 'linear-gradient(135deg, #1976d2 0%, #0d47a1 100%)',
                                    color: 'white',
                                    p: 3,
                                    textAlign: 'center',
                                    borderTopLeftRadius: 12,
                                    borderTopRightRadius: 12,
                                    position: 'relative'
                                }}
                            >
                                <IconButton
                                    sx={{
                                        position: 'absolute',
                                        top: 8,
                                        right: 8,
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: 'rgba(255,255,255,0.3)',
                                        }
                                    }}
                                    onClick={() => setProfileCollapsed(!profileCollapsed)}
                                >
                                    {profileCollapsed ? <ExpandMoreIcon /> : <ExpandLessIcon />}
                                </IconButton>

                                <Avatar
                                    src={userState?.faceImageUrl}
                                    sx={{
                                        width: 120,
                                        height: 120,
                                        mx: 'auto',
                                        mb: 2,
                                        border: '4px solid white',
                                        boxShadow: theme.shadows[4]
                                    }}
                                >
                                    {!userState?.faceImageUrl && <PersonIcon sx={{ fontSize: 60 }} />}
                                </Avatar>
                                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                                    {user?.name || 'Citizen'}
                                </Typography>
                                <Chip
                                    icon={<BadgeIcon />}
                                    label={user?.voterIdNumber || 'N/A'}
                                    color="default"
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        fontWeight: 'medium',
                                        backdropFilter: 'blur(5px)'
                                    }}
                                />
                            </Box>

                            {/* Collapsible content */}
                            <Box sx={{
                                height: profileCollapsed ? 0 : 'auto',
                                overflow: 'hidden',
                                transition: 'height 0.3s ease'
                            }}>
                                {/* User details */}
                                <Box sx={{ p: 3 }}>
                                    <Stack spacing={2}>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <AccountBalanceIcon sx={{ mr: 1, color: 'primary.main' }} />
                                            <Typography variant="body1">
                                                <Typography component="span" color="textSecondary" variant="body2">
                                                    {strings.panchayat}:
                                                </Typography>{' '}
                                                {panchayatInfo?.name || 'N/A'}
                                            </Typography>
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            <LocationOnIcon sx={{ mr: 1, color: 'primary.main' }} />
                                            <Typography variant="body1">
                                                <Typography component="span" color="textSecondary" variant="body2">
                                                    {strings.district}/{strings.state}:
                                                </Typography>{' '}
                                                {panchayatInfo?.district || 'N/A'}, {panchayatInfo?.state || 'N/A'}
                                            </Typography>
                                        </Box>

                                        {user?.address && (
                                            <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                                                <HomeIcon sx={{ mr: 1, mt: 0.5, color: 'primary.main' }} />
                                                <Typography variant="body1">
                                                    <Typography component="span" color="textSecondary" variant="body2">
                                                        {strings.address}:
                                                    </Typography>{' '}
                                                    {user.address}
                                                </Typography>
                                            </Box>
                                        )}

                                        {user?.mobileNumber && (
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <PhoneIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="body1">
                                                    <Typography component="span" color="textSecondary" variant="body2">
                                                        {strings.mobileNumber}:
                                                    </Typography>{' '}
                                                    {user.mobileNumber}
                                                </Typography>
                                            </Box>
                                        )}
                                    </Stack>
                                </Box>
                                <Divider />
                                <CardActions sx={{ p: 2 }}>
                                    <Button
                                        fullWidth
                                        variant="contained"
                                        color="error"
                                        onClick={onLogout}
                                        startIcon={<LogoutIcon />}
                                        size="large"
                                        sx={{ py: 1 }}
                                    >
                                        {strings.logout}
                                    </Button>
                                </CardActions>
                            </Box>
                        </Card>
                    </Grid>

                    {/* Main Content */}
                    <Grid item xs={12} md={8} lg={9}>
                        <Stack spacing={3}>
                            {/* Upcoming Meetings Banner */}
                            <UpcomingMeetingsBanner panchayatId={panchayatInfo?._id} user={user} />
                            
                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Card
                                        elevation={2}
                                        sx={{
                                            p: 3,
                                            height: '100%',
                                            borderRadius: 3,
                                            boxShadow: theme.shadows[3],
                                            transition: 'transform 0.2s ease',
                                            '&:hover': {
                                                boxShadow: theme.shadows[6],
                                                transform: 'translateY(-4px)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                                            <Avatar
                                                sx={{
                                                    width: 80,
                                                    height: 80,
                                                    mb: 2,
                                                    mx: 'auto',
                                                    bgcolor: 'rgba(25, 118, 210, 0.1)',
                                                    color: 'primary.main'
                                                }}
                                            >
                                                <AddCircleOutlineIcon sx={{ fontSize: 42 }} />
                                            </Avatar>
                                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                                {strings.reportNewIssue}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                {strings.reportIssueDesc}
                                            </Typography>
                                        </Box>

                                        {/* Feature Highlights */}
                                        <Box sx={{ mb: 3 }}>
                                            <Grid container spacing={1}>
                                                <Grid item xs={12}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                        <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                                                        <Typography variant="body2">{strings.submitTextIssues}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                        <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                                                        <Typography variant="body2">{strings.attachPhotos}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                                                        <Typography variant="body2">{strings.recordVoice}</Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Box>

                                        <Box sx={{ mt: 'auto' }}>
                                            <Button
                                                fullWidth
                                                variant="contained"
                                                onClick={onCreateIssue}
                                                size="large"
                                                sx={{ py: 1.5 }}
                                                endIcon={<AddCircleOutlineIcon />}
                                            >
                                                {strings.createNewIssue}
                                            </Button>
                                        </Box>
                                    </Card>
                                </Grid>

                                <Grid item xs={12} md={6}>
                                    <Card
                                        elevation={2}
                                        sx={{
                                            p: 3,
                                            height: '100%',
                                            borderRadius: 3,
                                            boxShadow: theme.shadows[3],
                                            transition: 'transform 0.2s ease',
                                            '&:hover': {
                                                boxShadow: theme.shadows[6],
                                                transform: 'translateY(-4px)'
                                            }
                                        }}
                                    >
                                        <Box sx={{ textAlign: 'center', mb: 3 }}>
                                            <Avatar
                                                sx={{
                                                    width: 80,
                                                    height: 80,
                                                    mb: 2,
                                                    mx: 'auto',
                                                    bgcolor: 'rgba(2, 136, 209, 0.1)',
                                                    color: 'info.main'
                                                }}
                                            >
                                                <FormatListBulletedIcon sx={{ fontSize: 42 }} />
                                            </Avatar>
                                            <Typography variant="h6" gutterBottom sx={{ fontWeight: 'bold' }}>
                                                {strings.issuesList}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                {strings.issueListDesc}
                                            </Typography>
                                        </Box>

                                        {/* Status Types */}
                                        <Box sx={{ mb: 3 }}>
                                            <Grid container spacing={1}>
                                                <Grid item xs={12}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                        <PriorityHighIcon sx={{ mr: 1, color: 'warning.main', fontSize: 16 }} />
                                                        <Typography variant="body2">{strings.trackPendingIssues}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                        <CheckCircleIcon sx={{ mr: 1, color: 'success.main', fontSize: 16 }} />
                                                        <Typography variant="body2">{strings.viewResolvedIssues}</Typography>
                                                    </Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <FlagIcon sx={{ mr: 1, color: 'info.main', fontSize: 16 }} />
                                                        <Typography variant="body2">{strings.monitorResponses}</Typography>
                                                    </Box>
                                                </Grid>
                                            </Grid>
                                        </Box>

                                        <Box sx={{ mt: 'auto' }}>
                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                color="info"
                                                onClick={onViewIssues}
                                                size="large"
                                                sx={{ py: 1.5 }}
                                                endIcon={<FormatListBulletedIcon />}
                                            >
                                                {strings.viewAllIssues}
                                            </Button>
                                        </Box>
                                    </Card>
                                </Grid>
                            </Grid>
                            
                            {/* Past Meetings List */}
                            <PastMeetingsList panchayatId={panchayatInfo?._id} user={user} />
                        </Stack>
                    </Grid>
                </Grid>
            )}
        </Container>
    );
};

export default CitizenDashboard;