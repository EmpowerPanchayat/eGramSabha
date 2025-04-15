// Create a new component: frontend/src/components/WardManager.js
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    TextField,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Grid,
    Divider,
    Alert,
    Tooltip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import GroupsIcon from '@mui/icons-material/Groups';

const WardManager = ({
    panchayatId,
    initialWards = [],
    onChange,
    readOnly = false,
    error = null
}) => {
    const [wards, setWards] = useState(initialWards);
    const [currentWard, setCurrentWard] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [formValues, setFormValues] = useState({
        name: '',
        geolocation: '',
        population: ''
    });
    const [formErrors, setFormErrors] = useState({});

    // Update wards when initialWards changes
    useEffect(() => {
        setWards(initialWards);
    }, [initialWards]);

    // Update parent component when wards change
    useEffect(() => {
        if (onChange) {
            onChange(wards);
        }
    }, [wards]);

    const handleOpenDialog = (ward = null) => {
        if (ward) {
            setCurrentWard(ward);
            setFormValues({
                name: ward.name || '',
                geolocation: ward.geolocation || '',
                population: ward.population ? String(ward.population) : ''
            });
        } else {
            setCurrentWard(null);
            setFormValues({
                name: '',
                geolocation: '',
                population: ''
            });
        }
        setFormErrors({});
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setCurrentWard(null);
    };

    const handleOpenDeleteDialog = (ward) => {
        setCurrentWard(ward);
        setDeleteDialogOpen(true);
    };

    const handleCloseDeleteDialog = () => {
        setDeleteDialogOpen(false);
        setCurrentWard(null);
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;

        // For numeric fields, sanitize input
        if (name === 'population') {
            // Only allow numbers
            if (value === '' || /^\d*$/.test(value)) {
                setFormValues({ ...formValues, [name]: value });
            }
            return;
        }

        setFormValues({ ...formValues, [name]: value });

        // Clear error for this field if it exists
        if (formErrors[name]) {
            setFormErrors({ ...formErrors, [name]: '' });
        }
    };

    const validateForm = () => {
        const errors = {};

        // Name is required
        if (!formValues.name.trim()) {
            errors.name = 'Ward name is required';
        } else if (formValues.name.trim().length > 255) {
            errors.name = 'Name must be less than 255 characters';
        }

        // Geolocation validation (optional)
        if (formValues.geolocation) {
            if (!/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(formValues.geolocation)) {
                errors.geolocation = 'Geolocation should be in format: latitude,longitude';
            }
        }

        // Population validation (optional but must be a valid number)
        if (formValues.population) {
            const population = Number(formValues.population);
            if (isNaN(population) || !Number.isInteger(population) || population < 0) {
                errors.population = 'Population must be a positive integer';
            } else if (population > 1000000) { // 1 million cap
                errors.population = 'Population value is too large';
            }
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) {
            return;
        }

        // Create or update ward in local state
        const wardData = {
            name: formValues.name,
            geolocation: formValues.geolocation,
            population: formValues.population ? Number(formValues.population) : undefined
        };

        if (currentWard) {
            // Update existing ward
            const updatedWards = wards.map(ward =>
                ward._id === currentWard._id ? { ...currentWard, ...wardData } : ward
            );
            setWards(updatedWards);
        } else {
            // Create new ward with temporary ID (will be replaced with real ID from server later)
            const newWard = {
                ...wardData,
                _id: `temp-${Date.now()}`,
                panchayatId: panchayatId
            };
            setWards([...wards, newWard]);
        }

        handleCloseDialog();
    };

    const handleDelete = () => {
        if (!currentWard) return;

        // Remove ward from local state
        const updatedWards = wards.filter(ward => ward._id !== currentWard._id);
        setWards(updatedWards);
        handleCloseDeleteDialog();
    };

    return (
        <Box sx={{ mt: 3 }}>
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
                Wards Management
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Paper variant="outlined" sx={{ mb: 2, p: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                        Manage the wards within this panchayat. Each ward represents a geographical subdivision.
                    </Typography>
                    {!readOnly && (
                        <Button
                            variant="contained"
                            color="primary"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={() => handleOpenDialog()}
                        >
                            Add Ward
                        </Button>
                    )}
                </Box>

                {wards.length === 0 ? (
                    <Alert severity="info" sx={{ my: 2 }}>
                        No wards have been added to this panchayat yet.
                    </Alert>
                ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 300 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Ward Name</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Population</TableCell>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Geolocation</TableCell>
                                    {!readOnly && <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>}
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {wards.map((ward) => (
                                    <TableRow key={ward._id} hover>
                                        <TableCell>{ward.name}</TableCell>
                                        <TableCell>{ward.population || 'N/A'}</TableCell>
                                        <TableCell>{ward.geolocation || 'N/A'}</TableCell>
                                        {!readOnly && (
                                            <TableCell align="right">
                                                <Tooltip title="Edit">
                                                    <IconButton
                                                        size="small"
                                                        color="primary"
                                                        onClick={() => handleOpenDialog(ward)}
                                                    >
                                                        <EditIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="Delete">
                                                    <IconButton
                                                        size="small"
                                                        color="error"
                                                        onClick={() => handleOpenDeleteDialog(ward)}
                                                    >
                                                        <DeleteIcon fontSize="small" />
                                                    </IconButton>
                                                </Tooltip>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Ward Form Dialog */}
            <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {currentWard ? 'Edit Ward' : 'Add New Ward'}
                </DialogTitle>
                <DialogContent dividers>
                    <Grid container spacing={2}>
                        <Grid item xs={12}>
                            <TextField
                                name="name"
                                label="Ward Name"
                                value={formValues.name}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                error={Boolean(formErrors.name)}
                                helperText={formErrors.name}
                                autoFocus
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="population"
                                label="Population"
                                value={formValues.population}
                                onChange={handleInputChange}
                                fullWidth
                                error={Boolean(formErrors.population)}
                                helperText={formErrors.population}
                                InputProps={{
                                    startAdornment: (
                                        <GroupsIcon sx={{ mr: 1, color: 'action.active' }} />
                                    ),
                                }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                name="geolocation"
                                label="Geolocation"
                                value={formValues.geolocation}
                                onChange={handleInputChange}
                                fullWidth
                                error={Boolean(formErrors.geolocation)}
                                helperText={formErrors.geolocation || "Format: latitude,longitude"}
                                placeholder="e.g. 28.6139,77.2090"
                                InputProps={{
                                    startAdornment: (
                                        <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} />
                                    ),
                                }}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog} color="inherit">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        color="primary"
                        variant="contained"
                    >
                        {currentWard ? 'Update' : 'Add'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onClose={handleCloseDeleteDialog}>
                <DialogTitle>Confirm Deletion</DialogTitle>
                <DialogContent>
                    <Typography>
                        Are you sure you want to delete the ward <strong>{currentWard?.name}</strong>?
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDeleteDialog} color="inherit">
                        Cancel
                    </Button>
                    <Button onClick={handleDelete} color="error" variant="contained">
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default WardManager;