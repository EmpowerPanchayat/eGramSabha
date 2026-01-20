// File: frontend/src/components/SupportTicketForm.js
import React, { useState } from 'react';
import {
    Box,
    TextField,
    FormControl,
    FormLabel,
    RadioGroup,
    FormControlLabel,
    Radio,
    Select,
    MenuItem,
    InputLabel,
    Button,
    Alert,
    CircularProgress,
    Typography,
    Paper
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { useLanguage } from '../utils/LanguageContext';
import { submitSupportTicket } from '../api/supportTicket';
import AudioRecorder from './AudioRecorder';
import FileUploader from './FileUploader';

// Category definitions
const TECHNICAL_CATEGORIES = [
    { value: 'LOGIN_ISSUE', labelKey: 'categoryLoginIssue', label: 'Login Issue' },
    { value: 'FACE_RECOGNITION', labelKey: 'categoryFaceRecognition', label: 'Face Recognition' },
    { value: 'AUDIO_RECORDING', labelKey: 'categoryAudioRecording', label: 'Audio Recording' },
    { value: 'FILE_UPLOAD', labelKey: 'categoryFileUpload', label: 'File Upload' },
    { value: 'APP_CRASH', labelKey: 'categoryAppCrash', label: 'App Crash' },
    { value: 'PERFORMANCE', labelKey: 'categoryPerformance', label: 'Performance Issue' },
    { value: 'OTHER_TECHNICAL', labelKey: 'categoryOtherTechnical', label: 'Other Technical Issue' }
];

const GENERAL_CATEGORIES = [
    { value: 'GRAM_SABHA_QUERY', labelKey: 'categoryGramSabhaQuery', label: 'Gram Sabha Query' },
    { value: 'ISSUE_TRACKING', labelKey: 'categoryIssueTracking', label: 'Issue Tracking' },
    { value: 'ACCOUNT_HELP', labelKey: 'categoryAccountHelp', label: 'Account Help' },
    { value: 'FEEDBACK', labelKey: 'categoryFeedback', label: 'Feedback' },
    { value: 'SUGGESTION', labelKey: 'categorySuggestion', label: 'Suggestion' },
    { value: 'OTHER_GENERAL', labelKey: 'categoryOtherGeneral', label: 'Other' }
];

const SupportTicketForm = ({ user, panchayatId, sourcePortal, onSuccess }) => {
    const { strings } = useLanguage();

    // Form state
    const [issueType, setIssueType] = useState('technical');
    const [category, setCategory] = useState('');
    const [description, setDescription] = useState('');
    const [contactType, setContactType] = useState('phone');
    const [contactValue, setContactValue] = useState('');
    const [audioBlob, setAudioBlob] = useState(null);
    const [screenshot, setScreenshot] = useState(null);

    // UI state
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const categories = issueType === 'technical' ? TECHNICAL_CATEGORIES : GENERAL_CATEGORIES;

    const handleIssueTypeChange = (event) => {
        setIssueType(event.target.value);
        setCategory(''); // Reset category when type changes
    };

    const handleCategoryChange = (event) => {
        setCategory(event.target.value);
    };

    const handleAudioRecorded = (blob) => {
        setAudioBlob(blob);
    };

    const handleAudioReset = () => {
        setAudioBlob(null);
    };

    const handleFilesSelected = (files) => {
        // Only take the first image file for screenshot
        if (files && files.length > 0) {
            const imageFile = files.find(f => f.type.startsWith('image/'));
            if (imageFile) {
                setScreenshot({
                    attachment: imageFile.base64,
                    filename: imageFile.name,
                    mimeType: imageFile.type
                });
            }
        } else {
            setScreenshot(null);
        }
    };

    const handleFileReset = () => {
        setScreenshot(null);
    };

    const validateForm = () => {
        if (!category) {
            setError(strings.pleaseSelectCategory || 'Please select a category');
            return false;
        }

        if (!description && !audioBlob) {
            setError(strings.descriptionOrVoiceRequired || 'Please provide a description or record a voice note');
            return false;
        }

        if (contactValue) {
            if (contactType === 'email') {
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(contactValue)) {
                    setError(strings.invalidEmail || 'Please enter a valid email address');
                    return false;
                }
            } else if (contactType === 'phone') {
                const phoneRegex = /^[0-9]{10,15}$/;
                if (!phoneRegex.test(contactValue.replace(/[\s-]/g, ''))) {
                    setError(strings.invalidPhone || 'Please enter a valid phone number');
                    return false;
                }
            }
        }

        return true;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!validateForm()) {
            return;
        }

        setSubmitting(true);

        try {
            // Prepare voice note if exists
            let voiceNote = null;
            if (audioBlob) {
                const reader = new FileReader();
                const base64Promise = new Promise((resolve) => {
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(audioBlob);
                });
                const base64Data = await base64Promise;
                voiceNote = {
                    attachment: base64Data,
                    filename: `voice_note_${Date.now()}.wav`,
                    mimeType: 'audio/wav'
                };
            }

            // Prepare contact info
            let contactInfo = null;
            if (contactValue) {
                contactInfo = {
                    type: contactType.toUpperCase(),
                    value: contactValue
                };
            }

            const ticketData = {
                category,
                description: description || null,
                contactInfo,
                screenshot,
                voiceNote,
                panchayatId: panchayatId || null,
                sourcePortal
            };

            const response = await submitSupportTicket(ticketData);

            if (response.success) {
                onSuccess(response.ticket.ticketNumber);
            } else {
                setError(response.message || strings.errorSubmittingTicket || 'Failed to submit ticket');
            }
        } catch (err) {
            console.error('Error submitting ticket:', err);
            setError(err.message || strings.errorSubmittingTicket || 'Failed to submit ticket');
        } finally {
            setSubmitting(false);
        }
    };

    const getCategoryLabel = (cat) => {
        return strings[cat.labelKey] || cat.label;
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* Issue Type Selection */}
            <FormControl component="fieldset" sx={{ mb: 2 }}>
                <FormLabel component="legend">
                    {strings.issueType || 'Issue Type'}
                </FormLabel>
                <RadioGroup
                    row
                    value={issueType}
                    onChange={handleIssueTypeChange}
                >
                    <FormControlLabel
                        value="technical"
                        control={<Radio />}
                        label={strings.technicalIssue || 'Technical Issue'}
                    />
                    <FormControlLabel
                        value="general"
                        control={<Radio />}
                        label={strings.generalInquiry || 'General Inquiry'}
                    />
                </RadioGroup>
            </FormControl>

            {/* Category Selection */}
            <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel id="category-label">
                    {strings.selectCategory || 'Select Category'}
                </InputLabel>
                <Select
                    labelId="category-label"
                    value={category}
                    label={strings.selectCategory || 'Select Category'}
                    onChange={handleCategoryChange}
                    required
                >
                    {categories.map((cat) => (
                        <MenuItem key={cat.value} value={cat.value}>
                            {getCategoryLabel(cat)}
                        </MenuItem>
                    ))}
                </Select>
            </FormControl>

            {/* Description */}
            <TextField
                fullWidth
                multiline
                rows={4}
                label={strings.description || 'Description'}
                placeholder={strings.describeYourIssue || 'Please describe your issue or question...'}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                sx={{ mb: 2 }}
            />

            {/* Audio Recording */}
            <AudioRecorder
                onAudioRecorded={handleAudioRecorded}
                onReset={handleAudioReset}
            />

            {/* Screenshot Upload */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    {strings.attachScreenshot || 'Attach Screenshot (Optional)'}
                </Typography>
                <FileUploader
                    onFilesSelected={handleFilesSelected}
                    onReset={handleFileReset}
                />
            </Paper>

            {/* Contact Information */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                    {strings.contactInformation || 'Contact Information (Optional)'}
                </Typography>
                <FormControl component="fieldset" sx={{ mb: 1 }}>
                    <RadioGroup
                        row
                        value={contactType}
                        onChange={(e) => setContactType(e.target.value)}
                    >
                        <FormControlLabel
                            value="phone"
                            control={<Radio size="small" />}
                            label={strings.phone || 'Phone'}
                        />
                        <FormControlLabel
                            value="email"
                            control={<Radio size="small" />}
                            label={strings.email || 'Email'}
                        />
                    </RadioGroup>
                </FormControl>
                <TextField
                    fullWidth
                    size="small"
                    label={contactType === 'phone'
                        ? (strings.phoneNumber || 'Phone Number')
                        : (strings.emailAddress || 'Email Address')
                    }
                    placeholder={contactType === 'phone'
                        ? '9876543210'
                        : 'example@email.com'
                    }
                    value={contactValue}
                    onChange={(e) => setContactValue(e.target.value)}
                    type={contactType === 'email' ? 'email' : 'tel'}
                />
            </Paper>

            {/* Submit Button */}
            <Button
                type="submit"
                variant="contained"
                color="primary"
                fullWidth
                size="large"
                disabled={submitting}
                startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            >
                {submitting
                    ? (strings.submitting || 'Submitting...')
                    : (strings.submitTicket || 'Submit Ticket')
                }
            </Button>
        </Box>
    );
};

export default SupportTicketForm;
