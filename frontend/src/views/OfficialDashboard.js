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
import AssignmentIcon from '@mui/icons-material/Assignment';
import GroupIcon from '@mui/icons-material/Group';
import LockIcon from '@mui/icons-material/Lock';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import { useLanguage } from '../utils/LanguageContext';
import { fetchUserIssues, getFaceImageUrl } from '../api/index';
import { fetchOfficialIssues, fetchPanchayatStats } from '../api/officials';
import PasswordChangeForm from './PasswordChangeForm';
import { changePassword } from '../api/profile';
import { useAuth } from '../utils/authContext';
import { useNavigate } from 'react-router-dom';
import GramSabhaManagement from '../components/GramSabha/GramSabhaManagement';
import TodaysMeetingsBanner from '../components/GramSabha/TodaysMeetingsBanner';

const OfficialDashboard = ({ onCreateIssue, onViewIssues, onManageGramSabha }) => {
    const { strings } = useLanguage();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const { logout, user } = useAuth();
    const navigate = useNavigate();
    const [panchayatInfo, setPanchayatInfo] = useState(null);
    const [userState, setUserState] = useState(user);
    const [imageUrl, setImageUrl] = useState(null);
    const [userStats, setUserStats] = useState(null);
    const [panchayatStats, setPanchayatStats] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [profileCollapsed, setProfileCollapsed] = useState(false);
    const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
    const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
    const [passwordChangeError, setPasswordChangeError] = useState('');
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

                // Set face image URL if it exists - FIXED IMPLEMENTATION
                if (updatedUserState.linkedUser?.faceImagePath) {
                    // Get the correct URL using the getFaceImageUrl function
                    let imageUrl = getFaceImageUrl(updatedUserState.linkedUser.faceImagePath);

                    // Fix duplicate /uploads/ if present
                    if (imageUrl.includes('//uploads')) {
                        imageUrl = imageUrl.replace('//uploads', '/uploads');
                    }

                    // Add the processed URL directly to the linkedUser object
                    updatedUserState.linkedUser.faceImageUrl = imageUrl;

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

    const getStatusCounts = () => {
        if (!panchayatStats) return { pending: 0, inProgress: 0, resolved: 0 };
        return {
            pending: panchayatStats.issueStats?.pendingIssues || 0,
            inProgress: panchayatStats.issueStats?.inProgressIssues || 0,
            resolved: panchayatStats.issueStats?.resolvedIssues || 0
        };
    };

    const statusCounts = getStatusCounts();

    const getStatusColor = (status) => {
        switch (status) {
            case 'REPORTED': return theme.palette.warning.main;
            case 'IN_PROGRESS': return theme.palette.info.main;
            case 'RESOLVED': return theme.palette.success.main;
            default: return theme.palette.text.secondary;
        }
    };

    const getStatusIcon = (status) => {
        switch (status) {
            case 'REPORTED': return <FlagIcon color="error" />;
            case 'IN_PROGRESS': return <AssignmentIcon color="warning" />;
            case 'RESOLVED': return <CheckCircleIcon color="success" />;
            default: return <FlagIcon color="error" />;
        }
    };

    // Handle password change
    const handlePasswordChange = async (currentPassword, newPassword) => {
        setPasswordChangeLoading(true);
        setPasswordChangeError('');

        try {
            await changePassword(currentPassword, newPassword);
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

    return (
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
                    <Badge badgeContent={statusCounts.pending} color="error">
                        <NotificationsIcon fontSize={isMobile ? "small" : "medium"} />
                    </Badge>
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
                        {/* Action Cards - Horizontal layout with equal widths */}
                        <Grid container spacing={3} sx={{ mb: 3 }}>
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