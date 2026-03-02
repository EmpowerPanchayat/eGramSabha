// File: frontend/src/views/SupportTicketsView.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Paper,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    CircularProgress,
    Alert,
    Grid,
    Divider,
    Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import PersonIcon from '@mui/icons-material/Person';
import CategoryIcon from '@mui/icons-material/Category';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import ContactPhoneIcon from '@mui/icons-material/ContactPhone';
import DescriptionIcon from '@mui/icons-material/Description';
import MicIcon from '@mui/icons-material/Mic';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DevicesIcon from '@mui/icons-material/Devices';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import ImageIcon from '@mui/icons-material/Image';
import DownloadIcon from '@mui/icons-material/Download';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import TranslateIcon from '@mui/icons-material/Translate';
import { useLanguage } from '../utils/LanguageContext';
import { fetchSupportTickets, fetchSupportTicketById, updateSupportTicketStatus } from '../api/supportTicket';

// Status chip colors
const STATUS_COLORS = {
    OPEN: 'info',
    IN_PROGRESS: 'warning',
    RESOLVED: 'success',
    CLOSED: 'default'
};

// Category labels
const CATEGORY_LABELS = {
    // Technical
    LOGIN_ISSUE: 'Login Issue',
    FACE_RECOGNITION: 'Face Recognition',
    AUDIO_RECORDING: 'Audio Recording',
    FILE_UPLOAD: 'File Upload',
    APP_CRASH: 'App Crash',
    PERFORMANCE: 'Performance',
    OTHER_TECHNICAL: 'Other Technical',
    // General
    GRAM_SABHA_QUERY: 'Gram Sabha Query',
    ISSUE_TRACKING: 'Issue Tracking',
    ACCOUNT_HELP: 'Account Help',
    FEEDBACK: 'Feedback',
    SUGGESTION: 'Suggestion',
    OTHER_GENERAL: 'Other'
};

