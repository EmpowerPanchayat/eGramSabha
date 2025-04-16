// File: frontend/src/views/IssueCreationView.js
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
    useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SendIcon from '@mui/icons-material/Send';
import CancelIcon from '@mui/icons-material/Cancel';
import MicIcon from '@mui/icons-material/Mic';
import UploadFileIcon from '@mui/icons-material/UploadFile';

import AudioRecorder from '../components/AudioRecorder';
import FileUploader from '../components/FileUploader';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../utils/LanguageContext';

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
        createdFor: 'Self',
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

    // Fetch users when component mounts
    useEffect(() => {
        const fetchUsers = async () => {
            if (user.role && ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role)) {
                setLoadingUsers(true);
                try {
                    const response = await fetch(`${API_URL}/users/panchayat/${user.panchayatId}`);
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

    const categoryOptions = [
        { value: 'CULTURE_AND_NATURE', label: strings.categoryCultureAndNature },
        { value: 'INFRASTRUCTURE', label: strings.categoryInfrastructure },
        { value: 'EARNING_OPPORTUNITIES', label: strings.categoryEarningOpportunities },
        { value: 'BASIC_AMENITIES', label: strings.categoryBasicAmenities },
        { value: 'SOCIAL_WELFARE_SCHEMES', label: strings.categorySocialWelfareSchemes },
        { value: 'OTHER', label: strings.categoryOther }
    ];

    const getSubcategoryOptions = (category) => {
        switch (category) {
            case 'CULTURE_AND_NATURE':
                return [
                    { value: 'FESTIVALS', label: strings.subcategoryFestivals },
                    { value: 'TREES_AND_FORESTS', label: strings.subcategoryTreesAndForests },
                    { value: 'SOIL', label: strings.subcategorySoil },
                    { value: 'NATURAL_WATER_RESOURCES', label: strings.subcategoryNaturalWaterResources },
                    { value: 'RELIGIOUS_PLACES', label: strings.subcategoryReligiousPlaces }
                ];
            case 'INFRASTRUCTURE':
                return [
                    { value: 'LAND', label: strings.subcategoryLand },
                    { value: 'WATER', label: strings.subcategoryWater },
                    { value: 'ENERGY', label: strings.subcategoryEnergy },
                    { value: 'TRANSPORTATION', label: strings.subcategoryTransportation },
                    { value: 'COMMUNICATION', label: strings.subcategoryCommunication }
                ];
            case 'EARNING_OPPORTUNITIES':
                return [
                    { value: 'AGRICULTURE', label: strings.subcategoryAgriculture },
                    { value: 'ANIMAL_HUSBANDRY', label: strings.subcategoryAnimalHusbandry },
                    { value: 'FISHERIES', label: strings.subcategoryFisheries },
                    { value: 'SMALL_SCALE_INDUSTRIES', label: strings.subcategorySmallScaleIndustries },
                    { value: 'MINOR_FOREST_PRODUCE', label: strings.subcategoryMinorForestProduce },
                    { value: 'KHADI_AND_VILLAGE_INDUSTRIES', label: strings.subcategoryKhadiAndVillageIndustries }
                ];
            case 'BASIC_AMENITIES':
                return [
                    { value: 'HEALTH', label: strings.subcategoryHealth },
                    { value: 'EDUCATION', label: strings.subcategoryEducation },
                    { value: 'HOUSING_AND_SANITATION', label: strings.subcategoryHousingAndSanitation },
                    { value: 'SPORTS_AND_ENTERTAINMENT', label: strings.subcategorySportsAndEntertainment },
                    { value: 'FOOD', label: strings.subcategoryFood }
                ];
            case 'SOCIAL_WELFARE_SCHEMES':
                return [
                    { value: 'WEAKER_SECTIONS', label: strings.subcategoryWeakerSections },
                    { value: 'HANDICAPPED_WELFARE', label: strings.subcategoryHandicappedWelfare },
                    { value: 'FAMILY_WELFARE', label: strings.subcategoryFamilyWelfare },
                    { value: 'WOMEN_AND_CHILD_DEVELOPMENT', label: strings.subcategoryWomenAndChildDevelopment },
                    { value: 'POVERTY_ALLEVIATION', label: strings.subcategoryPovertyAlleviation }
                ];
            case 'OTHER':
                return [
                    { value: 'OTHER', label: strings.subcategoryOther }
                ];
            default:
                return [];
        }
    };

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
                },
                body: JSON.stringify({
                    ...formattedData,
                    panchayatId: user.panchayatId,
                    creatorId: user.linkedUser?.id || user._id,
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
                        await fetch(`${API_URL}/issues/upload-attachment`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                issueId,
                                attachmentData: reader.result,
                                filename: 'audio-recording.wav',
                                mimeType: 'audio/wav'
                            })
                        });
                    } catch (error) {
                        console.error('Error uploading audio:', error);
                    }
                };
            }

            // Process file attachments
            for (const file of attachments) {
                try {
                    await fetch(`${API_URL}/issues/upload-attachment`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            issueId,
                            attachmentData: file.base64,
                            filename: file.name,
                            mimeType: file.type
                        })
                    });
                } catch (error) {
                    console.error('Error uploading attachment:', error);
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
                createdFor: 'Self',
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
            <Card elevation={3} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                {/* Header */}
                <Box
                    sx={{
                        backgroundColor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        p: 2
                    }}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton
                            onClick={onBack}
                            sx={{ mr: 1, color: 'white' }}
                            size="small"
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Typography variant="h6">
                            {strings.reportNewIssue}
                        </Typography>
                    </Box>
                    <LanguageSwitcher />
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
                                <Typography variant="subtitle1" gutterBottom fontWeight="500">
                                    {strings.issueCategory}<span style={{ color: 'red' }}>*</span>
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
                                        {categoryOptions.map(option => (
                                            <MenuItem key={option.value} value={option.value}>
                                                {option.label}
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
                                            {getSubcategoryOptions(issueData.category).map(option => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
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
                                        {strings.createdFor}
                                    </Typography>
                                    <FormControl fullWidth>
                                        <Select
                                            name="createdFor"
                                            value={issueData.createdFor}
                                            onChange={handleInputChange}
                                        >
                                            <MenuItem value="Self">Self</MenuItem>
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
                                <Typography variant="subtitle1" gutterBottom fontWeight="500">
                                    <MicIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    {strings.audioRecording}<span style={{ color: 'red' }}>*</span>
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
                                <Typography variant="subtitle1" gutterBottom fontWeight="500">
                                    <UploadFileIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 1 }} />
                                    {strings.fileAttachments}
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