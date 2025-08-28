import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Stack,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Alert,
    CircularProgress,
    InputAdornment,
    IconButton,
    Autocomplete
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import BadgeIcon from '@mui/icons-material/Badge';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import LinkIcon from '@mui/icons-material/Link';
import { createOfficial, updateOfficial } from '../api/officials';
import { fetchUsers } from '../api';

const OfficialForm = ({ official = null, selectedPanchayat, onSubmit, onCancel }) => {
    const [formData, setFormData] = useState({
        name: '',
        username: '',
        email: '',
        phone: '',
        role: 'GUEST',
        panchayatId: selectedPanchayat?._id || '',
        linkedCitizenId: official?.linkedCitizenId || ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [citizens, setCitizens] = useState([]);
    const [selectedCitizen, setSelectedCitizen] = useState(null);

    // Role options with labels
    const roleOptions = [
        { value: 'GUEST', label: 'Guest User (Police, DM, etc.)' },
        { value: 'SECRETARY', label: 'Panchayat Secretary' },
        { value: 'PRESIDENT', label: 'Panchayat President' },
        { value: 'WARD_MEMBER', label: 'Ward Member' },
        { value: 'COMMITTEE_SECRETARY', label: 'Committee Secretary' }
    ];

    // Fetch citizens when component mounts
    useEffect(() => {
        const loadCitizens = async () => {
            try {
                if (selectedPanchayat?._id) {
                    const response = await fetchUsers(selectedPanchayat._id);
                    setCitizens(response || []);
                }
            } catch (err) {
                console.error('Error loading citizens:', err);
            }
        };
        loadCitizens();
    }, [selectedPanchayat]);

    // Initialize form with official data if editing
    useEffect(() => {
        if (official) {
            setFormData({
                name: official.name || '',
                username: official.username || '',
                email: official.email || '',
                phone: official.phone || '',
                role: official.role || 'GUEST',
                panchayatId: selectedPanchayat?._id || '',
                linkedCitizenId: official.linkedCitizenId || null
            });

            // Set selected citizen if official has one linked
            if (official.linkedCitizenId) {
                const linkedCitizen = citizens.find(c => c._id === official.linkedCitizenId);
                setSelectedCitizen(linkedCitizen || null);
            }
        }
    }, [official, selectedPanchayat, citizens]);

    // Handle input changes
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Clear error when user types
        if (error) setError('');
    };

    // Handle citizen selection
    const handleCitizenChange = (event, newValue) => {
        setSelectedCitizen(newValue);
        setFormData(prev => ({
            ...prev,
            linkedCitizenId: newValue?._id || '',
            // Auto-fill some fields from citizen data
            name: newValue?.name || prev.name,
            email: newValue?.email || prev.email,
            phone: newValue?.phone || prev.phone
        }));
    };

    // Validate form
    const validateForm = () => {
        if (!formData.name.trim()) return 'Name is required';
        if (!formData.username.trim()) return 'Username is required';
        if (!formData.email.trim()) return 'Email is required';
        if (!/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/.test(formData.email)) {
            return 'Please enter a valid email address';
        }
        if (formData.phone && !/^\d{10}$/.test(formData.phone)) {
            return 'Please enter a valid 10-digit phone number';
        }
        if (!formData.role) return 'Role is required';
        if (!formData.panchayatId) return 'Panchayat is required';
        // Does not require linkedCitizenId for GUEST or SECRETARY roles
        if (official && (formData.role && (formData.role !== "GUEST" && formData.role !== "SECRETARY")) && !formData.linkedCitizenId) return 'Please link a citizen from the panchayat';
        return null;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        const validationError = validateForm();
        if (validationError) {
            setError(validationError);
            return;
        }

        setLoading(true);
        setError('');

        try {
            // For new officials, include linkedCitizenId if it exists
            const submissionData = {
                ...formData,
                // Only include linkedCitizenId if it's not empty
                ...(formData.linkedCitizenId ? { linkedCitizenId: formData.linkedCitizenId } : {})
            };

            const response = official
                ? await updateOfficial(official._id, submissionData)
                : await createOfficial(submissionData);

            if (response.success) {
                onSubmit(response.data);
            } else {
                setError(response.message || 'Failed to save official');
            }
        } catch (err) {
            setError(err.message || 'An error occurred while saving the official');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            <Stack spacing={3}>
                {/* Link Citizen Section */}
                <Box>
                    <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: 'medium' }}>
                        Link with Citizen
                    </Typography>
                    <Alert severity="info" sx={{ mb: 2 }}>
                        Select a citizen from the panchayat to link with this official account.
                        This will auto-fill some basic information.
                    </Alert>
                    <Autocomplete
                        value={selectedCitizen}
                        onChange={handleCitizenChange}
                        options={citizens}
                        getOptionLabel={(citizen) => `${citizen.name} (${citizen.voterIdNumber})`}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                label="Select Citizen"
                                required={formData.role !== 'GUEST' && formData.role !== 'SECRETARY'}
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <LinkIcon color="action" />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        )}
                    />
                </Box>

                {/* Basic Information Section */}
                <Box>
                    <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: 'medium' }}>
                        Basic Information
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Full Name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Phone Number"
                            name="phone"
                            value={formData.phone}
                            onChange={handleChange}
                            placeholder="10-digit mobile number"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PhoneIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Stack>
                </Box>

                {/* Login Credentials Section */}
                <Box>
                    <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: 'medium' }}>
                        Login Credentials
                    </Typography>
                    <Stack spacing={2}>
                        <TextField
                            fullWidth
                            label="Username"
                            name="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            disabled={official !== null}
                            helperText="4-30 characters, letters, numbers, underscore"
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <AccountCircleIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <TextField
                            fullWidth
                            label="Email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    </Stack>
                </Box>

                {/* Role & Assignment Section */}
                <Box>
                    <Typography variant="subtitle1" color="primary" gutterBottom sx={{ fontWeight: 'medium' }}>
                        Role & Assignment
                    </Typography>
                    <Stack spacing={2}>
                        <FormControl fullWidth>
                            <InputLabel id="role-label">Role</InputLabel>
                            <Select
                                labelId="role-label"
                                name="role"
                                value={formData.role}
                                onChange={handleChange}
                                required
                                startAdornment={
                                    <InputAdornment position="start">
                                        <BadgeIcon color="action" />
                                    </InputAdornment>
                                }
                            >
                                {roleOptions.map(role => (
                                    <MenuItem key={role.value} value={role.value}>
                                        {role.label}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <TextField
                            fullWidth
                            label="Panchayat"
                            value={selectedPanchayat?.name || ''}
                            disabled
                            InputProps={{
                                readOnly: true,
                            }}
                        />
                    </Stack>
                </Box>

                {/* Action Buttons */}
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 4 }}>
                    <Button
                        variant="outlined"
                        onClick={onCancel}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        {official ? 'Update Official' : 'Create Official'}
                    </Button>
                </Box>
            </Stack>
        </Box>
    );
};

export default OfficialForm; 