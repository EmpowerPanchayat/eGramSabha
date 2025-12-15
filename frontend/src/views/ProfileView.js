// File: frontend/src/views/ProfileView.js
import React, { useState, useEffect } from 'react';
import {
    Box,
    Paper,
    Typography,
    Grid,
    TextField,
    Button,
    Avatar,
    Divider,
    Alert,
    Snackbar,
    CircularProgress,
    Chip,
    Tab,
    Tabs
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SaveIcon from '@mui/icons-material/Save';
import LockIcon from '@mui/icons-material/Lock';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import SecurityIcon from '@mui/icons-material/Security';

import { getProfile, updateProfile, changePassword } from '../api/profile';
import PasswordChangeForm from './PasswordChangeForm';

// Tab panel component
function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`profile-tabpanel-${index}`}
            aria-labelledby={`profile-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
        </div>
    );
}

const ProfileView = () => {
    const [tabValue, setTabValue] = useState(0);
    const [profileData, setProfileData] = useState({
        name: '',
        email: '',
        username: '',
        phone: '',
        role: '',
        panchayatId: '',
        panchayatName: '',
        avatarUrl: ''
    });

    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Load profile data on component mount
    useEffect(() => {
        loadProfile();
    }, []);

    // Load profile from API
    const loadProfile = async () => {
        setLoading(true);
        setError('');

        try {
            const response = await getProfile();
            const { user } = response.data;

            setProfileData({
                name: user.name || '',
                email: user.email || '',
                username: user.username || '',
                phone: user.phone || '',
                role: user.role || '',
                panchayatId: user.panchayatId || '',
                panchayatName: user.panchayatName || '',
                avatarUrl: user.avatarUrl || ''
            });
        } catch (err) {
            console.error('Error loading profile:', err);
            setError('Failed to load your profile. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Handle tab change
    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    // Handle profile form input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setProfileData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    // Handle profile update
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setSaving(true);
        setError('');

        try {
            await updateProfile({
                name: profileData.name,
                email: profileData.email,
                phone: profileData.phone
            });

            setSnackbar({
                open: true,
                message: 'Profile updated successfully',
                severity: 'success'
            });
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Failed to update profile: ' + (err.message || 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    // Handle password change
    const handlePasswordChange = async (currentPassword, newPassword) => {
        setSaving(true);
        setError('');

        try {
            await changePassword({ currentPassword, newPassword });

            setSnackbar({
                open: true,
                message: 'Password changed successfully',
                severity: 'success'
            });

            // Reset the password form (handled in child component)
            return true;
        } catch (err) {
            console.error('Error changing password:', err);
            setError('Failed to change password: ' + (err.message || 'Unknown error'));
            return false;
        } finally {
            setSaving(false);
        }
    };

    // Handle snackbar close
    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    // Get role display name
    const getRoleDisplayName = (role) => {
        switch (role) {
            case 'ADMIN':
                return 'System Administrator';
            case 'SECRETARY':
                return 'Panchayat Secretary';
            case 'PRESIDENT':
                return 'Panchayat President';
            case 'WARD_MEMBER':
                return 'Ward Member';
            case 'COMMITTEE_SECRETARY':
                return 'Committee Secretary';
            case 'GUEST':
                return 'Guest User';
            default:
                return role;
        }
    };

    // Get initials for avatar
    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '300px' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box>
            <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Your Profile
                </Typography>
                <Typography variant="body1" paragraph>
                    View and update your account information and change your password.
                </Typography>
            </Paper>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Paper sx={{ mb: 4 }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={tabValue}
                        onChange={handleTabChange}
                        aria-label="profile tabs"
                    >
                        <Tab
                            icon={<AccountCircleIcon />}
                            label="Profile Information"
                            id="profile-tab-0"
                            aria-controls="profile-tabpanel-0"
                            iconPosition="start"
                        />
                        <Tab
                            icon={<SecurityIcon />}
                            label="Security"
                            id="profile-tab-1"
                            aria-controls="profile-tabpanel-1"
                            iconPosition="start"
                        />
                    </Tabs>
                </Box>

                <TabPanel value={tabValue} index={0}>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            <Avatar
                                src={profileData.avatarUrl}
                                sx={{
                                    width: 150,
                                    height: 150,
                                    fontSize: 50,
                                    mb: 2,
                                    bgcolor: 'primary.main'
                                }}
                            >
                                {getInitials(profileData.name)}
                            </Avatar>

                            <Chip
                                label={getRoleDisplayName(profileData.role)}
                                color="primary"
                                sx={{ mb: 2 }}
                            />

                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                Username: <strong>{profileData.username}</strong>
                            </Typography>

                            {profileData.panchayatName && (
                                <Typography variant="body2" color="text.secondary">
                                    Panchayat: <strong>{profileData.panchayatName}</strong>
                                </Typography>
                            )}
                        </Grid>

                        <Grid item xs={12} md={8}>
                            <Box component="form" onSubmit={handleUpdateProfile}>
                                <Grid container spacing={2}>
                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Full Name"
                                            name="name"
                                            value={profileData.name}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Email Address"
                                            name="email"
                                            type="email"
                                            value={profileData.email}
                                            onChange={handleInputChange}
                                            required
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <TextField
                                            fullWidth
                                            label="Phone Number"
                                            name="phone"
                                            value={profileData.phone}
                                            onChange={handleInputChange}
                                            inputProps={{ maxLength: 10 }}
                                            helperText="10-digit mobile number"
                                        />
                                    </Grid>

                                    <Grid item xs={12}>
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                                            <Button
                                                type="submit"
                                                variant="contained"
                                                color="primary"
                                                startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
                                                disabled={saving}
                                            >
                                                Update Profile
                                            </Button>
                                        </Box>
                                    </Grid>
                                </Grid>
                            </Box>
                        </Grid>
                    </Grid>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ maxWidth: 600, mx: 'auto' }}>
                        <Typography variant="h6" gutterBottom>
                            Change Password
                        </Typography>
                        <Typography variant="body2" paragraph color="text.secondary">
                            Choose a strong password that is at least 8 characters long and includes a mix of letters, numbers, and special characters.
                        </Typography>

                        <PasswordChangeForm
                            onSubmit={handlePasswordChange}
                            loading={saving}
                        />
                    </Box>
                </TabPanel>
            </Paper>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default ProfileView;