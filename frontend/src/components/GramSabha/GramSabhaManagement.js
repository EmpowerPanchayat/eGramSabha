import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Typography,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    TextField,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    IconButton,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Alert,
    CircularProgress,
    Divider
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
    fetchGramSabhaMeetings,
    createGramSabhaMeeting,
    updateGramSabhaMeeting,
    deleteGramSabhaMeeting
} from '../../api/gram-sabha';
import { useAuth } from '../../utils/authContext';
import { useLanguage } from '../../utils/LanguageContext';

const GramSabhaManagement = ({ panchayatId }) => {
    const { strings } = useLanguage();
    const [gramSabhas, setGramSabhas] = useState([]);
    const [openDialog, setOpenDialog] = useState(false);
    const [selectedGramSabha, setSelectedGramSabha] = useState(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [meetingToDelete, setMeetingToDelete] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [formData, setFormData] = useState({
        title: '',
        date: '',
        time: '',
        location: '',
        agenda: '',
        // description: '',
        scheduledDurationMinutes: 60 // Default duration of 1 hour
    });
    const [previewTitle, setPreviewTitle] = useState('');
    const { user, logout } = useAuth();

    useEffect(() => {
        if (!user) {
            setError('Please login to access Gram Sabha management');
            return;
        }

        // Add this check
        if (!panchayatId) {
            setError('No panchayat selected. Please select a panchayat first.');
            return;
        }

        loadGramSabhas();
    }, [panchayatId, user]);

    useEffect(() => {
        if (formData.date && formData.time) {
            const formattedDate = new Date(formData.date).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric'
            });

            const formattedTime = new Date(`2000-01-01T${formData.time}`).toLocaleTimeString('en-IN', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
            });

            const calculatedTitle = formData.title || `Gram Sabha - ${formattedDate} - ${formattedTime}`;
            if (calculatedTitle !== previewTitle) {
                setPreviewTitle(calculatedTitle);
            }
        }
    }, [formData.date, formData.time, formData.title, previewTitle]);

    const loadGramSabhas = async () => {
        // Add this check
        if (!panchayatId) {
            setError('Invalid panchayat ID');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const data = await fetchGramSabhaMeetings(panchayatId);
            setGramSabhas(data);
        } catch (error) {
            setError(error.message || 'Failed to load Gram Sabha meetings');
            console.error('Error loading Gram Sabhas:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenDialog = (gramSabha = null) => {
        if (gramSabha) {
            setSelectedGramSabha(gramSabha);
            const dateTime = new Date(gramSabha.dateTime);
            setFormData({
                title: gramSabha.title,
                date: dateTime.toISOString().split('T')[0], // Format: YYYY-MM-DD
                time: dateTime.toTimeString().slice(0, 5), // Format: HH:MM
                location: gramSabha.location,
                agenda: gramSabha.agenda,
                description: gramSabha.description,
                scheduledDurationMinutes: gramSabha.scheduledDurationMinutes
            });
        } else {
            setSelectedGramSabha(null);
            setFormData({
                title: '',
                date: '',
                time: '',
                location: '',
                agenda: '',
                description: '',
                scheduledDurationMinutes: 60 // Default duration of 1 hour
            });
        }
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setSelectedGramSabha(null);
        setError('');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newFormData = {
                ...prev,
                [name]: value
            };
            return newFormData;
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setError('Please login to create a Gram Sabha meeting');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // Combine date and time into a single dateTime field
            const dateTime = new Date(`${formData.date}T${formData.time}`);
            if (isNaN(dateTime.getTime())) {
                throw new Error('Invalid date or time format');
            }

            const data = {
                ...formData,
                panchayatId,
                title: formData.title || undefined,
                dateTime: dateTime.toISOString(),
                scheduledDurationMinutes: parseInt(formData.scheduledDurationMinutes, 10),
                scheduledById: user._id // This will be the official's ID
            };

            if (selectedGramSabha) {
                await updateGramSabhaMeeting(selectedGramSabha._id, data);
            } else {
                await createGramSabhaMeeting(data);
            }

            handleCloseDialog();
            loadGramSabhas();
        } catch (err) {
            if (err.message === 'Invalid token' || err.message === 'Token has expired') {
                logout();
                setError('Your session has expired. Please login again.');
            } else {
                setError(err.message || 'Failed to save Gram Sabha meeting');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!user) {
            setError('Please login to delete a Gram Sabha meeting');
            return;
        }

        setMeetingToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!meetingToDelete) return;

        try {
            setLoading(true);
            setError('');
            await deleteGramSabhaMeeting(meetingToDelete);
            setGramSabhas(gramSabhas.filter(meeting => meeting._id !== meetingToDelete));
            setDeleteDialogOpen(false);
            setMeetingToDelete(null);
        } catch (error) {
            if (error.response?.status === 401) {
                logout();
                setError('Your session has expired. Please login again.');
            } else if (error.response?.status === 403) {
                setError('You do not have permission to delete this Gram Sabha meeting. Only the meeting creator can delete it.');
            } else if (error.response?.status === 404) {
                setError('Gram Sabha meeting not found. It may have been already deleted or you do not have permission to delete it.');
            } else {
                setError(error.response?.data?.message || 'Failed to delete Gram Sabha meeting');
            }
        } finally {
            setLoading(false);
        }
    };

    const cancelDelete = () => {
        setDeleteDialogOpen(false);
        setMeetingToDelete(null);
    };

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h4">{strings.gramSabhaManagement}</Typography>
                <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    onClick={() => handleOpenDialog()}
                    disabled={loading}
                >
                    {strings.scheduleMeeting}
                </Button>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box display="flex" justifyContent="center" p={3}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper}>
                    <Table>
                        <TableHead>
                            <TableRow>
                                <TableCell>{strings.tableTitle}</TableCell>
                                <TableCell>{strings.tableDateTime}</TableCell>
                                <TableCell>{strings.tableLocation}</TableCell>
                                <TableCell>{strings.tableDuration}</TableCell>
                                <TableCell>{strings.tableStatus}</TableCell>
                                <TableCell>{strings.tableActions}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {gramSabhas.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        {strings.noDataToDisplay}
                                    </TableCell>
                                </TableRow>
                            ) : (
                                gramSabhas.map((gramSabha) => (
                                    <TableRow key={gramSabha._id}>
                                        <TableCell>{gramSabha.title}</TableCell>
                                        <TableCell>{new Date(gramSabha.dateTime).toLocaleString()}</TableCell>
                                        <TableCell>{gramSabha.location}</TableCell>
                                        <TableCell>{gramSabha.scheduledDurationMinutes} minutes</TableCell>
                                        <TableCell>{gramSabha.status}</TableCell>
                                        <TableCell>
                                            <IconButton onClick={() => handleOpenDialog(gramSabha)} disabled={loading}>
                                                <EditIcon />
                                            </IconButton>
                                            {/* Commenting out delete action as requested
                                            <IconButton onClick={() => handleDelete(gramSabha._id)} disabled={loading}>
                                                <DeleteIcon />
                                            </IconButton>
                                            */}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
                <DialogTitle>
                    {selectedGramSabha ? strings.editMeeting : strings.createMeeting}
                </DialogTitle>
                <DialogContent>
                    <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
                        <Stack spacing={3}>
                            <TextField
                                fullWidth
                                label={strings.titleOptional}
                                name="title"
                                value={formData.title}
                                onChange={handleInputChange}
                                helperText={strings.titleHelperText}
                            />
                            
                            <Typography variant="subtitle2" color="text.secondary">
                                {strings.previewTitle}: {previewTitle}
                            </Typography>
                            
                            <Divider />
                            
                            <Stack spacing={2}>
                                <Typography variant="subtitle1" fontWeight="medium">
                                    {strings.date} & {strings.time}
                                </Typography>
                                <Stack direction="row" spacing={2}>
                                    <TextField
                                        fullWidth
                                        label={strings.date}
                                        name="date"
                                        type="date"
                                        value={formData.date}
                                        onChange={handleInputChange}
                                        InputLabelProps={{ shrink: true }}
                                        required
                                    />
                                    <TextField
                                        fullWidth
                                        label={strings.time}
                                        name="time"
                                        type="time"
                                        value={formData.time}
                                        onChange={handleInputChange}
                                        InputLabelProps={{ shrink: true }}
                                        required
                                    />
                                </Stack>
                            </Stack>

                            <TextField
                                fullWidth
                                label={strings.duration}
                                name="scheduledDurationMinutes"
                                type="number"
                                value={formData.scheduledDurationMinutes}
                                onChange={handleInputChange}
                                InputProps={{ inputProps: { min: 15, max: 480 } }}
                                helperText={strings.durationHelperText}
                                required
                            />

                            <TextField
                                fullWidth
                                label={strings.location}
                                name="location"
                                value={formData.location}
                                onChange={handleInputChange}
                                required
                            />

                            <TextField
                                fullWidth
                                label={strings.agenda}
                                name="agenda"
                                value={formData.agenda}
                                onChange={handleInputChange}
                                multiline
                                rows={6}
                                required
                                helperText={strings.agendaHelperText}
                            />

                            {/* <TextField
                                fullWidth
                                label={strings.description}
                                name="description"
                                value={formData.description}
                                onChange={handleInputChange}
                                multiline
                                rows={4}
                                helperText={strings.descriptionHelperText}
                            /> */}
                        </Stack>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseDialog}>{strings.cancel}</Button>
                    <Button
                        onClick={handleSubmit}
                        variant="contained"
                        color="primary"
                        disabled={loading || !formData.date || !formData.time || !formData.agenda}
                    >
                        {loading ? <CircularProgress size={24} /> : strings.save}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={deleteDialogOpen}
                onClose={cancelDelete}
                aria-labelledby="delete-dialog-title"
                aria-describedby="delete-dialog-description"
            >
                <DialogTitle id="delete-dialog-title">
                    {strings.deleteMeeting}
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="delete-dialog-description">
                        {strings.deleteConfirmation}
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={cancelDelete} disabled={loading}>
                        {strings.cancel}
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        color="error"
                        variant="contained"
                        disabled={loading}
                        startIcon={loading ? <CircularProgress size={20} /> : null}
                    >
                        {strings.delete}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default GramSabhaManagement; 