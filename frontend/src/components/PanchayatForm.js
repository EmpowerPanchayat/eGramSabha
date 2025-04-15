import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Grid,
    Typography,
    IconButton,
    InputAdornment,
    Box,
    Divider,
    CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PublicIcon from '@mui/icons-material/Public';
import GroupsIcon from '@mui/icons-material/Groups';
import LanguageIcon from '@mui/icons-material/Language';
import SettingsIcon from '@mui/icons-material/Settings';
import WardManager from './WardManager';

import { fetchWards, createWard, updateWard, deleteWard } from '../api';


const PanchayatForm = ({
    open,
    onClose,
    onSubmit,
    panchayat = null,
    loading = false
}) => {
    // Initial form state based on whether we're editing or creating
    const initialFormState = {
        name: '',
        state: '',
        district: '',
        villages: '',
        block: '',
        geolocation: '',
        population: '',
        language: '',
        sabhaCriteria: '',
        officialWhatsappNumber: ''
    };

    const [formValues, setFormValues] = useState(initialFormState);
    const [formErrors, setFormErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [wards, setWards] = useState([]);
    const [wardsLoading, setWardsLoading] = useState(false);
    const [wardsError, setWardsError] = useState(null);

    // Initialize form when opening modal or changing panchayat
    useEffect(() => {
        if (open) {
            if (panchayat) {
                // Editing existing panchayat
                setFormValues({
                    name: panchayat.name || '',
                    state: panchayat.state || '',
                    district: panchayat.district || '',
                    villages: panchayat.villages || '',
                    block: panchayat.block || '',
                    geolocation: panchayat.geolocation || '',
                    population: panchayat.population ? String(panchayat.population) : '',
                    language: panchayat.language || '',
                    sabhaCriteria: panchayat.sabhaCriteria ? String(panchayat.sabhaCriteria) : '',
                    officialWhatsappNumber: panchayat.officialWhatsappNumber || ''
                });

                if (panchayat._id)
                    fetchPanchayatWards(panchayat._id);
            } else {
                // Creating new panchayat
                setFormValues(initialFormState);
                setWards([]);
            }
            // Clear any previous errors
            setFormErrors({});
            setWardsError(null);
        }
    }, [open, panchayat]);

    // Function to fetch wards for a panchayat
    const fetchPanchayatWards = async (panchayatId) => {
        setWardsLoading(true);
        setWardsError(null);
        try {
            const wardsData = await fetchWards(panchayatId);
            setWards(wardsData);
        } catch (error) {
            console.error('Error fetching wards:', error);
            setWardsError('Failed to load wards: ' + error.message);
        } finally {
            setWardsLoading(false);
        }
    };

    // Function to handle changes to wards from the WardManager
    const handleWardsChange = (updatedWards) => {
        setWards(updatedWards);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // For numeric fields, sanitize input
        if (name === 'population' || name === 'sabhaCriteria') {
            // Only allow numbers
            if (value === '' || /^\d*$/.test(value)) {
                setFormValues({ ...formValues, [name]: value });
            }
            // Don't update if non-numeric characters
            return;
        }

        // For WhatsApp, only allow numbers and limit length
        if (name === 'officialWhatsappNumber') {
            if (value === '' || (/^\d*$/.test(value) && value.length <= 10)) {
                setFormValues({ ...formValues, [name]: value });
            }
            // Don't update if non-numeric or exceeds 10 digits
            return;
        }

        // For all other fields
        setFormValues({ ...formValues, [name]: value });

        // Clear error for this field if it exists
        if (formErrors[name]) {
            setFormErrors({ ...formErrors, [name]: '' });
        }
    };

    const validateForm = () => {
        const errors = {};
        const nameRegex = /^[a-zA-Z0-9\s\-_().&,']+$/; // Allow letters, numbers, spaces, and some special chars

        // Name validation
        if (!formValues.name.trim()) {
            errors.name = 'Name is required';
        } else if (formValues.name.trim().length > 255) {
            errors.name = 'Name must be less than 255 characters';
        } else if (!nameRegex.test(formValues.name)) {
            errors.name = 'Name contains invalid characters';
        }

        // State validation
        if (!formValues.state.trim()) {
            errors.state = 'State is required';
        } else if (formValues.state.trim().length > 100) {
            errors.state = 'State must be less than 100 characters';
        } else if (!/^[a-zA-Z\s]+$/.test(formValues.state)) {
            errors.state = 'State should only contain letters and spaces';
        }

        // District validation
        if (!formValues.district.trim()) {
            errors.district = 'District is required';
        } else if (formValues.district.trim().length > 100) {
            errors.district = 'District must be less than 100 characters';
        } else if (!/^[a-zA-Z\s\-]+$/.test(formValues.district)) {
            errors.district = 'District should only contain letters, spaces, and hyphens';
        }

        // Block validation (optional)
        if (formValues.block && formValues.block.length > 100) {
            errors.block = 'Block must be less than 100 characters';
        } else if (formValues.block && !/^[a-zA-Z0-9\s\-]+$/.test(formValues.block)) {
            errors.block = 'Block should only contain letters, numbers, spaces, and hyphens';
        }

        // Language validation (optional)
        if (formValues.language && formValues.language.length > 100) {
            errors.language = 'Language must be less than 100 characters';
        } else if (formValues.language && !/^[a-zA-Z\s,]+$/.test(formValues.language)) {
            errors.language = 'Language should only contain letters, spaces, and commas';
        }

        // Population validation (optional but must be a valid number)
        if (formValues.population) {
            const population = Number(formValues.population);
            if (isNaN(population) || !Number.isInteger(population) || population < 0) {
                errors.population = 'Population must be a positive integer';
            } else if (population > 10000000) { // 10 million cap
                errors.population = 'Population value is too large';
            }
        }

        // Sabha Criteria validation (optional but must be a valid number)
        if (formValues.sabhaCriteria) {
            const criteria = Number(formValues.sabhaCriteria);
            if (isNaN(criteria) || !Number.isInteger(criteria) || criteria < 0) {
                errors.sabhaCriteria = 'Sabha criteria must be a positive integer';
            } else if (criteria > 10000) { // 10,000 cap
                errors.sabhaCriteria = 'Sabha criteria value is too large';
            }
        }

        // WhatsApp validation (optional but must be a valid 10-digit number)
        if (formValues.officialWhatsappNumber) {
            if (!/^\d{10}$/.test(formValues.officialWhatsappNumber)) {
                errors.officialWhatsappNumber = 'WhatsApp number must be exactly 10 digits';
            }
        }

        // Geolocation validation (optional but must be in a valid format if provided)
        if (formValues.geolocation) {
            // Simple validation for lat,long format
            if (!/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(formValues.geolocation)) {
                errors.geolocation = 'Geolocation should be in format: latitude,longitude';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) {
            return;
        }

        setIsSubmitting(true);

        try {
            // Convert numeric string values to numbers
            const formData = {
                ...formValues,
                population: formValues.population ? Number(formValues.population) : undefined,
                sabhaCriteria: formValues.sabhaCriteria ? Number(formValues.sabhaCriteria) : undefined
            };

            // Pass the panchayat ID if we're editing
            if (panchayat && panchayat._id) {
                formData._id = panchayat._id;
            }

            // Submit the panchayat data
            const result = await onSubmit(formData);

            // Process wards if panchayat was successfully created/updated
            if (result && result.panchayat && result.panchayat._id) {
                const panchayatId = result.panchayat._id;

                // For each ward in the local state:
                // - If it has a temporary ID, create it
                // - If it exists on server but not in local state, delete it
                // - If it exists in both, update it

                // Get existing wards from the server
                let existingWards = [];
                try {
                    existingWards = await fetchWards(panchayatId);
                } catch (error) {
                    console.error('Error fetching existing wards:', error);
                    // Continue with empty array if fetch fails
                }

                // Create or update wards
                for (const ward of wards) {
                    const wardData = {
                        name: ward.name,
                        geolocation: ward.geolocation,
                        population: ward.population
                    };

                    // Check if this is a new ward (with temporary ID)
                    if (ward._id.toString().startsWith('temp-')) {
                        await createWard(panchayatId, wardData);
                    } else {
                        // Check if this ward exists in existingWards
                        const existingWard = existingWards.find(w => w._id === ward._id);
                        if (existingWard) {
                            await updateWard(panchayatId, ward._id, wardData);
                        } else {
                            // This should not happen, but create it just in case
                            await createWard(panchayatId, wardData);
                        }
                    }
                }

                // Find wards that exist on server but not in local state (deleted)
                for (const existingWard of existingWards) {
                    const stillExists = wards.some(w => w._id === existingWard._id);
                    if (!stillExists) {
                        await deleteWard(panchayatId, existingWard._id);
                    }
                }
            }

            onClose();
        } catch (error) {
            console.error('Error submitting form:', error);
            // If there was an error, keep the form open
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 2,
                    maxHeight: '90vh'
                }
            }}
        >
            <DialogTitle sx={{
                bgcolor: 'primary.main',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                py: 2
            }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PublicIcon />
                    <Typography variant="h6">
                        {panchayat ? 'Edit Panchayat' : 'Add New Panchayat'}
                    </Typography>
                </Box>
                <IconButton
                    edge="end"
                    color="inherit"
                    onClick={onClose}
                    aria-label="close"
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 0 }}>
                <Box sx={{ p: 3 }}>
                    {/* Basic Information Section */}
                    <Box sx={{ mb: 4 }}>
                        <Typography 
                            variant="subtitle1" 
                            sx={{ 
                                color: 'primary.main',
                                fontWeight: 600,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <PublicIcon fontSize="small" />
                            Basic Information
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    autoFocus
                                    name="name"
                                    label="Panchayat Name"
                                    value={formValues.name}
                                    onChange={handleInputChange}
                                    fullWidth
                                    required
                                    error={Boolean(formErrors.name)}
                                    helperText={formErrors.name}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="block"
                                    label="Block"
                                    value={formValues.block}
                                    onChange={handleInputChange}
                                    fullWidth
                                    error={Boolean(formErrors.block)}
                                    helperText={formErrors.block}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Location Section */}
                    <Box sx={{ mb: 4 }}>
                        <Typography 
                            variant="subtitle1" 
                            sx={{ 
                                color: 'primary.main',
                                fontWeight: 600,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <LocationOnIcon fontSize="small" />
                            Location Details
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="state"
                                    label="State"
                                    value={formValues.state}
                                    onChange={handleInputChange}
                                    fullWidth
                                    required
                                    error={Boolean(formErrors.state)}
                                    helperText={formErrors.state}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="district"
                                    label="District"
                                    value={formValues.district}
                                    onChange={handleInputChange}
                                    fullWidth
                                    required
                                    error={Boolean(formErrors.district)}
                                    helperText={formErrors.district}
                                />
                            </Grid>
                            <Grid item xs={12}>
                                <TextField
                                    name="geolocation"
                                    label="Geolocation"
                                    value={formValues.geolocation}
                                    onChange={handleInputChange}
                                    fullWidth
                                    error={Boolean(formErrors.geolocation)}
                                    helperText={formErrors.geolocation || "Format: latitude,longitude"}
                                    placeholder="e.g. 28.6139,77.2090"
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Demographics Section */}
                    <Box sx={{ mb: 4 }}>
                        <Typography 
                            variant="subtitle1" 
                            sx={{ 
                                color: 'primary.main',
                                fontWeight: 600,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <GroupsIcon fontSize="small" />
                            Demographics & Communication
                        </Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="population"
                                    label="Population"
                                    value={formValues.population}
                                    onChange={handleInputChange}
                                    fullWidth
                                    error={Boolean(formErrors.population)}
                                    helperText={formErrors.population}
                                    type="text"
                                    InputProps={{
                                        inputMode: 'numeric',
                                        pattern: '[0-9]*'
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="language"
                                    label="Primary Language"
                                    value={formValues.language}
                                    onChange={handleInputChange}
                                    fullWidth
                                    error={Boolean(formErrors.language)}
                                    helperText={formErrors.language}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="officialWhatsappNumber"
                                    label="Official WhatsApp"
                                    value={formValues.officialWhatsappNumber}
                                    onChange={handleInputChange}
                                    fullWidth
                                    error={Boolean(formErrors.officialWhatsappNumber)}
                                    helperText={formErrors.officialWhatsappNumber || "10-digit number"}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <WhatsAppIcon color="primary" />
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    name="sabhaCriteria"
                                    label="Sabha Criteria"
                                    value={formValues.sabhaCriteria}
                                    onChange={handleInputChange}
                                    fullWidth
                                    error={Boolean(formErrors.sabhaCriteria)}
                                    helperText={formErrors.sabhaCriteria}
                                    type="text"
                                    InputProps={{
                                        inputMode: 'numeric',
                                        pattern: '[0-9]*'
                                    }}
                                />
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Villages Section */}
                    <Box>
                        <Typography 
                            variant="subtitle1" 
                            sx={{ 
                                color: 'primary.main',
                                fontWeight: 600,
                                mb: 2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1
                            }}
                        >
                            <LocationOnIcon fontSize="small" />
                            Villages
                        </Typography>
                        <TextField
                            name="villages"
                            value={formValues.villages}
                            onChange={handleInputChange}
                            fullWidth
                            multiline
                            rows={3}
                            error={Boolean(formErrors.villages)}
                            helperText={formErrors.villages || "Enter comma-separated list of villages"}
                            placeholder="e.g. Rampur, Sitapur, Ganeshpur"
                        />
                    </Box>

                    {/* Add the wards section */}
                    <WardManager
                        panchayatId={panchayat?._id}
                        initialWards={wards}
                        onChange={handleWardsChange}
                        readOnly={false}
                        error={wardsError}
                    />
                </Box>
            </DialogContent>

            <DialogActions sx={{ 
                px: 3, 
                py: 2,
                bgcolor: 'grey.50',
                borderTop: 1,
                borderColor: 'divider'
            }}>
                <Button
                    onClick={onClose}
                    color="inherit"
                    disabled={isSubmitting || loading}
                >
                    Cancel
                </Button>
                <Button
                    onClick={handleSubmit}
                    variant="contained"
                    color="primary"
                    disabled={isSubmitting || loading}
                    startIcon={isSubmitting || loading ? <CircularProgress size={20} /> : null}
                >
                    {panchayat ? 'Update Panchayat' : 'Create Panchayat'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default PanchayatForm;