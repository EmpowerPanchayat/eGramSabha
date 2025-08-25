import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography,
    Box, Grid, Chip, Stack, IconButton, CircularProgress, Paper, Alert
} from '@mui/material';
import {
    Close as CloseIcon, Folder as FolderIcon, Category as CategoryIcon,
    PlaylistAddCheck as PlaylistAddCheckIcon, PriorityHigh as PriorityHighIcon,
    CalendarToday as CalendarTodayIcon, Person as PersonIcon, Note as NoteIcon,
    Refresh as RefreshIcon
} from '@mui/icons-material';

import { useLanguage } from '../utils/LanguageContext';
import { getLabelKeyFromValue } from '../utils/categoryUtils';
import formatDate from '../utils/formatDate';
import { getTranscriptionStatus, retryTranscription } from '../api/issues';
import AttachmentViewer from './AttachmentViewer';
import tokenManager from '../utils/tokenManager';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const IssueDetailsModal = ({ issue, tabValue, open, onClose }) => {
    const { strings } = useLanguage();
    const [transcriptionData, setTranscriptionData] = useState(null);
    const [transcriptionLoading, setTranscriptionLoading] = useState(false);

    const fetchTranscriptionStatus = async (issueId) => {
        if (!issueId) return;
        setTranscriptionLoading(true);
        try {
            const response = await getTranscriptionStatus(issueId);
            if (response.success) {
                setTranscriptionData(response.transcription);
            }
        } catch (error) {
            console.error(`Error fetching transcription status:`, error);
        } finally {
            setTranscriptionLoading(false);
        }
    };

    useEffect(() => {
        if (issue && issue._id) {
            // Reset state when issue changes
            setTranscriptionData(null);
            if (issue.transcription && issue.transcription.requestId) {
                fetchTranscriptionStatus(issue._id);
            }
        }
    }, [issue]);

    const handleRetryTranscription = async () => {
        if (!issue) return;
        setTranscriptionLoading(true);
        try {
            await retryTranscription(issue._id);
            await fetchTranscriptionStatus(issue._id); // Refresh status
        } catch (error) {
            console.error(`Error retrying transcription:`, error);
        } finally {
            setTranscriptionLoading(false);
        }
    };

    const getStatusChip = (status) => {
        let color, label;
        switch (status) {
            case 'REPORTED': color = 'default'; label = strings.statusReported; break;
            case 'PICKED_IN_AGENDA': color = 'info'; label = strings.statusAgendaCreated; break;
            case 'DISCUSSED_IN_GRAM_SABHA': color = 'info'; label = strings.statusDiscussedInGramSabha; break;
            case 'RESOLVED': color = 'success'; label = strings.statusResolved; break;
            case 'TRANSFERRED': color = 'warning'; label = strings.statusTransferred; break;
            case 'NO_ACTION_NEEDED': color = 'error'; label = strings.statusNoActionNeeded; break;
            default: color = 'default'; label = status;
        }
        return <Chip size="small" color={color} label={label} variant="outlined" />;
    };

    const getPriorityChip = (priority) => (
        <Chip size="small" color={priority === 'URGENT' ? 'error' : 'default'} label={priority === 'URGENT' ? strings.priorityUrgent : strings.priorityNormal} variant="outlined" />
    );

    const getTranscriptionStatusChip = (status) => {
        let color, label;
        switch (status) {
            case 'PENDING': color = 'default'; label = strings.transcriptionPending; break;
            case 'PROCESSING': color = 'info'; label = strings.transcriptionProcessing; break;
            case 'COMPLETED': color = 'success'; label = strings.transcriptionCompleted; break;
            case 'FAILED': color = 'error'; label = strings.transcriptionFailed; break;
            default: color = 'default'; label = 'Unknown';
        }
        return <Chip size="small" color={color} label={label} variant="outlined" />;
    };

    if (!issue) {
        return null;
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 2, boxShadow: 24 } }}>
            <DialogTitle sx={{ bgcolor: 'primary.main', color: 'white', pr: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FolderIcon sx={{ mr: 1 }} />
                    {strings.issueDetailView}
                </Box>
                <IconButton aria-label="close" onClick={onClose} sx={{ position: 'absolute', right: 8, top: 8, color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={4}>
                    {/* Basic Info */}
                    <Box>
                        <Typography variant="h6" color="primary" gutterBottom>{strings.basicInformation}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary"><CategoryIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.issueCategory}</Typography>
                                <Typography variant="body1">{strings[getLabelKeyFromValue(issue.category)]}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary"><CategoryIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.issueSubcategory}</Typography>
                                <Typography variant="body1">{strings[getLabelKeyFromValue(issue.subcategory)]}</Typography>
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary"><PlaylistAddCheckIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.issueStatus}</Typography>
                                {getStatusChip(issue.status)}
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary"><PriorityHighIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.issuePriority}</Typography>
                                {getPriorityChip(issue.priority)}
                            </Grid>
                        </Grid>
                    </Box>

                    {/* Timeline */}
                    <Box>
                        <Typography variant="h6" color="primary" gutterBottom>{strings.timeline}</Typography>
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <Typography variant="subtitle2" color="text.secondary"><CalendarTodayIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.createdDate}</Typography>
                                <Typography variant="body1">{formatDate(issue.createdAt)}</Typography>
                            </Grid>
                            {issue.toBeResolvedBefore && (
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary"><CalendarTodayIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.targetDate}</Typography>
                                    <Typography variant="body1">{formatDate(issue.toBeResolvedBefore)}</Typography>
                                </Grid>
                            )}
                        </Grid>
                    </Box>

                    {/* Additional Info */}
                    <Box>
                        <Typography variant="h6" color="primary" gutterBottom>{strings.additionalInformation}</Typography>
                        <Grid container spacing={3}>
                            {tabValue !== 1 && (
                                <>
                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary"><PersonIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.creator}</Typography>
                                    <Typography variant="body1">{issue?.creator?.name || 'Unknown'}</Typography>
                                </Grid>

                                <Grid item xs={12} sm={6}>
                                    <Typography variant="subtitle2" color="text.secondary"><PersonIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.createdFor}</Typography>
                                    <Typography variant="body1">{issue?.createdFor?.name || 'Unknown'}</Typography>
                                </Grid>
                                </>
                            )}
                                <Grid item xs={12}>
                                    <Typography variant="subtitle2" color="text.secondary"><NoteIcon sx={{ mr: 1, verticalAlign: 'bottom' }} />{strings.remark}</Typography>
                                    <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                                        <Typography variant="body2">{issue?.remark}</Typography>
                                    </Paper>
                                </Grid>
                        </Grid>
                    </Box>

                    {/* Transcription */}
                    {(issue.transcription || transcriptionData) && (
                        <Box>
                            <Typography variant="h6" color="primary" gutterBottom>{strings.audioTranscription}</Typography>
                            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default', borderRadius: 2 }}>
                                {transcriptionLoading ? (
                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CircularProgress size={24} sx={{ mr: 2 }} />
                                        <Typography>{strings.transcriptionLoading}</Typography>
                                    </Box>
                                ) : transcriptionData ? (
                                    <Box>
                                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="subtitle2" sx={{ mr: 2 }}>{strings.transcriptionStatus}:</Typography>
                                            {getTranscriptionStatusChip(transcriptionData.status)}
                                        </Box>
                                        {transcriptionData.status === 'COMPLETED' && (
                                            <Typography variant="body2">{transcriptionData.text}</Typography>
                                        )}
                                        {transcriptionData.status === 'FAILED' && (
                                            <Box>
                                                <Alert severity="error" sx={{ mb: 2 }}>{strings.transcriptionError}: {transcriptionData.error || 'Unknown'}</Alert>
                                                <Button variant="outlined" onClick={handleRetryTranscription} startIcon={<RefreshIcon />}>
                                                    {strings.retryTranscription}
                                                </Button>
                                            </Box>
                                        )}
                                    </Box>
                                ) : (
                                    <Typography color="text.secondary">{strings.transcriptionNoData}</Typography>
                                )}
                            </Paper>
                        </Box>
                    )}

                    {/* Attachments */}
                    {issue.attachments && issue.attachments.length > 0 && (
                        <Box>
                            <Typography variant="h6" color="primary" gutterBottom>{strings.attachments}</Typography>
                            {issue.attachments.map((attachment) => (
                                <AttachmentViewer
                                    key={attachment._id}
                                    attachmentUrl={`${API_URL}/issues/${issue._id}/attachment/${attachment._id}`}
                                    filename={attachment.filename}
                                    mimeType={attachment.mimeType}
                                    authToken={tokenManager.getToken()}
                                />
                            ))}
                        </Box>
                    )}
                </Stack>
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
                <Button variant="outlined" onClick={onClose} startIcon={<CloseIcon />}>{strings.close}</Button>
            </DialogActions>
        </Dialog>
    );
};

export default IssueDetailsModal; 