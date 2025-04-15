// File: frontend/src/components/officials/OfficialForm.js
import React, { useState, useEffect } from 'react';
import {
    Box,
    TextField,
    Button,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Alert,
    CircularProgress,
    Divider,
    Typography,
    Chip
} from '@mui/material';
import { createOfficial, updateOfficial } from '../api/officials';
import { fetchWards } from '../api';
import PanchayatSelector from '../components/PanchayatSelector';

const OfficialForm = ({ official, onSubmit, onCancel }) => {
    const initialFormData = {
        username: '',
        email: '',
        name: '',
        role: 'GUEST',
        panchayatId: '',
        phone: '',
        wardId: ''
    };

    const [formData, setFormData] = useState(initialFormData);
    const [errors, setErrors] = useState({});
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState('');
    const [wards, setWards] = useState([]);
    const [initialPassword, setInitialPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // Load official data for editing
    useEffect(() => {
        if (official) {
            setFormData({
                username: official.username || '',
                email: official.email || '',
                name: official.name || '',
                role: official.role || 'GUEST',
                panchayatId: official.panchayatId || '',
                phone: official.phone || '',
                wardId: official.wardId || ''
            });

            if (official.panchayatId) {
                loadWards(official.panchayatId);
            }
        }
    }, [official]);

    // Handle input changes
    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // Special validation for phone (only allow numbers)
        if (name === 'phone' && value !== '' && !/^\d*$/.test(value)) {
            return;
        }

        setFormData({
            ...formData,
            [name]: value
        });

        // Clear error for this field
        if (errors[name]) {
            setErrors({
                ...errors,
                [name]: ''
            });
        }
    };

    // Handle panchayat selection
    const handlePanchayatChange = (panchayatId) => {
        setFormData({
            ...formData,
            panchayatId,
            // Reset wardId when panchayat changes
            wardId: ''
        });

        if (panchayatId) {
            loadWards(panchayatId);
        } else {
            setWards([]);
        }
    };

    // Load wards for a selected panchayat
    const loadWards = async (panchayatId) => {
        try {
            const response = await fetchWards(panchayatId);
            setWards(response.wards || []);
        } catch (err) {
            console.error('Error loading wards:', err);
            setWards([]);
        }
    };

    // Validate form
    const validateForm = () => {
        const newErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const phoneRegex = /^\d{10}$/;
        const usernameRegex = /^[a-zA-Z0-9_]{4,30}$/;

        if (!formData.username) {
            newErrors.username = 'Username is required';
        } else if (!usernameRegex.test(formData.username)) {
            newErrors.username = 'Username must be 4-30 characters and contain only letters, numbers, and underscores';
        }

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!emailRegex.test(formData.email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!formData.name) {
            newErrors.name = 'Name is required';
        }

        if (!formData.role) {
            newErrors.role = 'Role is required';
        }

        // Only validate panchayatId if role is not ADMIN
        if (formData.role !== 'ADMIN' && !formData.panchayatId) {
            newErrors.panchayatId = 'Panchayat is required for non-admin roles';
        }

        // Validate wardId for WARD_MEMBER role
        if (formData.role === 'WARD_MEMBER' && !formData.wardId) {
            newErrors.wardId = 'Ward is required for Ward Member role';
        }

        // Validate phone if provided
        if (formData.phone && !phoneRegex.test(formData.phone)) {
            newErrors.phone = 'Phone number must be 10 digits';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setErrorMessage('');

        try {
            let response;

            if (official) {
                // Update existing official
                response = await updateOfficial(official.id, formData);
            } else {
                // Create new official
                response = await createOfficial(formData);

                if (response.data?.initialPassword) {
                    setInitialPassword(response.data.initialPassword);
                    setShowPassword(true);
                }
            }

            if (onSubmit) {
                onSubmit(response.data);
            }
        } catch (err) {
            console.error('Error saving official:', err);
            setErrorMessage(err.message || 'Error saving official. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box component="form" onSubmit={handleSubmit} noValidate>
            {errorMessage && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {errorMessage}
                </Alert>
            )}

            {showPassword && initialPassword && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body2" gutterBottom>
                        Official created successfully! The initial password is:
                    </Typography>
                    <Typography variant="h6" sx={{ my: 1, textAlign: 'center' }}>
                        <Chip
                            label={initialPassword}
                            color="primary"
                            sx={{ fontWeight: 'bold', fontSize: '1.1rem', py: 2 }}
                        />
                    </Typography>
                    <Typography variant="body2">
                        Please provide this password to the official. They will be prompted to change it on first login.
                    </Typography>
                </Alert>
            )}

            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <Typography variant="subtitle1" color="primary">
                        Basic Information
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        error={!!errors.name}
                        helperText={errors.name}
                        disabled={loading}
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Phone Number"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        error={!!errors.phone}
                        helperText={errors.phone || "10-digit mobile number"}
                        disabled={loading}
                    />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle1" color="primary">
                        Login Credentials
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Username"
                        name="username"
                        value={formData.username}
                        onChange={handleInputChange}
                        required
                        error={!!errors.username}
                        helperText={errors.username || "4-30 characters, letters, numbers, underscore"}
                        disabled={loading || (official && official.id)} // Disable editing username for existing officials
                    />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <TextField
                        fullWidth
                        label="Email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        error={!!errors.email}
                        helperText={errors.email}
                        disabled={loading}
                    />
                </Grid>

                <Grid item xs={12}>
                    <Typography variant="subtitle1" color="primary">
                        Role & Assignment
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                </Grid>

                <Grid item xs={12} sm={6}>
                    <FormControl fullWidth error={!!errors.role} disabled={loading}>
                        <InputLabel id="role-label">Role</InputLabel>
                        <Select
                            labelId="role-label"
                            id="role"
                            name="role"
                            value={formData.role}
                            onChange={handleInputChange}
                            label="Role"
                        >
                            <MenuItem value="ADMIN">System Administrator</MenuItem>
                            <MenuItem value="SECRETARY">Panchayat Secretary</MenuItem>
                            <MenuItem value="PRESIDENT">Panchayat President</MenuItem>
                            <MenuItem value="WARD_MEMBER">Ward Member</MenuItem>
                            <MenuItem value="COMMITTEE_SECRETARY">Committee Secretary</MenuItem>
                            <MenuItem value="GUEST">Guest User (Police, DM, etc.)</MenuItem>
                        </Select>
                        {errors.role && <FormHelperText>{errors.role}</FormHelperText>}
                    </FormControl>
                </Grid>

                <Grid item xs={12} sm={6}>
                    <PanchayatSelector
                        value={formData.panchayatId}
                        onChange={handlePanchayatChange}
                        label="Panchayat"
                        required={formData.role !== 'ADMIN'}
                        error={!!errors.panchayatId}
                        helperText={errors.panchayatId}
                        disabled={loading || formData.role === 'ADMIN'}
                    />
                </Grid>

                {formData.role === 'WARD_MEMBER' && (
                    <Grid item xs={12} sm={6}>
                        <FormControl fullWidth error={!!errors.wardId} disabled={loading || !formData.panchayatId}>
                            <InputLabel id="ward-label">Ward</InputLabel>
                            <Select
                                labelId="ward-label"
                                id="wardId"
                                name="wardId"
                                value={formData.wardId}
                                onChange={handleInputChange}
                                label="Ward"
                            >
                                <MenuItem value="">
                                    <em>Select Ward</em>
                                </MenuItem>
                                {wards.map((ward) => (
                                    <MenuItem key={ward._id} value={ward._id}>
                                        {ward.name}
                                    </MenuItem>
                                ))}
                            </Select>
                            {errors.wardId && <FormHelperText>{errors.wardId}</FormHelperText>}
                            {wards.length === 0 && formData.panchayatId && (
                                <FormHelperText>No wards available for this panchayat</FormHelperText>
                            )}
                        </FormControl>
                    </Grid>
                )}
            </Grid>

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end', gap: 2 }}>
                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    startIcon={loading && <CircularProgress size={20} color="inherit" />}
                >
                    {official ? 'Update' : 'Create'} Official
                </Button>
            </Box>
        </Box>
    );
};

export default OfficialForm;