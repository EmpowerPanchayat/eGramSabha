// File: frontend/src/views/IssueListView.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    Tabs,
    Tab,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Chip,
    IconButton,
    Button,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Grid,
    InputAdornment,
    Stack,
    useTheme,
    useMediaQuery,
    FormControl,
    Select,
    MenuItem
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import CategoryIcon from '@mui/icons-material/Category';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import FolderIcon from '@mui/icons-material/Folder';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import PersonIcon from '@mui/icons-material/Person';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import NoteIcon from '@mui/icons-material/Note';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../utils/LanguageContext';
import AttachmentViewer from '../components/AttachmentViewer';
import AudioPlayer from '../components/AudioPlayer';
import IssueStatusDropdown from '../components/IssueStatusDropdown';
import CategorySubcategorySelector from '../components/IssueCategorySubcategorySelector';
import { getCategoryIcon } from '../utils/issues';
import { getLabelKeyFromValue } from '../utils/categoryUtils';
import { fetchAllIssues, getTranscriptionStatus, retryTranscription } from '../api/issues';
import tokenManager from '../utils/tokenManager';
import formatDate from '../utils/formatDate';
import STATUS_KEY_VALUE_MAP from "../constants/issueStatus";

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const IssueListView = ({ user, onBack, onViewIssue }) => {
    const { strings } = useLanguage();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tabValue, setTabValue] = useState(0); // 0 = My Issues, 1 = All Issues
    const [issues, setIssues] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [totalIssues, setTotalIssues] = useState(0);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [status, setStatus] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    const [transcriptionData, setTranscriptionData] = useState(null);
    const [transcriptionLoading, setTranscriptionLoading] = useState(false);
    const [creatorId, setCreatedById] = useState('');
    const [createdForId, setCreatedForId] = useState('');
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);

    // Helper to get Authorization header for issues endpoints
    const getAuthHeaders = () => {
        const token = tokenManager.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };

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

    const fetchIssues = useCallback(async () => {
        setLoading(true);
        setError('');
        setRefreshing(true);

        try {
            let params = {
                page,
                limit: rowsPerPage,
                searchText: debouncedSearchTerm,
                status: STATUS_KEY_VALUE_MAP[status],
                category,
                subcategory,
                creatorId,
                createdForId
            };

            if (creatorId) {
                console.log({creatorId});
                params.userId = creatorId;
            }

            if (createdForId) {
                console.log({createdForId});
                params.createdForId = createdForId;
            }

            if (tabValue === 0) {
                const userId = user.linkedCitizenId || user.id;
                params = { ...params, userId };
            } else {
                if (!user.panchayatId) {
                    setError('Panchayat ID not available');
                    return;
                }
                params = { ...params, panchayatId: user.panchayatId };
            }

            const { data, total, retry = false } = await fetchAllIssues(params);

            if (retry) {
                const { data, total } = await fetchAllIssues(params);
                setIssues(data || []);
                setTotalIssues(total || 0);
            } else {
                setIssues(data || []);
                setTotalIssues(total || 0);
            }
        } catch (error) {
            setError(error.message || 'Error fetching issues');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [debouncedSearchTerm, page, rowsPerPage, status, category, subcategory, creatorId, createdForId, tabValue, user.linkedCitizenId, user.id, user.panchayatId]);

    useEffect(() => {
        fetchIssues();
    }, [category, page, rowsPerPage, status, subcategory, creatorId, createdForId, tabValue, debouncedSearchTerm, fetchIssues]);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500); // debounce delay in ms

        return () => {
            clearTimeout(handler);
        };
    }, [searchTerm]);

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
        setPage(0);
    };

    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    const handleViewIssue = async (issue) => {
        setSelectedIssue(issue);
        setDialogOpen(true);
        setTranscriptionData(null);
        
        // Check if issue has transcription data
        if (issue.transcription && issue.transcription.requestId) {
            await fetchTranscriptionStatus(issue._id);
        }
    };

    const fetchTranscriptionStatus = async (issueId) => {
        console.log(`[IssueListView] Fetching transcription status for issue: ${issueId}`);
        setTranscriptionLoading(true);
        try {
            const response = await getTranscriptionStatus(issueId);
            console.log(`[IssueListView] Transcription status response:`, {
                issueId,
                success: response.success,
                hasTranscription: !!response.transcription,
                transcriptionStatus: response.transcription?.status
            });
            
            if (response.success) {
                setTranscriptionData(response.transcription);
            }
        } catch (error) {
            console.error(`[IssueListView] Error fetching transcription status:`, {
                issueId,
                error: error.message,
                stack: error.stack
            });
        } finally {
            setTranscriptionLoading(false);
        }
    };

    const handleRetryTranscription = async () => {
        if (!selectedIssue) return;
        
        console.log(`[IssueListView] User initiated transcription retry for issue: ${selectedIssue._id}`);
        setTranscriptionLoading(true);
        try {
            const response = await retryTranscription(selectedIssue._id);
            console.log(`[IssueListView] Transcription retry response:`, {
                issueId: selectedIssue._id,
                success: response.success,
                message: response.message
            });
            
            // Refresh transcription status after retry
            await fetchTranscriptionStatus(selectedIssue._id);
        } catch (error) {
            console.error(`[IssueListView] Error retrying transcription:`, {
                issueId: selectedIssue._id,
                error: error.message,
                stack: error.stack
            });
        } finally {
            setTranscriptionLoading(false);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setTranscriptionData(null);
    };

    // Get status chip based on issue status
    const getStatusChip = (status) => {
        let color, label;

        switch (status) {
            case 'REPORTED':
                color = 'default';
                label = strings.statusReported;
                break;
            case 'PICKED_IN_AGENDA':
                color = 'info.light';
                label = strings.statusAgendaCreated;
                break;
            case 'DISCUSSED_IN_GRAM_SABHA':
                color = 'info';
                label = strings.statusDiscussedInGramSabha;
                break;
            case 'RESOLVED':
                color = 'success';
                label = strings.statusResolved;
                break;
            case 'TRANSFERRED':
                color = 'warning';
                label = strings.statusTransferred;
                break;
            case 'NO_ACTION_NEEDED':
                color = 'error';
                label = strings.statusNoActionNeeded;
                break;
            default:
                color = 'default';
                label = status;
        }

        return (
            <Chip
                size="small"
                color={color}
                label={label}
                variant="outlined"
            />
        );
    };

    // Get priority badge
    const getPriorityChip = (priority) => {
        return (
            <Chip
                size="small"
                color={priority === 'URGENT' ? 'error' : 'default'}
                label={priority === 'URGENT' ? strings.priorityUrgent : strings.priorityNormal}
                variant="outlined"
            />
        );
    };

    // Get transcription status chip
    const getTranscriptionStatusChip = (status) => {
        let color, label;

        switch (status) {
            case 'PENDING':
                color = 'default';
                label = strings.transcriptionPending;
                break;
            case 'PROCESSING':
                color = 'info';
                label = strings.transcriptionProcessing;
                break;
            case 'COMPLETED':
                color = 'success';
                label = strings.transcriptionCompleted;
                break;
            case 'FAILED':
                color = 'error';
                label = strings.transcriptionFailed;
                break;
            default:
                color = 'default';
                label = 'Unknown';
        }

        return (
            <Chip
                size="small"
                color={color}
                label={label}
                variant="outlined"
            />
        );
    };

    const handleRefreshClick = () => {
        setSearchTerm("");
        setCategory("");
        setSubcategory("");
        setStatus("");
        setCreatedById("");
        setCreatedForId("");
    }

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Card elevation={3}>
                <Box
                    sx={{
                        p: 3,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8,
                        position: 'relative',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
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
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <PlaylistAddCheckIcon sx={{ mr: 1 }} />
                            <Typography variant="h5" component="h1">
                                {strings.issuesList}
                            </Typography>
                        </Box>
                    </Box>
                    <LanguageSwitcher />
                </Box>

                <CardContent sx={{ p: 0 }}>
                    <Paper elevation={0} sx={{ mb: 0, borderRadius: 0 }}>
                        <Tabs
                            value={tabValue}
                            onChange={handleTabChange}
                            variant="fullWidth"
                            indicatorColor="primary"
                            textColor="primary"
                            sx={{
                                borderBottom: 1,
                                borderColor: 'divider',
                                '& .MuiTab-root': {
                                    py: 2
                                }
                            }}
                        >
                            <Tab
                                label={strings.myIssues}
                                icon={<PersonIcon />}
                                iconPosition="start"
                            />
                            <Tab
                                label={strings.allIssues}
                                icon={<FolderIcon />}
                                iconPosition="start"
                            />
                        </Tabs>
                    </Paper>

                    <Box sx={{ p: 3 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: { xs: 'column', sm: 'row' },
                                alignItems: { xs: 'stretch', sm: 'center' },
                                gap: 2,
                                mb: 3
                            }}
                        >
                            <TextField
                                placeholder={strings.searchIssues}
                                variant="outlined"
                                size="small"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                fullWidth
                                sx={{ maxWidth: { sm: 350 } }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon sx={{ color: 'text.secondary' }} />
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <CategorySubcategorySelector category={category} setCategory={setCategory} subcategory={subcategory} setSubcategory={setSubcategory} />

                            <IssueStatusDropdown status={status} setStatus={setStatus} />

                            <FormControl size="small">
                                <Select
                                    value={creatorId}
                                    onChange={(e) => {
                                        setCreatedById(e.target.value);
                                    }}
                                    displayEmpty
                                    fullWidth
                                    >
                                    <MenuItem value="" disabled>{strings.creator}</MenuItem>
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

                            <FormControl size="small">
                                <Select
                                    value={createdForId}
                                    onChange={(e) => {
                                        setCreatedForId(e.target.value);
                                    }}
                                    displayEmpty
                                    fullWidth
                                    >
                                    <MenuItem value="" disabled>{strings.createdFor}</MenuItem>
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

                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={handleRefreshClick}
                                disabled={refreshing}
                                startIcon={refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
                                sx={{ minWidth: 120 }}
                            >
                                {strings.refresh}
                            </Button>
                        </Box>

                        {error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {error}
                            </Alert>
                        )}

                        {loading && !refreshing ? (
                            <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
                                <CircularProgress size={60} />
                            </Box>
                        ) : totalIssues === 0 ? (
                            <Paper
                                elevation={1}
                                sx={{
                                    p: 4,
                                    textAlign: 'center',
                                    borderRadius: 2,
                                    bgcolor: 'background.default'
                                }}
                            >
                                <FolderIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 1 }} />
                                <Typography variant="h6" color="text.secondary" gutterBottom>
                                    {strings.noIssuesFound}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {tabValue === 0
                                        ? 'You have not reported any issues yet. Click "Report New Issue" on the dashboard to create one.'
                                        : 'No issues have been reported in your panchayat yet.'}
                                </Typography>
                            </Paper>
                        ) : (
                            <>
                                {/* Desktop view */}
                                {!isMobile && (
                                    <TableContainer component={Paper} elevation={1} sx={{ borderRadius: 2, overflow: 'hidden' }}>
                                        <Table sx={{ minWidth: 650 }}>
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '50px' }}>{strings.no}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{strings.issueCategory}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{strings.issueSubcategory}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{strings.issueStatus}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{strings.createdOn}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{strings.creator}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold' }}>{strings.createdFor}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>{strings.recording}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '80px' }} align="right">{strings.actions}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {issues.map((issue, index) => (
                                                    <TableRow
                                                        key={issue._id}
                                                        hover
                                                        onClick={() => handleViewIssue(issue)}
                                                        sx={{
                                                            cursor: 'pointer',
                                                            '&:hover': {
                                                                bgcolor: 'action.hover'
                                                            }
                                                        }}
                                                    >
                                                        <TableCell>{page * rowsPerPage + index + 1}</TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <Typography variant="body2" sx={{ mr: 1 }}>
                                                                    {getCategoryIcon(issue.category)}
                                                                </Typography>
                                                                {strings[getLabelKeyFromValue(issue.category)]}
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            {strings[getLabelKeyFromValue(issue.subcategory)]}
                                                        </TableCell>
                                                        <TableCell>{getStatusChip(issue.status)}</TableCell>
                                                        <TableCell>{formatDate(issue.createdAt)}</TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <PersonIcon sx={{ mr: 1, fontSize: '1rem' }} />
                                                                <Typography variant="body2">
                                                                    {issue.creator?.name || 'Unknown'}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                <PersonIcon sx={{ mr: 1, fontSize: '1rem' }} />
                                                                <Typography variant="body2">
                                                                    {issue.createdFor?.name || 'Unknown'}
                                                                </Typography>
                                                            </Box>
                                                        </TableCell>
                                                        <TableCell>
                                                            {issue.attachments && issue.attachments.find(att => att.mimeType.startsWith('audio/')) && (
                                                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                                    <AudioPlayer
                                                                        audioUrl={`${API_URL}/issues/${issue._id}/attachment/${issue.attachments.find(att => att.mimeType.startsWith('audio/'))._id}`}
                                                                        authToken={tokenManager.getToken()}
                                                                    />
                                                                </Box>
                                                            )}
                                                        </TableCell>
                                                        <TableCell align="right">
                                                            <IconButton
                                                                size="small"
                                                                color="primary"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleViewIssue(issue);
                                                                }}
                                                            >
                                                                <VisibilityIcon />
                                                            </IconButton>
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                        <TablePagination
                                            rowsPerPageOptions={[5, 10, 25]}
                                            component="div"
                                            count={totalIssues}
                                            rowsPerPage={rowsPerPage}
                                            page={page}
                                            onPageChange={handleChangePage}
                                            onRowsPerPageChange={handleChangeRowsPerPage}
                                            labelRowsPerPage={strings.rowsPerPage}
                                        />
                                    </TableContainer>
                                )}

                                {/* Mobile View - Card Layout */}
                                {isMobile && (
                                    <Stack spacing={2}>
                                        {issues.map((issue, index) => (
                                            <Paper
                                                key={issue._id}
                                                elevation={1}
                                                sx={{
                                                    p: 2,
                                                    borderRadius: 2,
                                                    cursor: 'pointer',
                                                    transition: 'transform 0.2s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: 2
                                                    }
                                                }}
                                                onClick={() => handleViewIssue(issue)}
                                            >
                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="body1" sx={{ fontSize: '1.2rem', mr: 1 }}>
                                                            {getCategoryIcon(issue.category)}
                                                        </Typography>
                                                        <Typography variant="subtitle1" noWrap sx={{ maxWidth: 150 }}>
                                                            {strings[getLabelKeyFromValue(issue.category)]}
                                                        </Typography>
                                                    </Box>
                                                    {getStatusChip(issue.status)}
                                                </Box>

                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography variant="subtitle1" noWrap sx={{ maxWidth: 150 }}>
                                                            {strings[getLabelKeyFromValue(issue.subcategory)]}
                                                        </Typography>
                                                    </Box>
                                                </Box>

                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <PersonIcon sx={{ mr: 1, fontSize: '1rem' }} />
                                                    <Typography variant="body2">
                                                        {issue.creator?.name || 'Unknown'}
                                                    </Typography>
                                                </Box>

                                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {formatDate(issue.createdAt)}
                                                        </Typography>
                                                    </Box>
                                                    {issue.attachments && issue.attachments.find(att => att.mimeType.startsWith('audio/')) && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <AudioPlayer
                                                                audioUrl={`${API_URL}/issues/${issue._id}/attachment/${issue.attachments.find(att => att.mimeType.startsWith('audio/'))._id}`}
                                                                authToken={tokenManager.getToken()}
                                                            />
                                                        </Box>
                                                    )}
                                                </Box>
                                            </Paper>
                                        ))}

                                        <TablePagination
                                            rowsPerPageOptions={[5, 10]}
                                            component="div"
                                            count={totalIssues}
                                            rowsPerPage={rowsPerPage}
                                            page={page}
                                            onPageChange={handleChangePage}
                                            onRowsPerPageChange={handleChangeRowsPerPage}
                                            labelRowsPerPage=""
                                            labelDisplayedRows={({ from, to, count }) => `${from}-${to} of ${count}`}
                                        />
                                    </Stack>
                                )}
                            </>
                        )}
                    </Box>
                </CardContent>
            </Card>

            {/* Issue Details Dialog */}
            <Dialog
                open={dialogOpen}
                onClose={handleCloseDialog}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        boxShadow: 24
                    }
                }}
            >
                {selectedIssue && (
                    <>
                        <DialogTitle
                            sx={{
                                bgcolor: 'primary.main',
                                color: 'white',
                                pr: 6
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <FolderIcon sx={{ mr: 1 }} />
                                {strings.issueDetailView}
                            </Box>
                            <IconButton
                                aria-label="close"
                                onClick={handleCloseDialog}
                                sx={{
                                    position: 'absolute',
                                    right: 8,
                                    top: 8,
                                    color: 'white'
                                }}
                            >
                                <CloseIcon />
                            </IconButton>
                        </DialogTitle>
                        <DialogContent dividers>
                            <Stack spacing={4}>
                                {/* Basic Information Section */}
                                <Box>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        {strings.basicInformation}
                                    </Typography>
                                    <Grid container spacing={6}>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    {strings.issueCategory}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body1">
                                                {strings[getLabelKeyFromValue(selectedIssue.category)]}
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    {strings.issueSubcategory}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body1">
                                                {strings[getLabelKeyFromValue(selectedIssue.subcategory)]}
                                            </Typography>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <PlaylistAddCheckIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    {strings.issueStatus}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                {getStatusChip(selectedIssue.status)}
                                            </Box>
                                        </Grid>

                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <PriorityHighIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    {strings.issuePriority}
                                                </Typography>
                                            </Box>
                                            <Box>
                                                {getPriorityChip(selectedIssue.priority)}
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>

                                {/* Timeline Section */}
                                <Box>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        {strings.timeline}
                                    </Typography>
                                    <Grid container spacing={3}>
                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <CalendarTodayIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    {strings.createdDate}
                                                </Typography>
                                            </Box>
                                            <Typography variant="body1">
                                                {formatDate(selectedIssue.createdAt)}
                                            </Typography>
                                        </Grid>

                                        {selectedIssue.toBeResolvedBefore && (
                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <CalendarTodayIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                    <Typography variant="subtitle2" color="text.secondary">
                                                        {strings.targetDate}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body1">
                                                    {formatDate(selectedIssue.toBeResolvedBefore)}
                                                </Typography>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>

                                {/* Additional Information Section */}
                                <Box>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        {strings.additionalInformation}
                                    </Typography>
                                    <Grid container spacing={3}>
                                        {selectedIssue.createdForId && (
                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                    <Typography variant="subtitle2" color="text.secondary">
                                                        {strings.createdFor}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body1">
                                                    {selectedIssue.createdForId?.name}
                                                </Typography>
                                            </Grid>
                                        )}

                                        <Grid item xs={12} sm={6}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                <Typography variant="subtitle2" color="text.secondary">
                                                    {strings.creator}
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                <PersonIcon sx={{ mr: 1, fontSize: '1rem' }} />
                                                <Typography variant="body1">
                                                    {selectedIssue.creator?.name || 'Unknown'}
                                                </Typography>
                                            </Box>
                                        </Grid>

                                        {selectedIssue.remark && (
                                            <Grid item xs={12}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <NoteIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                    <Typography variant="subtitle2" color="text.secondary">
                                                        {strings.remark}
                                                    </Typography>
                                                </Box>
                                                <Paper
                                                    variant="outlined"
                                                    sx={{
                                                        p: 2,
                                                        bgcolor: 'background.default',
                                                        borderRadius: 2
                                                    }}
                                                >
                                                    <Typography variant="body2">
                                                        {selectedIssue.remark}
                                                    </Typography>
                                                </Paper>
                                            </Grid>
                                        )}
                                    </Grid>
                                </Box>

                                {/* Transcription Section */}
                                {(selectedIssue.transcription || transcriptionData) && (
                                    <Box>
                                        <Typography variant="h6" color="primary" gutterBottom>
                                            {strings.audioTranscription}
                                        </Typography>
                                        <Paper
                                            variant="outlined"
                                            sx={{
                                                p: 3,
                                                bgcolor: 'background.default',
                                                borderRadius: 2
                                            }}
                                        >
                                            {transcriptionLoading ? (
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', py: 2 }}>
                                                    <CircularProgress size={24} sx={{ mr: 2 }} />
                                                    <Typography>{strings.transcriptionLoading}</Typography>
                                                </Box>
                                            ) : transcriptionData ? (
                                                <Box>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                                                        <Typography variant="subtitle2" color="text.secondary" sx={{ mr: 2 }}>
                                                            {strings.transcriptionStatus}:
                                                        </Typography>
                                                        {getTranscriptionStatusChip(transcriptionData.status)}
                                                        {transcriptionData.language && (
                                                            <Chip
                                                                size="small"
                                                                label={`${strings.transcriptionLanguage}: ${transcriptionData.language}`}
                                                                variant="outlined"
                                                                sx={{ ml: 1 }}
                                                            />
                                                        )}
                                                    </Box>
                                                    
                                                    {transcriptionData.status === 'COMPLETED' && transcriptionData.text && (
                                                        <Box>
                                                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                {strings.transcriptionText}:
                                                            </Typography>
                                                            
                                                            {/* Enhanced English Transcription (Primary) */}
                                                            {transcriptionData.enhancedEnglishTranscription && (
                                                                <Box sx={{ mb: 2 }}>
                                                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                                                        {strings.enhancedEnglish}:
                                                                    </Typography>
                                                                    <Paper
                                                                        variant="outlined"
                                                                        sx={{
                                                                            p: 2,
                                                                            bgcolor: 'grey.50',
                                                                            borderRadius: 1,
                                                                            maxHeight: 150,
                                                                            overflow: 'auto'
                                                                        }}
                                                                    >
                                                                        <Typography variant="body2">
                                                                            {transcriptionData.enhancedEnglishTranscription}
                                                                        </Typography>
                                                                    </Paper>
                                                                </Box>
                                                            )}
                                                            
                                                            {/* Enhanced Hindi Transcription */}
                                                            {transcriptionData.enhancedHindiTranscription && (
                                                                <Box sx={{ mb: 2 }}>
                                                                    <Typography variant="subtitle2" color="primary" gutterBottom>
                                                                        {strings.enhancedHindi}:
                                                                    </Typography>
                                                                    <Paper
                                                                        variant="outlined"
                                                                        sx={{
                                                                            p: 2,
                                                                            bgcolor: 'grey.50',
                                                                            borderRadius: 1,
                                                                            maxHeight: 150,
                                                                            overflow: 'auto'
                                                                        }}
                                                                    >
                                                                        <Typography variant="body2">
                                                                            {transcriptionData.enhancedHindiTranscription}
                                                                        </Typography>
                                                                    </Paper>
                                                                </Box>
                                                            )}
                                                            
                                                            {/* Original Transcription */}
                                                            {transcriptionData.originalTranscription && (
                                                                <Box sx={{ mb: 2 }}>
                                                                    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                                                        {strings.originalTranscription}:
                                                                    </Typography>
                                                                    <Paper
                                                                        variant="outlined"
                                                                        sx={{
                                                                            p: 2,
                                                                            bgcolor: 'grey.100',
                                                                            borderRadius: 1,
                                                                            maxHeight: 100,
                                                                            overflow: 'auto'
                                                                        }}
                                                                    >
                                                                        <Typography variant="body2" color="text.secondary">
                                                                            {transcriptionData.originalTranscription}
                                                                        </Typography>
                                                                    </Paper>
                                                                </Box>
                                                            )}
                                                            
                                                            {/* Fallback to main text if no enhanced versions */}
                                                            {!transcriptionData.enhancedEnglishTranscription && !transcriptionData.enhancedHindiTranscription && (
                                                                <Paper
                                                                    variant="outlined"
                                                                    sx={{
                                                                        p: 2,
                                                                        bgcolor: 'grey.50',
                                                                        borderRadius: 1,
                                                                        maxHeight: 200,
                                                                        overflow: 'auto'
                                                                    }}
                                                                >
                                                                    <Typography variant="body2">
                                                                        {transcriptionData.text}
                                                                    </Typography>
                                                                </Paper>
                                                            )}
                                                            
                                                            {/* Transcription Metadata */}
                                                            {/* {(transcriptionData.processingMode || transcriptionData.transcriptionProvider) && (
                                                                <Box sx={{ mt: 2 }}>
                                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                                        Processing Mode: {transcriptionData.processingMode || 'N/A'}
                                                                    </Typography>
                                                                    <Typography variant="caption" color="text.secondary" display="block">
                                                                        Provider: {transcriptionData.transcriptionProvider || 'N/A'}
                                                                    </Typography>
                                                                </Box>
                                                            )}
                                                            
                                                            {transcriptionData.completedAt && (
                                                                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                                    Completed: {formatDate(transcriptionData.completedAt)}
                                                                </Typography>
                                                            )} */}
                                                        </Box>
                                                    )}
                                                    
                                                    {transcriptionData.status === 'PROCESSING' && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', py: 2 }}>
                                                            <CircularProgress size={20} sx={{ mr: 2 }} />
                                                            <Typography>{strings.transcriptionProcessing}</Typography>
                                                        </Box>
                                                    )}
                                                    
                                                    {transcriptionData.status === 'FAILED' && (
                                                        <Box>
                                                            <Alert severity="error" sx={{ mb: 2 }}>
                                                                {strings.transcriptionError}: {transcriptionData.error || 'Unknown error'}
                                                            </Alert>
                                                            <Button
                                                                variant="outlined"
                                                                color="primary"
                                                                onClick={handleRetryTranscription}
                                                                disabled={transcriptionLoading}
                                                                startIcon={transcriptionLoading ? <CircularProgress size={16} /> : <RefreshIcon />}
                                                            >
                                                                {strings.retryTranscription}
                                                            </Button>
                                                        </Box>
                                                    )}
                                                </Box>
                                            ) : (
                                                <Typography color="text.secondary">
                                                    {strings.transcriptionNoData}
                                                </Typography>
                                            )}
                                        </Paper>
                                    </Box>
                                )}

                                {/* Attachments Section */}
                                {selectedIssue.attachments && selectedIssue.attachments.length > 0 && (
                                    <Box>
                                        <Typography variant="h6" color="primary" gutterBottom>
                                            {strings.attachments}
                                        </Typography>
                                        <Box sx={{ mt: 2 }}>
                                            {selectedIssue.attachments.map((attachment, index) => (
                                                <AttachmentViewer
                                                    key={attachment._id || index}
                                                    attachmentUrl={`${API_URL}/issues/${selectedIssue._id}/attachment/${attachment._id}`}
                                                    filename={attachment.filename || `Attachment ${index + 1}`}
                                                    mimeType={attachment.mimeType}
                                                    authToken={tokenManager.getToken()}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions sx={{ p: 2 }}>
                            <Button
                                variant="outlined"
                                onClick={handleCloseDialog}
                                startIcon={<CloseIcon />}
                                size="large"
                            >
                                {strings.close}
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Container>
    );
};

export default IssueListView;