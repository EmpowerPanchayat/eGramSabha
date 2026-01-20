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
    MenuItem,
    Breadcrumbs,
    Link,
    Tooltip
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DashboardIcon from '@mui/icons-material/Dashboard';
import FormatListBulletedIcon from '@mui/icons-material/FormatListBulleted';
import InfoIcon from '@mui/icons-material/Info';
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
import { fetchIssueSummary } from '../api/summary';
import tokenManager from '../utils/tokenManager';
import formatDate from '../utils/formatDate';
import STATUS_KEY_VALUE_MAP from "../constants/issueStatus";
import IssueDetailsModal from '../components/IssueDetailsModal';
import { FinalAgendaScreen } from '../components/FinalAgendaScreen';
import { updateAgendaSummary } from '../api/summary';
import api from '../utils/axiosConfig';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const IssueListView = ({ user, onBack, onViewIssue }) => {
    const { strings, language } = useLanguage();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [tabValue, setTabValue] = useState(0); // 0 = All Issues, 1= Issue Summary
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
    const [agendaItems, setAgendaItems] = useState([]);
    const [selectedIssues, setSelectedIssues] = useState([]);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState('');
    const [creatorId, setCreatedById] = useState('');
    const [createdForId, setCreatedForId] = useState('');
    const [users, setUsers] = useState([]);
    const [loadingUsers, setLoadingUsers] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItem, setNewItem] = useState({ title: '', description: '', estimatedDuration: 15 });
    const [agendaState, setAgendaState] = useState([]);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [saveError, setSaveError] = useState('');
    const titles = {
        CITIZEN: [strings.myIssues, strings.allIssues],
        DEFAULT: [strings.issuesList, strings.issueSummary],
    };

    const ensureMultilingualFields = (item) => {
        const convertMapToObj = (val) => {
            if (val instanceof Map) return Object.fromEntries(val);
            if (typeof val === 'object' && val !== null) return val;
            if (typeof val === 'string') return { [language]: val };
            return { en: '' };
        };

        return {
            ...item,
            title: convertMapToObj(item.title),
            description: convertMapToObj(item.description),
            createdByType: item.createdByType || 'SYSTEM',
            ...(item.createdByType === 'USER' && item.createdByUserId
            ? { createdByUserId: item.createdByUserId }
            : {}),
        };
    };

    const fetchAgendaSummary = async () => {
        try {
            const res = await api.get(`/summaries/panchayat/${user.panchayatId}`);
            if (res.data?.summary?.agendaItems) {
            setAgendaState(res.data.summary.agendaItems);
            setAgendaItems(res.data.summary.agendaItems); // Sync parent
            }
        } catch (err) {
            console.error('Failed to fetch summary:', err);
        }
    };

    const addNewAgendaItem = async () => {
        if (!newItem.title.trim()) return;

        const item = {
            id: newItem._id || newItem.id || Date.now().toString(),
            _id: newItem._id || newItem.id,
            title: { [language]: newItem.title },
            description: { [language]: newItem.description },
            linkedIssues: [],
            estimatedDuration: newItem.estimatedDuration,
            order: agendaState.length + 1,
            createdByType: 'USER',
            createdByUserId: user.id,
        };

        const updatedAgenda = [...(agendaItems || []), item];
        setAgendaState(updatedAgenda);
        setNewItem({ title: '', description: '', estimatedDuration: 15 });

        try {
            const payload = updatedAgenda.map(ensureMultilingualFields);
            await updateAgendaSummary(user.panchayatId, payload);
            await fetchAgendaSummary();
            setSaveSuccess(true);
            setShowAddForm(false);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (err) {
            setSaveError(err.message || 'Failed to save agenda');
            setTimeout(() => setSaveError(''), 3000);
        }
    };
 
    const handleAddIssuesToSummary = (newIssues) => {
        const newIssuesArray = Array.isArray(newIssues) ? newIssues : [newIssues];
        setSelectedIssues(prevIssues => {
            const existingIds = new Set(prevIssues.map(i => i._id));
            const issuesToAdd = newIssuesArray.filter(i => !existingIds.has(i._id));
            return [...prevIssues, ...issuesToAdd];
        });
    };

    const meeting = {
        selectedIssues: selectedIssues,
        agendaItems
    };

    const fetchSummary = useCallback(async () => {
        if (tabValue !== 1) return;

        setSummaryLoading(true);
        setSummaryError('');
        try {
            const { summary } = await fetchIssueSummary(user.panchayatId);
            if (!summary) {
                setSummaryError('No summary found for this panchayat.');
                setAgendaItems([]);
                setSelectedIssues([]);
                return;
            }
            setAgendaItems(summary.agendaItems || []);
            setSelectedIssues(summary.issues || []);
        } catch (error) {
            setSummaryError(error.message || 'Error fetching issue summary');
            setAgendaItems([]);
            setSelectedIssues([]);
        } finally {
            setSummaryLoading(false);
        }
    }, [tabValue, user.panchayatId]);

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
                params.userId = creatorId;
            }

            if (createdForId) {
                params.createdForId = createdForId;
            }

            if (user.userType === "CITIZEN" && tabValue === 0) {
                const createdForId = user.linkedCitizenId || user.id;
                params = { ...params, createdForId };
            } else {
                if (!user.panchayatId) {
                    setError('Panchayat ID not available');
                    return;
                }
            }
            params = { ...params, panchayatId: user.panchayatId };

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
        if (tabValue === 0 || user.userType === "CITIZEN") {
            fetchIssues();
        } else if (tabValue === 1) {
            fetchSummary();
        }
    }, [category, page, rowsPerPage, status, subcategory, creatorId, createdForId, tabValue, debouncedSearchTerm, fetchIssues, fetchSummary, user.role]);

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
        setTranscriptionLoading(true);
        try {
            const response = await getTranscriptionStatus(issueId);
            
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
        
        setTranscriptionLoading(true);
        try {
            const response = await retryTranscription(selectedIssue._id);
            
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
        setSelectedIssue(null);
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
                    <FormatListBulletedIcon sx={{ mr: 0.5, fontSize: 18 }} />
                    {strings.issuesList || 'Issues & Suggestions'}
                </Typography>
            </Breadcrumbs>

            <Card elevation={3}>
                <Box
                    sx={{
                        p: 2.5,
                        backgroundColor: 'primary.main',
                        color: 'white',
                        borderTopLeftRadius: 8,
                        borderTopRightRadius: 8
                    }}
                >
                    <Typography variant="h5" fontWeight="bold">
                        {(titles[user.userType] || titles.DEFAULT)[tabValue]}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                        {strings.issuesListDescription || 'View, filter, and manage all issues and suggestions submitted to the Gram Panchayat.'}
                    </Typography>
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
                                label={(titles[user.userType] || titles.DEFAULT)[0]}
                                icon={<PersonIcon />}
                                iconPosition="start"
                            />
                            <Tab
                                label={(titles[user.userType] || titles.DEFAULT)[1]}
                                icon={<FolderIcon />}
                                iconPosition="start"
                            />
                        </Tabs>
                    </Paper>
                {(tabValue === 0) || (user.userType === "CITIZEN" && tabValue === 1) ? (
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

                            {user.userType !== "CITIZEN" && (
                                <>
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
                                </>
                            )}

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
                                    'No issues have been reported in your panchayat yet. Click "Report New Issue" on the dashboard to create one.'
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
                                                    {user.userType !== "CITIZEN" && (
                                                        <>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>{strings.creator}</TableCell>
                                                        <TableCell sx={{ fontWeight: 'bold' }}>{strings.createdFor}</TableCell>
                                                        </>
                                                    )}
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
                                                        {user.userType !== "CITIZEN" && (
                                                            <>
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
                                                            </>
                                                        )}
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

                                                {tabValue !== 1 && (
                                                    <>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                        <PersonIcon sx={{ mr: 1, fontSize: '1rem' }} />
                                                        <Typography variant="body2">
                                                            {issue.creator?.name || 'Unknown'}
                                                        </Typography>
                                                    </Box>
                                                    </>
                                                )}

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
                ) : (
                    <>
                    {user.role && ['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role) && (
                    <Box sx={{ px: 3, mt: 4, mb: 4 }}>
                        {!showAddForm && (
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={() => setShowAddForm(true)}
                            sx={{ mb: 2 }}
                        >
                            {strings.addAgendaItem}
                        </Button>
                        )}

                        {showAddForm && (
                        <Paper elevation={3} sx={{ mb: 3, p: 2 }}>
                            <Typography variant="h6" gutterBottom>{strings.addAgendaItem}</Typography>
                            <TextField
                                fullWidth
                                label={strings.title}
                                value={newItem.title}
                                onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
                                sx={{ mb: 2 }}
                                />
                            <TextField
                                fullWidth
                                label={strings.description}
                                multiline
                                minRows={2}
                                value={newItem.description}
                                onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                                sx={{ mb: 2 }}
                                />
                            <TextField
                                label={strings.durationMins}
                                type="number"
                                value={newItem.estimatedDuration}
                                onChange={(e) =>
                                    setNewItem({
                                    ...newItem,
                                    estimatedDuration: parseInt(e.target.value) || 15
                                    })
                                }
                                sx={{ mb: 2, width: 180 }}
                                inputProps={{ min: 1 }}
                            />
                            <Stack direction="row" spacing={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                onClick={() => addNewAgendaItem()}
                                disabled={!newItem.title.trim()}
                            >
                                {strings.add}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={() => setShowAddForm(false)}
                            >
                                {strings.cancel}
                            </Button>
                            </Stack>
                        </Paper>
                        )}
                    </Box>
                    )}
                    {/* Agenda Summary List */}
                    {summaryLoading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
                        <CircularProgress size={60} />
                        </Box>
                    ) : summaryError && agendaItems.length === 0 ? (
                        <Alert severity="error" sx={{ m: 3 }}>
                        {summaryError}
                        </Alert>
                    ) : (
                        <FinalAgendaScreen
                        meeting={meeting}
                        agendaItems={agendaItems}
                        onUpdateAgenda={setAgendaItems}
                        panchayatId={user.panchayatId}
                        onUpdateIssues={handleAddIssuesToSummary}
                        />
                    )}
                    </>
                )}
                </CardContent>
            </Card>

            {/* Issue Details Dialog */}
            <IssueDetailsModal
                issue={selectedIssue}
                tabValue={tabValue}
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
            </IssueDetailsModal>
        </Container>
    );
};

export default IssueListView;