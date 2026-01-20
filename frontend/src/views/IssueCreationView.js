import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Container,
    TextField,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    FormHelperText,
    Stack,
    Alert,
    Snackbar,
    CircularProgress,
    IconButton,
    Card,
    CardContent,
    Divider,
    useTheme,
    Breadcrumbs,
    Link,
    Tooltip,
    Stepper,
    Step,
    StepLabel
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';
import MicIcon from '@mui/icons-material/Mic';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import InfoIcon from '@mui/icons-material/Info';

import AudioRecorder from '../components/AudioRecorder';
import FileUploader from '../components/FileUploader';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../utils/LanguageContext';
import { getCategories, getSubcategories } from '../utils/categoryUtils';
import tokenManager from '../utils/tokenManager';

const IssueCreationView = ({ user, onBack, onIssueCreated }) => {
    const { strings } = useLanguage();
    const theme = useTheme();
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    const [issueData, setIssueData] = useState({
        text: '',
        category: '',
        subcategory: '',
        priority: 'NORMAL',
        toBeResolvedBefore: '',
        remark: '',
    });

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    const [audioBlob, setAudioBlob] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
    });

    // Helper to get Authorization header for issues endpoints
    const getAuthHeaders = () => {
        const token = tokenManager.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

    // Fetch users when component mounts
    useEffect(() => {
        const fetchUsers = async () => {
            if (user.role && ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role)) {
                setLoadingUsers(true);
                try {
                  // Add Authorization header if token exists
                  const headers = {
                    "Content-Type": "application/json",
                    ...getAuthHeaders(),
                  };

                  const response = await fetch(
                    `${API_URL}/users/panchayat/${user.panchayatId}`,
                    { method: 'GET', headers }
                  );
                  if (response.ok) {
                    const data = await response.json();
                    setUsers(data.users || []);
                  }
                } catch (error) {
                    console.error('Error fetching users:', error);
                } finally {
                    setLoadingUsers(false);
                }
            }
        };

        fetchUsers();
    }, [user.role, user.panchayatId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setIssueData(prev => ({
            ...prev,
            [name]: value,
            // Reset subcategory when category changes
            ...(name === 'category' && { subcategory: '' })
        }));

        // Clear error for this field
        if (errors[name]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    const handleAudioRecorded = (blob) => {
        setAudioBlob(blob);
    };

    const handleFilesSelected = (files) => {
        setAttachments(files);
    };

    const validateForm = () => {
        const newErrors = {};

        if (!issueData.category) {
            newErrors.category = strings.errorMissingFields;
        }

        if (!audioBlob) {
            newErrors.audio = strings.errorMissingFields;
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        // Prepare date in ISO format for API
        const formattedData = {
            ...issueData
        };

        // Convert date string to Date object if present
        if (issueData.toBeResolvedBefore) {
            formattedData.toBeResolvedBefore = new Date(issueData.toBeResolvedBefore);
        }

        try {
            // First create the issue without attachments
            const issueResponse = await fetch(`${API_URL}/issues`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...getAuthHeaders()
                },
                body: JSON.stringify({
                    ...formattedData,
                    panchayatId: user.panchayatId,
                    creatorId: user.linkedUser?.id || user._id || user.id,
                    createdForId: formattedData?.createdFor || user._id || user.id,
                    status: 'REPORTED'
                })
            });

            if (!issueResponse.ok) {
                const errorData = await issueResponse.json();
                throw new Error(errorData.message || strings.errorReportingIssue);
            }

            const issueData = await issueResponse.json();
            const issueId = issueData.issue._id;

            // Process audio attachment if exists
            if (audioBlob) {
                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = async () => {
                    try {
                        const uploadResponse = await fetch(`${API_URL}/issues/upload-attachment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...getAuthHeaders()
                            },
                            body: JSON.stringify({
                                issueId,
                                attachmentData: reader.result,
                                filename: 'audio-recording.wav',
                                mimeType: 'audio/wav'
                            })
                        });
                    } catch (error) {
                        console.error(`[IssueCreationView] Error uploading audio attachment:`, {
                            issueId,
                            error: error.message,
                            stack: error.stack
                        });
                    }
                };
            }

            // Process file attachments
            for (const file of attachments) {
                try {
                    const uploadResponse = await fetch(`${API_URL}/issues/upload-attachment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            ...getAuthHeaders()
                        },
                        body: JSON.stringify({
                            issueId,
                            attachmentData: file.base64,
                            filename: file.name,
                            mimeType: file.type
                        })
                    });
                } catch (error) {
                    console.error(`[IssueCreationView] Error uploading file attachment:`, {
                        issueId,
                        filename: file.name,
                        error: error.message,
                        stack: error.stack
                    });
                }
            }

            // Show success message
            setSnackbar({
                open: true,
                message: strings.issueReported,
                severity: 'success'
            });

            // Callback to parent component
            if (onIssueCreated) {
                onIssueCreated(issueData.issue);
            }

            // Clear form
            setIssueData({
                text: '',
                category: '',
                subcategory: '',
                priority: 'NORMAL',
                toBeResolvedBefore: '',
                remark: '',
            });
            setAudioBlob(null);
            setAttachments([]);

            // Navigate back to dashboard after a short delay
            setTimeout(() => {
                if (onBack) {
                    onBack();
                }
            }, 2000);

        } catch (error) {
            console.error('Error creating issue:', error);
            setSnackbar({
                open: true,
                message: error.message || strings.errorReportingIssue,
                severity: 'error'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar(prev => ({
            ...prev,
            open: false
        }));
    };

    // Get today's date in YYYY-MM-DD format for min date
    const today = new Date().toISOString().split('T')[0];

    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            {/* Breadcrumb Navigation */}
            <Breadcrumbs
                separator={<NavigateNextIcon fontSize="small" />}
                sx={{ mb: 2 }}
                aria-label="navigation"
            >
                <Link
                    component="button"
                    variant="body2"
                    onClick={onBack}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        textDecoration: 'none',
                        color: 'text.secondary',
                        '&:hover': { color: 'primary.main' }
                    }}
                >
                    <DashboardIcon sx={{ mr: 0.5, fontSize: 18 }} />
                    {strings.dashboard || 'Dashboard'}
                </Link>
                <Typography
                    color="text.primary"
                    sx={{ display: 'flex', alignItems: 'center' }}
                >
                    <AddCircleOutlineIcon sx={{ mr: 0.5, fontSize: 18 }} />
                    {strings.reportNewIssue || 'Report New Issue'}
                </Typography>
            </Breadcrumbs>

            <Card elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {/* Header */}
                <Box
                    sx={{
                        backgroundColor: 'primary.main',
                        color: 'white',
                        p: 2.5
                    }}
                >
                    <Typography variant="h5" fontWeight="bold">
                        {strings.reportNewIssue || 'Report New Issue'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                        {strings.reportIssueDescription || 'Submit your issue or suggestion to the Gram Panchayat. Record your voice message and add any supporting documents.'}
                    </Typography>
                </Box>

                <CardContent sx={{ p: 3 }}>
                    {errors.form && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {errors.form}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={handleSubmit}>
                        <Stack spacing={3}>
                            {/* Category */}
                            <Box>
                                <Typography variant="subtitle1" gutterBottom fontWeight="500" sx={{ display: 'flex', alignItems: 'center' }}>
                                    {strings.issueCategory || 'Category'}<span style={{ color: 'red' }}>*</span>
                                    <Tooltip title={strings.issueCategoryTooltip || "Select the category that best describes your issue"}>
                                        <InfoIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                                    </Tooltip>
                                </Typography>
                                <FormControl fullWidth error={!!errors.category}>
                                    <Select
                                        name="category"
                                        value={issueData.category}
                                        onChange={handleInputChange}
                                        displayEmpty
                                    >
                                        <MenuItem value="" disabled>
                                            <Typography color="text.secondary">{strings.selectCategory}</Typography>
                                        </MenuItem>
                                        {getCategories().map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {strings[option.labelKey]}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                    {errors.category && <FormHelperText>{errors.category}</FormHelperText>}
                                </FormControl>
                            </Box>

                            {/* Subcategory */}
                            {issueData.category && (
                                <Box>
                                    <Typography variant="subtitle1" gutterBottom fontWeight="500">
                                        {strings.issueSubcategory}<span style={{ color: 'red' }}>*</span>
                                    </Typography>
                                    <FormControl fullWidth error={!!errors.subcategory}>
                                        <Select
                                            name="subcategory"
                                            value={issueData.subcategory}
                                            onChange={handleInputChange}
                                            displayEmpty
                                        >
                                            <MenuItem value="" disabled>
                                                <Typography color="text.secondary">{strings.selectSubcategory}</Typography>
                                            </MenuItem>
                                            {getSubcategories(issueData.category).map(option => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {strings[option.labelKey]}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                        {errors.subcategory && <FormHelperText>{errors.subcategory}</FormHelperText>}
                                    </FormControl>
                                </Box>
                            )}

                            {/* Created For Field */}
                            {user.role && ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role) && (
                                <Box>
                                    <Typography variant="subtitle1" gutterBottom fontWeight="500">
                                        {strings.createdFor}<span style={{ color: 'red' }}>*</span>
                                    </Typography>
                                    <FormControl fullWidth>
                                        <Select
                                            name="createdFor"
                                            value={issueData.createdForId?.name}
                                            onChange={handleInputChange}
                                            displayEmpty
                                        >
                                            <MenuItem value="" disabled></MenuItem>
                                            {loadingUsers ? (
                                                <MenuItem disabled>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                                        <CircularProgress size={20} sx={{ mr: 1 }} />
                                                        <Typography>Loading users...</Typography>
                                                    </Box>
                                                </MenuItem>
                                            ) : (
                                                users.map((user) => (
                                                    <MenuItem key={user._id} value={user._id}>
                                                        {user.name} (Voter ID: {user.voterIdNumber})
                                                    </MenuItem>
                                                ))
                                            )}
                                        </Select>
                                    </FormControl>
                                </Box>
                            )}

                            {/* Audio Recording */}
                            <Box>
                                <Typography variant="subtitle1" gutterBottom fontWeight="500" sx={{ display: 'flex', alignItems: 'center' }}>
                                    <MicIcon fontSize="small" sx={{ mr: 1 }} />
                                    {strings.audioRecording || 'Voice Recording'}<span style={{ color: 'red' }}>*</span>
                                    <Tooltip title={strings.audioRecordingTooltip || "Record your voice message describing the issue. This is required and helps officials understand your concern better."}>
                                        <InfoIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                                    </Tooltip>
                                </Typography>
                                <AudioRecorder
                                    onAudioRecorded={handleAudioRecorded}
                                    onReset={() => setAudioBlob(null)}
                                />
                                {errors.audio && (
                                    <FormHelperText error sx={{ mt: 1 }}>
                                        {errors.audio}
                                    </FormHelperText>
                                )}
                            </Box>

                            {/* Attachments */}
                            <Box>
                                <Typography variant="subtitle1" gutterBottom fontWeight="500" sx={{ display: 'flex', alignItems: 'center' }}>
                                    <UploadFileIcon fontSize="small" sx={{ mr: 1 }} />
                                    {strings.fileAttachments || 'Attachments'} ({strings.optional || 'Optional'})
                                    <Tooltip title={strings.attachmentsTooltip || "Upload photos or documents related to your issue. Images and PDFs are accepted."}>
                                        <InfoIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.disabled', cursor: 'help' }} />
                                    </Tooltip>
                                </Typography>
                                <FileUploader
                                    onFilesSelected={handleFilesSelected}
                                    onReset={() => setAttachments([])}
                                />
                            </Box>

                            {/* Buttons */}
                            <Box sx={{ pt: 2 }}>
                                <Divider sx={{ mb: 3 }} />
                                <Box sx={{
                                    display: 'flex',
                                    justifyContent: 'space-between'
                                }}>
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={onBack}
                                        startIcon={<CancelIcon />}
                                    >
                                        {strings.cancel}
                                    </Button>

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="primary"
                                        onClick={handleSubmit}
                                        endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
                                        disabled={loading}
                                    >
                                        {strings.submit}
                                    </Button>
                                </Box>
                            </Box>
                        </Stack>
                    </Box>
                </CardContent>
            </Card>

            {/* Success/Error Notification */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                    variant="filled"
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default IssueCreationView;