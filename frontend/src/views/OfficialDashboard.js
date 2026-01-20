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
    Avatar,
    Alert,
    CircularProgress,
    Stack,
    IconButton,
    useTheme,
    useMediaQuery,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    ListItemSecondaryAction,
    Badge,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Tooltip,
    Divider
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import PeopleIcon from '@mui/icons-material/People';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import LogoutIcon from '@mui/icons-material/Logout';
import LanguageSwitcher from '../components/LanguageSwitcher';
import NotificationsIcon from '@mui/icons-material/Notifications';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import FlagIcon from '@mui/icons-material/Flag';
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import LockIcon from '@mui/icons-material/Lock';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SettingsIcon from '@mui/icons-material/Settings';
import ImageIcon from '@mui/icons-material/Image';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InfoIcon from '@mui/icons-material/Info';
import { useLanguage } from '../utils/LanguageContext';
import { fetchPanchayatStats } from '../api/officials';
import PasswordChangeForm from './PasswordChangeForm';
import { changePassword } from '../api/profile';
import { useAuth } from '../utils/authContext';
import { useNavigate } from 'react-router-dom';
import TodaysMeetingsBanner from '../components/GramSabha/TodaysMeetingsBanner';
import { fetchUsers } from '../api';
import { RegistrationView, UsersView } from '.';
import FaceRegistration from '../components/FaceRegistration';
import * as faceapi from 'face-api.js';