const SupportTicketsView = ({ user, selectedPanchayat }) => {
    const { strings } = useLanguage();

    // State
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [total, setTotal] = useState(0);

    // Filters
    const [statusFilter, setStatusFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');

    // Detail dialog
    const [detailDialogOpen, setDetailDialogOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loadingDetail, setLoadingDetail] = useState(false);

    // Status update
    const [newStatus, setNewStatus] = useState('');
    const [resolutionNotes, setResolutionNotes] = useState('');
    const [updatingStatus, setUpdatingStatus] = useState(false);
    const [updateError, setUpdateError] = useState('');

    // Load tickets
    const loadTickets = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const params = {
                page: page + 1,
                limit: rowsPerPage,
                status: statusFilter || undefined,
                category: categoryFilter || undefined,
                panchayatId: selectedPanchayat?._id || undefined
            };

            const response = await fetchSupportTickets(params);
            if (response.success) {
                setTickets(response.tickets);
                setTotal(response.pagination?.total || response.total || 0);
            }
        } catch (err) {
            console.error('Error loading tickets:', err);
            setError(err.message || strings.errorFetchingTickets || 'Failed to load support tickets');
        } finally {
            setLoading(false);
        }
    }, [page, rowsPerPage, statusFilter, categoryFilter, selectedPanchayat, strings]);

    useEffect(() => {
        loadTickets();
    }, [loadTickets]);

    const handlePageChange = (event, newPage) => {
        setPage(newPage);
    };

    const handleRowsPerPageChange = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleViewTicket = async (ticketId) => {
        setLoadingDetail(true);
        setDetailDialogOpen(true);
        try {
            const response = await fetchSupportTicketById(ticketId);
            if (response.success) {
                setSelectedTicket(response.ticket);
            }
        } catch (err) {
            console.error('Error loading ticket detail:', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleCloseDetail = () => {
        setDetailDialogOpen(false);
        setSelectedTicket(null);
        setNewStatus('');
        setResolutionNotes('');
        setUpdateError('');
    };

    const handleStatusUpdate = async () => {
        if (!selectedTicket || !newStatus || newStatus === selectedTicket.status) return;

        setUpdatingStatus(true);
        setUpdateError('');
        try {
            const response = await updateSupportTicketStatus(
                selectedTicket._id,
                newStatus,
                (newStatus === 'RESOLVED' || newStatus === 'CLOSED') ? resolutionNotes : null
            );
            if (response.success) {
                setSelectedTicket(response.ticket);
                setNewStatus('');
                setResolutionNotes('');
                loadTickets(); // Refresh the list
            }
        } catch (err) {
            console.error('Error updating status:', err);
            setUpdateError(err.message || strings.errorUpdatingStatus || 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleRefresh = () => {
        loadTickets();
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCategoryLabel = (category) => {
        if (!category) return '-';
        const key = `category${category.split('_').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join('')}`;
        return strings[key] || CATEGORY_LABELS[category] || category;
    };

    const getStatusLabel = (status) => {
        if (!status) return '-';
        const key = `ticketStatus${status.charAt(0) + status.slice(1).toLowerCase().replace('_', '')}`;
        return strings[key] || status.replace('_', ' ');
    };

    return (
        <Box>
            <Paper sx={{ p: 0, mb: 2, overflow: 'hidden' }}>
                {/* Header Section */}
                <Box
                    sx={{
                        p: 2.5,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                    }}
                >
                    <Box>
                        <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
                            <ConfirmationNumberIcon sx={{ mr: 1 }} />
                            {strings.supportTickets || 'Support Tickets'}
                        </Typography>
                        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                            {strings.supportTicketsDescription || 'View and manage help desk requests from citizens. Update ticket status and add resolution notes.'}
                        </Typography>
                    </Box>
                    <Tooltip title={strings.refresh || 'Refresh'}>
                        <IconButton onClick={handleRefresh} disabled={loading} sx={{ color: 'white' }}>
                            <RefreshIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
                <Box sx={{ p: 2 }}>

                {/* Filters */}
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>{strings.status || 'Status'}</InputLabel>
                        <Select
                            value={statusFilter}
                            label={strings.status || 'Status'}
                            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
                        >
                            <MenuItem value="">{strings.all || 'All'}</MenuItem>
                            <MenuItem value="OPEN">{strings.ticketStatusOpen || 'Open'}</MenuItem>
                            <MenuItem value="IN_PROGRESS">{strings.ticketStatusInProgress || 'In Progress'}</MenuItem>
                            <MenuItem value="RESOLVED">{strings.ticketStatusResolved || 'Resolved'}</MenuItem>
                            <MenuItem value="CLOSED">{strings.ticketStatusClosed || 'Closed'}</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 200 }}>
                        <InputLabel>{strings.category || 'Category'}</InputLabel>
                        <Select
                            value={categoryFilter}
                            label={strings.category || 'Category'}
                            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
                        >
                            <MenuItem value="">{strings.all || 'All'}</MenuItem>
                            <MenuItem disabled sx={{ fontWeight: 'bold', opacity: 1 }}>
                                {strings.technicalIssues || '-- Technical --'}
                            </MenuItem>
                            <MenuItem value="LOGIN_ISSUE">{strings.categoryLoginIssue || 'Login Issue'}</MenuItem>
                            <MenuItem value="FACE_RECOGNITION">{strings.categoryFaceRecognition || 'Face Recognition'}</MenuItem>
                            <MenuItem value="AUDIO_RECORDING">{strings.categoryAudioRecording || 'Audio Recording'}</MenuItem>
                            <MenuItem value="FILE_UPLOAD">{strings.categoryFileUpload || 'File Upload'}</MenuItem>
                            <MenuItem value="APP_CRASH">{strings.categoryAppCrash || 'App Crash'}</MenuItem>
                            <MenuItem value="PERFORMANCE">{strings.categoryPerformance || 'Performance'}</MenuItem>
                            <MenuItem value="OTHER_TECHNICAL">{strings.categoryOtherTechnical || 'Other Technical'}</MenuItem>
                            <MenuItem disabled sx={{ fontWeight: 'bold', opacity: 1 }}>
                                {strings.generalInquiries || '-- General --'}
                            </MenuItem>
                            <MenuItem value="GRAM_SABHA_QUERY">{strings.categoryGramSabhaQuery || 'Gram Sabha Query'}</MenuItem>
                            <MenuItem value="ISSUE_TRACKING">{strings.categoryIssueTracking || 'Issue Tracking'}</MenuItem>
                            <MenuItem value="ACCOUNT_HELP">{strings.categoryAccountHelp || 'Account Help'}</MenuItem>
                            <MenuItem value="FEEDBACK">{strings.categoryFeedback || 'Feedback'}</MenuItem>
                            <MenuItem value="SUGGESTION">{strings.categorySuggestion || 'Suggestion'}</MenuItem>
                            <MenuItem value="OTHER_GENERAL">{strings.categoryOtherGeneral || 'Other'}</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 2 }}>
                        {error}
                    </Alert>
                )}

                {/* Table */}
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>{strings.ticketNumber || 'Ticket #'}</TableCell>
                                <TableCell>{strings.category || 'Category'}</TableCell>
                                <TableCell>{strings.status || 'Status'}</TableCell>
                                <TableCell>{strings.contact || 'Contact'}</TableCell>
                                <TableCell>{strings.createdOn || 'Created'}</TableCell>
                                <TableCell align="center">{strings.actions || 'Actions'}</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <CircularProgress />
                                    </TableCell>
                                </TableRow>
                            ) : tickets.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">
                                            {strings.noTicketsFound || 'No support tickets found'}
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                tickets.map((ticket) => (
                                    <TableRow key={ticket._id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="medium">
                                                {ticket.ticketNumber}
                                            </Typography>
                                        </TableCell>
                                        <TableCell>
                                            {getCategoryLabel(ticket.category)}
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={getStatusLabel(ticket.status)}
                                                color={STATUS_COLORS[ticket.status] || 'default'}
                                                size="small"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            {ticket.contactInfo?.value || '-'}
                                        </TableCell>
                                        <TableCell>
                                            {formatDate(ticket.createdAt)}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title={strings.viewDetails || 'View Details'}>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => handleViewTicket(ticket._id)}
                                                >
                                                    <VisibilityIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                <TablePagination
                    component="div"
                    count={total}
                    page={page}
                    onPageChange={handlePageChange}
                    rowsPerPage={rowsPerPage}
                    onRowsPerPageChange={handleRowsPerPageChange}
                    rowsPerPageOptions={[5, 10, 25, 50]}
                    labelRowsPerPage={strings.rowsPerPage || 'Rows per page'}
                />
                </Box>
            </Paper>

            {/* Detail Dialog */}
            <Dialog
                open={detailDialogOpen}
                onClose={handleCloseDetail}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: { borderRadius: 2, overflow: 'hidden' }
                }}
            >
                {loadingDetail ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : selectedTicket ? (
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, minHeight: 500 }}>
                        {/* Left Sidebar - Metadata */}
                        <Box
                            sx={{
                                width: { xs: '100%', md: 280 },
                                flexShrink: 0,
                                bgcolor: 'grey.900',
                                color: 'white',
                                p: 0,
                            }}
                        >
                            {/* Header with Ticket Number */}
                            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <ConfirmationNumberIcon fontSize="small" />
                                    <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 1 }}>
                                        {strings.ticketNumber || 'Ticket'}
                                    </Typography>
                                </Box>
                                <Typography variant="h6" fontWeight="bold">
                                    {selectedTicket.ticketNumber}
                                </Typography>
                            </Box>

                            {/* Status */}
                            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 1 }}>
                                    {strings.status || 'Status'}
                                </Typography>
                                <Chip
                                    label={getStatusLabel(selectedTicket.status)}
                                    color={STATUS_COLORS[selectedTicket.status] || 'default'}
                                    size="small"
                                    sx={{ fontWeight: 'bold' }}
                                />
                            </Box>

                            {/* Category */}
                            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <CategoryIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                        {strings.category || 'Category'}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" fontWeight="medium">
                                    {getCategoryLabel(selectedTicket.category)}
                                </Typography>
                            </Box>

                            {/* Submitter */}
                            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <PersonIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                        {strings.submittedBy || 'Submitted By'}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" fontWeight="medium">
                                    {selectedTicket.submittedBy?.userName || 'Anonymous'}
                                </Typography>
                                {selectedTicket.submittedBy?.userType && (
                                    <Chip
                                        label={selectedTicket.submittedBy.userType}
                                        size="small"
                                        variant="outlined"
                                        sx={{ mt: 0.5, color: 'white', borderColor: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}
                                    />
                                )}
                            </Box>

                            {/* Contact */}
                            <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <ContactPhoneIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                        {strings.contact || 'Contact'}
                                    </Typography>
                                </Box>
                                <Typography variant="body2" fontWeight="medium">
                                    {selectedTicket.contactInfo?.value || '-'}
                                </Typography>
                                {selectedTicket.contactInfo?.type && (
                                    <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                        {selectedTicket.contactInfo.type}
                                    </Typography>
                                )}
                            </Box>

                            {/* Location */}
                            {selectedTicket.panchayatId && (
                                <Box sx={{ p: 2.5, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                        <LocationOnIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                        <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                            {strings.panchayat || 'Panchayat'}
                                        </Typography>
                                    </Box>
                                    <Typography variant="body2" fontWeight="medium">
                                        {selectedTicket.panchayatId.name}
                                    </Typography>
                                    {(selectedTicket.panchayatId.block || selectedTicket.panchayatId.district) && (
                                        <Typography variant="caption" sx={{ opacity: 0.6 }}>
                                            {[selectedTicket.panchayatId.block, selectedTicket.panchayatId.district]
                                                .filter(Boolean)
                                                .join(', ')}
                                        </Typography>
                                    )}
                                </Box>
                            )}

                            {/* Dates */}
                            <Box sx={{ p: 2.5 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                    <CalendarTodayIcon fontSize="small" sx={{ opacity: 0.7 }} />
                                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                                        {strings.dates || 'Dates'}
                                    </Typography>
                                </Box>
                                <Box sx={{ mt: 1 }}>
                                    <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>
                                        {strings.created || 'Created'}
                                    </Typography>
                                    <Typography variant="body2" fontSize="0.8rem">
                                        {formatDate(selectedTicket.createdAt)}
                                    </Typography>
                                </Box>
                                {selectedTicket.updatedAt && selectedTicket.updatedAt !== selectedTicket.createdAt && (
                                    <Box sx={{ mt: 1.5 }}>
                                        <Typography variant="caption" sx={{ opacity: 0.5, display: 'block' }}>
                                            {strings.lastUpdated || 'Updated'}
                                        </Typography>
                                        <Typography variant="body2" fontSize="0.8rem">
                                            {formatDate(selectedTicket.updatedAt)}
                                        </Typography>
                                    </Box>
                                )}
                            </Box>
                        </Box>

                        {/* Right Content Panel */}
                        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', bgcolor: 'grey.50' }}>
                            {/* Content Header */}
                            <Box sx={{ p: 2.5, bgcolor: 'white', borderBottom: 1, borderColor: 'divider' }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <DevicesIcon fontSize="small" color="action" />
                                        <Typography variant="body2" color="text.secondary">
                                            {strings.sourcePortal || 'Source'}: <strong>{selectedTicket.sourcePortal || '-'}</strong>
                                        </Typography>
                                    </Box>
                                    <IconButton size="small" onClick={handleCloseDetail}>
                                        <RefreshIcon fontSize="small" sx={{ transform: 'rotate(45deg)' }} />
                                    </IconButton>
                                </Box>
                            </Box>

                            {/* Scrollable Content */}
                            <Box sx={{ flex: 1, overflow: 'auto', p: 2.5 }}>
                                {/* Description */}
                                <Box sx={{ mb: 2.5 }}>
                                    <Typography
                                        variant="subtitle2"
                                        color="text.secondary"
                                        sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
                                    >
                                        <DescriptionIcon fontSize="small" />
                                        {strings.description || 'Description'}
                                    </Typography>
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 2,
                                            bgcolor: 'white',
                                            border: 1,
                                            borderColor: 'divider',
                                            borderRadius: 1,
                                        }}
                                    >
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                                            {selectedTicket.description || strings.noDescription || 'No description provided'}
                                        </Typography>
                                    </Paper>
                                </Box>

                                {/* Screenshot Attachment */}
                                {selectedTicket.screenshot?.attachment && (
                                    <Box sx={{ mb: 2.5 }}>
                                        <Typography
                                            variant="subtitle2"
                                            color="text.secondary"
                                            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
                                        >
                                            <ImageIcon fontSize="small" />
                                            {strings.screenshot || 'Screenshot'}
                                        </Typography>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                bgcolor: 'white',
                                                border: 1,
                                                borderColor: 'divider',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                <Box
                                                    component="img"
                                                    src={selectedTicket.screenshot.attachment}
                                                    alt={selectedTicket.screenshot.filename || 'Screenshot'}
                                                    sx={{
                                                        maxWidth: 200,
                                                        maxHeight: 150,
                                                        borderRadius: 1,
                                                        border: 1,
                                                        borderColor: 'divider',
                                                        cursor: 'pointer',
                                                        '&:hover': { opacity: 0.8 }
                                                    }}
                                                    onClick={() => window.open(selectedTicket.screenshot.attachment, '_blank')}
                                                />
                                                <Box sx={{ flex: 1 }}>
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {selectedTicket.screenshot.filename || 'screenshot.png'}
                                                    </Typography>
                                                    {selectedTicket.screenshot.mimeType && (
                                                        <Typography variant="caption" color="text.secondary">
                                                            {selectedTicket.screenshot.mimeType}
                                                        </Typography>
                                                    )}
                                                    <Box sx={{ mt: 1 }}>
                                                        <Button
                                                            size="small"
                                                            startIcon={<DownloadIcon />}
                                                            href={selectedTicket.screenshot.attachment}
                                                            target="_blank"
                                                            download
                                                        >
                                                            {strings.download || 'Download'}
                                                        </Button>
                                                    </Box>
                                                </Box>
                                            </Box>
                                        </Paper>
                                    </Box>
                                )}

                                {/* Voice Note */}
                                {selectedTicket.voiceNote?.attachment && (
                                    <Box sx={{ mb: 2.5 }}>
                                        <Typography
                                            variant="subtitle2"
                                            color="info.main"
                                            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
                                        >
                                            <MicIcon fontSize="small" />
                                            {strings.voiceNote || 'Voice Note'}
                                        </Typography>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                bgcolor: 'info.50',
                                                border: 1,
                                                borderColor: 'info.200',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: 'white', px: 1.5, py: 0.5, borderRadius: 1 }}>
                                                    <PlayArrowIcon color="info" fontSize="small" />
                                                    <Typography variant="body2" fontWeight="medium">
                                                        {selectedTicket.voiceNote.filename || 'voice-note.webm'}
                                                    </Typography>
                                                </Box>
                                                <audio
                                                    controls
                                                    src={selectedTicket.voiceNote.attachment}
                                                    style={{ height: 36, flex: 1, minWidth: 200 }}
                                                />
                                            </Box>
                                        </Paper>
                                    </Box>
                                )}

                                {/* Transcription */}
                                {selectedTicket.transcription?.status && (
                                    <Box sx={{ mb: 2.5 }}>
                                        <Typography
                                            variant="subtitle2"
                                            color={selectedTicket.transcription.status === 'COMPLETED' ? 'success.main' :
                                                   selectedTicket.transcription.status === 'FAILED' ? 'error.main' : 'warning.main'}
                                            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
                                        >
                                            <TranslateIcon fontSize="small" />
                                            {strings.transcription || 'Transcription'}
                                            {selectedTicket.transcription.language && (
                                                <Chip
                                                    label={selectedTicket.transcription.language}
                                                    size="small"
                                                    sx={{ ml: 1, height: 18, fontSize: '0.65rem' }}
                                                />
                                            )}
                                        </Typography>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                bgcolor: selectedTicket.transcription.status === 'COMPLETED' ? 'success.50' :
                                                         selectedTicket.transcription.status === 'FAILED' ? 'error.50' : 'warning.50',
                                                border: 1,
                                                borderColor: selectedTicket.transcription.status === 'COMPLETED' ? 'success.200' :
                                                             selectedTicket.transcription.status === 'FAILED' ? 'error.200' : 'warning.200',
                                                borderRadius: 1,
                                            }}
                                        >
                                            {selectedTicket.transcription.status === 'COMPLETED' && selectedTicket.transcription.text ? (
                                                <Box>
                                                    {/* Main Transcription */}
                                                    <Typography variant="body2" sx={{ lineHeight: 1.7, mb: 2 }}>
                                                        {selectedTicket.transcription.text}
                                                    </Typography>

                                                    {/* Enhanced Transcriptions */}
                                                    {(selectedTicket.transcription.enhancedEnglishTranscription ||
                                                      selectedTicket.transcription.enhancedHindiTranscription) && (
                                                        <Box sx={{ borderTop: 1, borderColor: 'divider', pt: 2, mt: 1 }}>
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                                                                {strings.enhancedVersions || 'Enhanced Versions'}
                                                            </Typography>
                                                            {selectedTicket.transcription.enhancedEnglishTranscription && (
                                                                <Box sx={{ mb: 1.5, bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                                                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                                        English:
                                                                    </Typography>
                                                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                                        {selectedTicket.transcription.enhancedEnglishTranscription}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            {selectedTicket.transcription.enhancedHindiTranscription && (
                                                                <Box sx={{ bgcolor: 'white', p: 1.5, borderRadius: 1 }}>
                                                                    <Typography variant="caption" color="text.secondary" fontWeight="bold">
                                                                        Hindi:
                                                                    </Typography>
                                                                    <Typography variant="body2" sx={{ mt: 0.5 }}>
                                                                        {selectedTicket.transcription.enhancedHindiTranscription}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                        </Box>
                                                    )}
                                                </Box>
                                            ) : selectedTicket.transcription.status === 'PROCESSING' || selectedTicket.transcription.status === 'PENDING' ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <HourglassEmptyIcon color="warning" />
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="medium">
                                                            {selectedTicket.transcription.status === 'PENDING'
                                                                ? (strings.transcriptionPending || 'Transcription pending...')
                                                                : (strings.transcriptionProcessing || 'Transcription in progress...')
                                                            }
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {strings.transcriptionWait || 'Please check back later'}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            ) : selectedTicket.transcription.status === 'FAILED' ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <ErrorOutlineIcon color="error" />
                                                    <Box>
                                                        <Typography variant="body2" fontWeight="medium" color="error.main">
                                                            {strings.transcriptionFailed || 'Transcription failed'}
                                                        </Typography>
                                                        {selectedTicket.transcription.lastError && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {selectedTicket.transcription.lastError}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            ) : (
                                                <Typography variant="body2" color="text.secondary">
                                                    {strings.noTranscription || 'No transcription available'}
                                                </Typography>
                                            )}
                                        </Paper>
                                    </Box>
                                )}

                                {/* Resolution Notes */}
                                {selectedTicket.resolutionNotes && (
                                    <Box sx={{ mb: 2.5 }}>
                                        <Typography
                                            variant="subtitle2"
                                            color="success.main"
                                            sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 0.5, textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: 0.5 }}
                                        >
                                            <CheckCircleIcon fontSize="small" />
                                            {strings.resolutionNotes || 'Resolution Notes'}
                                        </Typography>
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 2,
                                                bgcolor: 'success.50',
                                                border: 1,
                                                borderColor: 'success.200',
                                                borderRadius: 1,
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ lineHeight: 1.7 }}>
                                                {selectedTicket.resolutionNotes}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                )}
                            </Box>

                            {/* Footer Actions - Status Update */}
                            <Box sx={{ bgcolor: 'white', borderTop: 1, borderColor: 'divider' }}>
                                {/* Status Update Section */}
                                <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'divider' }}>
                                    <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <RefreshIcon fontSize="small" />
                                        {strings.updateStatus || 'Update Status'}
                                    </Typography>

                                    {updateError && (
                                        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setUpdateError('')}>
                                            {updateError}
                                        </Alert>
                                    )}

                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                        {/* Status Selection */}
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((status) => (
                                                <Chip
                                                    key={status}
                                                    label={getStatusLabel(status)}
                                                    color={newStatus === status ? STATUS_COLORS[status] : 'default'}
                                                    variant={selectedTicket.status === status ? 'filled' : newStatus === status ? 'filled' : 'outlined'}
                                                    onClick={() => setNewStatus(status === selectedTicket.status ? '' : status)}
                                                    disabled={updatingStatus || status === selectedTicket.status}
                                                    sx={{
                                                        cursor: status === selectedTicket.status ? 'default' : 'pointer',
                                                        opacity: status === selectedTicket.status ? 0.6 : 1,
                                                        fontWeight: selectedTicket.status === status ? 'bold' : 'normal',
                                                        border: selectedTicket.status === status ? 2 : 1,
                                                    }}
                                                />
                                            ))}
                                        </Box>

                                        {/* Resolution Notes - shown when RESOLVED or CLOSED is selected */}
                                        {(newStatus === 'RESOLVED' || newStatus === 'CLOSED') && (
                                            <TextField
                                                fullWidth
                                                multiline
                                                rows={2}
                                                size="small"
                                                label={strings.resolutionNotes || 'Resolution Notes'}
                                                placeholder={strings.resolutionNotesPlaceholder || 'Add notes about how the issue was resolved...'}
                                                value={resolutionNotes}
                                                onChange={(e) => setResolutionNotes(e.target.value)}
                                                disabled={updatingStatus}
                                                sx={{ bgcolor: 'white' }}
                                            />
                                        )}
                                    </Box>
                                </Box>

                                {/* Action Buttons */}
                                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Typography variant="caption" color="text.secondary">
                                        {newStatus && newStatus !== selectedTicket.status ? (
                                            <>
                                                {strings.changingStatusTo || 'Changing status to'}: <strong>{getStatusLabel(newStatus)}</strong>
                                            </>
                                        ) : (
                                            strings.selectNewStatus || 'Select a new status to update'
                                        )}
                                    </Typography>
                                    <Box sx={{ display: 'flex', gap: 1 }}>
                                        <Button
                                            onClick={handleCloseDetail}
                                            variant="outlined"
                                            disabled={updatingStatus}
                                        >
                                            {strings.close || 'Close'}
                                        </Button>
                                        <Button
                                            onClick={handleStatusUpdate}
                                            variant="contained"
                                            disableElevation
                                            disabled={!newStatus || newStatus === selectedTicket.status || updatingStatus}
                                            startIcon={updatingStatus ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
                                        >
                                            {updatingStatus
                                                ? (strings.updating || 'Updating...')
                                                : (strings.updateStatus || 'Update Status')
                                            }
                                        </Button>
                                    </Box>
                                </Box>
                            </Box>
                        </Box>
                    </Box>
                ) : null}
            </Dialog>
        </Box>
    );
};

export default SupportTicketsView;
