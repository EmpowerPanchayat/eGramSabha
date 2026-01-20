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
    useMediaQuery,
    Tooltip
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
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlagIcon from '@mui/icons-material/Flag';
import InfoIcon from '@mui/icons-material/Info';
import DashboardIcon from '@mui/icons-material/Dashboard';
import { useLanguage } from '../utils/LanguageContext';
import UpcomingMeetingsBanner from '../components/GramSabha/UpcomingMeetingsBanner';
import PastMeetingsList from '../components/GramSabha/PastMeetingsList';
import { getCitizenProfile } from '../api/profile';
import tokenManager from '../utils/tokenManager';

const CitizenDashboard = ({ user, onCreateIssue, onViewIssues, onLogout }) => {
    const { strings } = useLanguage();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    
    // Initialize panchayatInfo immediately from user prop
    const [panchayatInfo, setPanchayatInfo] = useState(user?.panchayat || null);
    const [userState, setUserState] = useState(user);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profileCollapsed, setProfileCollapsed] = useState(false);
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    // Helper to get Authorization header for issues endpoints
    const getAuthHeaders = () => {
        const token = tokenManager.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    // Single useEffect that runs only once on mount
    useEffect(() => {
        const fetchUserDetails = async () => {
            if (!user?.id) return;

            setLoading(true);
            try {
                console.log('CitizenDashboard - Fetching user details');

                // Use the profile API that will use the token from tokenManager
                const response = await getCitizenProfile();
                if (response?.success && response?.data?.user) {
                    const userData = response.data.user;
                    console.log('Setting panchayatInfo:', userData.panchayat);
                    setPanchayatInfo(userData.panchayat);

                    // Always set the thumbnail URL using the GridFS API endpoint
                    setUserState(prev => ({
                        ...prev,
                        faceImageUrl: `${API_URL}/users/${userData.id}/thumbnail`
                    }));
                }
            } catch (error) {
                console.error('CitizenDashboard - Error fetching user details:', error);
                setError(error.message || 'Error fetching user details');
            } finally {
                setLoading(false);
            }
        };

        fetchUserDetails();
    }, []); // Empty dependency array - only run once on mount

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
                    <Typography variant="body1" sx={{ ml: 2 }}>Loading dashboard...</Typography>
                </Box>
            ) : (
                <Grid container spacing={3}>
                    {/* User Profile Card - Collapsible */}
                    <Grid item xs={12} md={4} lg={3}>
                        <Card elevation={2} sx={{
                            borderRadius: 3,
                            width: isMobile ? 380 : 340,
                            height: "auto",
                            minHeight: 200,
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
                            <UpcomingMeetingsBanner panchayatId={panchayatInfo?.id} user={user} />

                            {/* Section Header - Quick Actions */}
                            <Box sx={{ mb: 2, mt: 1 }}>
                                <Typography
                                    variant="subtitle1"
                                    fontWeight="bold"
                                    sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: 'text.secondary',
                                        textTransform: 'uppercase',
                                        letterSpacing: 0.5,
                                        fontSize: '0.8rem'
                                    }}
                                >
                                    <DashboardIcon sx={{ mr: 1, fontSize: 18 }} />
                                    {strings.quickActions || 'Quick Actions'}
                                    <Tooltip title={strings.quickActionsTooltip || "Report new issues or view your existing issues"}>
                                        <InfoIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                                    </Tooltip>
                                </Typography>
                            </Box>

                            <Grid container spacing={3}>
                                <Grid item xs={12} md={6}>
                                    <Card
                                        elevation={2}
                                        sx={{
                                            p: 3,
                                            height: '100%',
                                            width: 380,
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
                                            width: 380,
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
                            <PastMeetingsList panchayatId={panchayatInfo?.id} user={user} />
                        </Stack>
                    </Grid>
                </Grid>
            )}
        </Container>
    );
};

export default CitizenDashboard;