const OfficialDashboard = ({ onCreateIssue, onViewIssues, onManageGramSabha, onPanchayatSettings }) => {
    const { strings } = useLanguage();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [panchayatInfo, setPanchayatInfo] = useState(null);
    const [userState, setUserState] = useState(user);
    const [imageUrl, setImageUrl] = useState(null);
    const [panchayatStats, setPanchayatStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordChangeError, setPasswordChangeError] = useState('');
    const [users, setUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showAllCitizen, setShowAllCitizen] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    useEffect(() => {
        const fetchOfficialDetails = async () => {
            if (!user || !user.id) return;
            setLoading(true);
            try {
                // Fetch official's profile and linked citizen details
                const response = await fetch(`${API_URL}/officials/profile/${user.id}`, {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        // Token might be expired, let the auth interceptor handle it
                        throw new Error('Authentication required');
                    }
                    throw new Error('Failed to fetch official profile');
                }

                const data = await response.json();
                setPanchayatInfo(data.data.panchayat);

                // Update the entire userState with the response data
                const updatedUserState = { ...data.data };

                if (updatedUserState?.linkedCitizenId) {
                    const imageUrl = `${API_URL}/users/${updatedUserState.linkedCitizenId}/thumbnail`;
                    updatedUserState.faceImageUrl = imageUrl;
                    setImageUrl(imageUrl);
                }

                // Update the state with the modified data
                setUserState(updatedUserState);

                // Fetch panchayat-wide statistics
                try {
                    const statsResponse = await fetchPanchayatStats(data.data.panchayat._id);
                    if (statsResponse.success) {
                        setPanchayatStats(statsResponse.data);
                    }
                } catch (statsError) {
                    console.error('Error fetching panchayat stats:', statsError);
                    // Don't throw here, just log the error
                }
            } catch (error) {
                console.error('Error fetching official details:', error);
                setError(error.message || 'Error fetching official details');
                // Don't clear token here, let the auth interceptor handle it
            } finally {
                setLoading(false);
            }
        };

        fetchOfficialDetails();
    }, [user, API_URL]);

    useEffect(() => {
        if (panchayatInfo?._id) {
            fetchUsers(panchayatInfo._id).then((data) => setUsers(data));
        }
    }, [panchayatInfo]);

    // Load face-api models
    useEffect(() => {
        const loadModels = async () => {
            setLoading(true);
            try {
                // Use a CDN instead of local files
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                setModelsLoaded(true);
                console.log('Face-api models loaded successfully from CDN');
            } catch (error) {
                console.error('Error loading models:', error);
                setMessage({ type: 'error', text: 'Failed to load facial recognition models.' });
            } finally {
                setLoading(false);
            }
        };

        loadModels();
    }, []);

    const getStatusCounts = () => {
        if (!panchayatStats) return { pending: 0, inProgress: 0, resolved: 0 };
        return {
            pending: panchayatStats.issueStats?.pendingIssues || 0,
            inProgress: panchayatStats.issueStats?.inProgressIssues || 0,
            resolved: panchayatStats.issueStats?.resolvedIssues || 0
        };
    };

    const statusCounts = getStatusCounts();

    // Handle password change
    const handlePasswordChange = async (currentPassword, newPassword) => {
        setPasswordChangeLoading(true);
        setPasswordChangeError('');

        try {
            await changePassword({ currentPassword, newPassword });
            setPasswordDialogOpen(false);
            return true;
        } catch (error) {
            setPasswordChangeError(error.message || 'Failed to change password');
            return false;
        } finally {
            setPasswordChangeLoading(false);
        }
    };

    // Handle logout
    const handleLogout = () => {
        logout();
        navigate('/admin/login');
    };

    // Handle user update (after registration)
    const handleUserUpdate = (updatedUser) => {
        setSelectedUser(updatedUser); // Update selectedUser with new data
        // Update the users list with the updated user
        setUsers(prevUsers =>
            prevUsers.map(u =>
                u._id === updatedUser._id ? { ...u, ...updatedUser } : u
            )
        );
    };

    return showAllCitizen ? (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            <Box>
                {selectedUser && (
                    <IconButton
                        title={strings.back}
                        onClick={() => setSelectedUser(null)}
                        sx={{
                            background: "rgba(255,255,255,0.8)",
                            top: 50,
                            left: 30,
                        }}
                    >
                        <ArrowBackIcon />
                    </IconButton>
                )}
                {!selectedUser ? (
                    <UsersView
                        users={users}
                        loggedInUser={user}
                        setSelectedUser={setSelectedUser}
                        selectedPanchayat={panchayatInfo}
                        setShowAllCitizen={setShowAllCitizen}
                    />
                ) : (
                    <RegistrationView
                        user={selectedUser}
                        onUserUpdate={handleUserUpdate}
                    >
                        <FaceRegistration
                            user={selectedUser}
                            modelsLoaded={modelsLoaded}
                            onUserUpdate={handleUserUpdate}
                            setMessage={setMessage}
                            setLoading={setLoading}
                        />
                    </RegistrationView>
                )}
            </Box>
        </Container>
    ) : (
        <Container maxWidth="xl" sx={{ py: 3 }}>
            {/* Header with greeting and language selector */}
            <Paper
                elevation={2}
                sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    py: 2,
                    px: isMobile ? 2 : 3,
                    mb: 3,
                    borderRadius: 1,
                    boxShadow: theme.shadows[3],
                    display: 'flex',
                    flexDirection: isMobile ? 'column' : 'row',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: isMobile ? 2 : 0,
                    width: '100%'
                }}
            >
                {/* Left Section */}
                <Box>
                    <Typography variant="h5" component="h1">
                        {strings.welcomeCitizen}, {user?.name || ''}
                    </Typography>
                    <Typography variant="subtitle2">
                        {user?.role} - {panchayatInfo?.name || ''}
                    </Typography>
                </Box>

                {/* Right Section */}
                <Stack
                    direction="row"
                    spacing={1}
                    sx={{
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 1,
                        '& .MuiButton-root': {
                            minWidth: 'unset',
                            padding: isMobile ? '6px' : '8px'
                        }
                    }}
                >
                    <IconButton
                        color="inherit"
                        onClick={() => setShowAllCitizen(true)}
                        title={strings.members}
                        size={isMobile ? "small" : "medium"}
                    >
                        <PeopleIcon fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    
                    {/* <Badge badgeContent={statusCounts.pending} color="error">
                        <NotificationsIcon fontSize={isMobile ? "small" : "medium"} />
                    </Badge> */}
                    <IconButton
                        color="inherit"
                        onClick={() => setPasswordDialogOpen(true)}
                        title={strings.changePassword}
                        size={isMobile ? "small" : "medium"}
                    >
                        <LockIcon fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    <IconButton
                        color="inherit"
                        onClick={handleLogout}
                        title={strings.logout}
                        size={isMobile ? "small" : "medium"}
                    >
                        <LogoutIcon fontSize={isMobile ? "small" : "medium"} />
                    </IconButton>
                    <LanguageSwitcher
                        sx={{
                            '& .MuiSelect-select': {
                                padding: isMobile ? '6px 32px 6px 12px' : '8px 40px 8px 14px',
                                fontSize: isMobile ? '0.875rem' : '1rem'
                            },
                            '& .MuiSvgIcon-root': {
                                right: isMobile ? 4 : 8
                            }
                        }}
                    />
                </Stack>
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
                <Grid container spacing={3} sx={{ width: '100%', maxWidth: '100%', margin: 0 }}>
                    {/* Display Today's Meetings Banner */}
                    <Grid item xs={12} sx={{ width: '100%', padding: 0 }}>
                        <TodaysMeetingsBanner
                            panchayatId={panchayatInfo?._id}
                            user={user}
                        />
                    </Grid>

                    {/* Main Content - Action Cards */}
                    <Grid item xs={12} sx={{ width: '100%' }}>
                        {/* Section Header - Quick Actions */}
                        <Box sx={{ mb: 3 }}>
                            <Typography
                                variant="subtitle1"
                                fontWeight="bold"
                                sx={{
                                    mb: 2,
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
                                <Tooltip title={strings.quickActionsTooltip || "Common tasks you can perform from this dashboard"}>
                                    <InfoIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                                </Tooltip>
                            </Typography>
                        </Box>
                        {/* Action Cards - Horizontal layout with equal widths */}
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <Card
                                    elevation={2}
                                    sx={{
                                        borderRadius: 1,
                                        height: '100%',
                                        transition: 'transform 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Avatar
                                                sx={{
                                                    bgcolor: 'rgba(25, 118, 210, 0.1)',
                                                    color: 'primary.main',
                                                    mr: 2
                                                }}
                                            >
                                                <AddCircleOutlineIcon />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                    {strings.createIssue}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {strings.createIssuesDesc}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <List dense disablePadding sx={{ ml: 1, mb: 2 }}>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.createWithDetails} />
                                            </ListItem>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.attachDocuments} />
                                            </ListItem>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.setPriority} />
                                            </ListItem>
                                        </List>

                                        <Button
                                            fullWidth
                                            variant="contained"
                                            onClick={onCreateIssue}
                                            endIcon={<AddCircleOutlineIcon />}
                                        >
                                            {strings.createNewIssue}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={4}>
                                <Card
                                    elevation={2}
                                    sx={{
                                        borderRadius: 1,
                                        height: '100%',
                                        transition: 'transform 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Avatar
                                                sx={{
                                                    bgcolor: 'rgba(2, 136, 209, 0.1)',
                                                    color: 'info.main',
                                                    mr: 2
                                                }}
                                            >
                                                <FormatListBulletedIcon />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                    {strings.manageIssues}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {strings.manageIssuesDesc}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <List dense disablePadding sx={{ ml: 1, mb: 2 }}>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <FlagIcon sx={{ color: 'error.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.processPendingIssues} />
                                            </ListItem>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <AssignmentIcon sx={{ color: 'warning.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.updateStatus} />
                                            </ListItem>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <CheckCircleIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.reviewHistory} />
                                            </ListItem>
                                        </List>

                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="info"
                                            onClick={onViewIssues}
                                            endIcon={<FormatListBulletedIcon />}
                                        >
                                            {strings.viewAllIssues}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>

                            {/* New Gram Sabha Management Card */}
                            <Grid item xs={12} md={4}>
                                <Card
                                    elevation={2}
                                    sx={{
                                        borderRadius: 1,
                                        height: '100%',
                                        transition: 'transform 0.2s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)'
                                        }
                                    }}
                                >
                                    <CardContent sx={{ p: 2 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Avatar
                                                sx={{
                                                    bgcolor: 'rgba(76, 175, 80, 0.1)',
                                                    color: 'success.main',
                                                    mr: 2
                                                }}
                                            >
                                                <MeetingRoomIcon />
                                            </Avatar>
                                            <Box>
                                                <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                    {strings.manageGramSabha}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {strings.gramSabhaDesc}
                                                </Typography>
                                            </Box>
                                        </Box>

                                        <List dense disablePadding sx={{ ml: 1, mb: 2 }}>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <CalendarMonthIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.scheduleMeetings} />
                                            </ListItem>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <GroupIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.manageAttendees} />
                                            </ListItem>
                                            <ListItem disableGutters>
                                                <ListItemIcon sx={{ minWidth: 24 }}>
                                                    <AssignmentIcon sx={{ color: 'success.main', fontSize: 16 }} />
                                                </ListItemIcon>
                                                <ListItemText primary={strings.trackAgendas} />
                                            </ListItem>
                                        </List>

                                        <Button
                                            fullWidth
                                            variant="outlined"
                                            color="success"
                                            onClick={onManageGramSabha}
                                            endIcon={<MeetingRoomIcon />}
                                        >
                                            {strings.manageGramSabha}
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>

                        </Grid>
                    </Grid>

                    {/* Panchayat Settings Card - Only for President/Secretary */}
                    {['PRESIDENT', 'SECRETARY'].includes(user?.role) && (
                        <Grid item xs={12} sx={{ width: '100%' }}>
                            {/* Administration Section Header */}
                            <Box sx={{ mb: 2 }}>
                                <Divider sx={{ mb: 2 }} />
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
                                    <SettingsIcon sx={{ mr: 1, fontSize: 18 }} />
                                    {strings.administration || 'Administration'}
                                    <Tooltip title={strings.administrationTooltip || "Administrative functions available to President and Secretary only"}>
                                        <InfoIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                                    </Tooltip>
                                </Typography>
                            </Box>

                            {/* Administration Cards */}
                            <Grid container spacing={3}>
                                <Grid item xs={12} sm={6} md={4}>
                                    <Card
                                        elevation={2}
                                        sx={{
                                            borderRadius: 1,
                                            height: '100%',
                                            transition: 'transform 0.2s ease',
                                            '&:hover': {
                                                transform: 'translateY(-4px)'
                                            }
                                        }}
                                    >
                                        <CardContent sx={{ p: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                <Avatar
                                                    sx={{
                                                        bgcolor: 'rgba(156, 39, 176, 0.1)',
                                                        color: 'secondary.main',
                                                        mr: 2
                                                    }}
                                                >
                                                    <SettingsIcon />
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                        {strings.panchayatSettings || 'Panchayat Settings'}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {strings.panchayatSettingsDesc || 'Manage letterhead and contact info'}
                                                    </Typography>
                                                </Box>
                                            </Box>

                                            <List dense disablePadding sx={{ ml: 1, mb: 2 }}>
                                                <ListItem disableGutters>
                                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                                        <ImageIcon sx={{ color: 'secondary.main', fontSize: 16 }} />
                                                    </ListItemIcon>
                                                    <ListItemText primary={strings.manageLetterhead || 'Manage Letterhead'} />
                                                </ListItem>
                                                <ListItem disableGutters>
                                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                                        <ContactPhoneIcon sx={{ color: 'secondary.main', fontSize: 16 }} />
                                                    </ListItemIcon>
                                                    <ListItemText primary={strings.contactInformation || 'Contact Information'} />
                                                </ListItem>
                                                <ListItem disableGutters>
                                                    <ListItemIcon sx={{ minWidth: 24 }}>
                                                        <PeopleIcon sx={{ color: 'secondary.main', fontSize: 16 }} />
                                                    </ListItemIcon>
                                                    <ListItemText primary={strings.officialsList || 'Officials'} />
                                                </ListItem>
                                            </List>

                                            <Button
                                                fullWidth
                                                variant="outlined"
                                                color="secondary"
                                                onClick={onPanchayatSettings}
                                                endIcon={<SettingsIcon />}
                                            >
                                                {strings.openSettings || 'Open Settings'}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </Grid>
                    )}
                </Grid>
            )}

            {/* Password Change Dialog */}
            <Dialog
                open={passwordDialogOpen}
                onClose={() => setPasswordDialogOpen(false)}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>{strings.changePassword}</DialogTitle>
                <DialogContent>
                    {passwordChangeError && (
                        <Alert severity="error" sx={{ mb: 2 }}>
                            {strings.passwordChangeError}
                        </Alert>
                    )}
                    <PasswordChangeForm
                        onSubmit={handlePasswordChange}
                        loading={passwordChangeLoading}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setPasswordDialogOpen(false)}>
                        {strings.cancel}
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default OfficialDashboard;