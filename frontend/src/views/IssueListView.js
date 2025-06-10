// File: frontend/src/views/IssueListView.js
import React, { useState, useEffect } from 'react';
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
    useMediaQuery
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
import { getCategoryIcon, filterIssues } from '../utils/issues';
import { getLabelKeyFromValue } from '../utils/categoryUtils';
import { fetchAllIssues } from '../api/issues';
import tokenManager from '../utils/tokenManager';
import formatDate from '../utils/formatDate';

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
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [refreshing, setRefreshing] = useState(false);
    const [category, setCategory] = useState('');
    const [subcategory, setSubcategory] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        fetchIssues();
    }, [tabValue]);

    const fetchIssues = async () => {
        setLoading(true);
        setError('');
        setRefreshing(true);

        try {
            let url;
            if (tabValue === 0) {
                const userId = user.linkedCitizenId || user.id;
                url = `issues/user/${userId}`;
            } else {
                if (!user.panchayatId) {
                    setError('Panchayat ID not available');
                    return;
                }
                url = `issues/panchayat/${user.panchayatId}`;
            }

            const { data, retry } = await fetchAllIssues({ url });

            // Retry once after token refresh
            if (retry) {
                const { data: retryData } = await fetchAllIssues({ url });
                setIssues(retryData?.issues || []);
            } else {
                setIssues(data?.issues || []);
            }
        } catch (error) {
            setError(error.message || 'Error fetching issues');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
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

    const handleViewIssue = (issue) => {
        setSelectedIssue(issue);
        setDialogOpen(true);
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
    };

    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    // Filter issues based on search term
    const filteredIssues = filterIssues(issues, { category, subcategory, status, searchTerm });

    // Get status chip based on issue status
    const getStatusChip = (status) => {
        let color, label;

        switch (status) {
            case 'REPORTED':
                color = 'default';
                label = strings.statusReported;
                break;
            case 'AGENDA_CREATED':
                color = 'info';
                label = strings.statusAgendaCreated;
                break;
            case 'RESOLVED':
                color = 'success';
                label = strings.statusResolved;
                break;
            case 'ESCALATED':
                color = 'warning';
                label = strings.statusEscalated;
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

    const handleRefreshClick = () => {
        setSearchTerm("");
        setCategory("");
        setSubcategory("");
        setStatus("");
        fetchIssues();
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
                        ) : filteredIssues.length === 0 ? (
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
                                                    <TableCell sx={{ fontWeight: 'bold', width: '100px' }}>{strings.recording}</TableCell>
                                                    <TableCell sx={{ fontWeight: 'bold', width: '80px' }} align="right">{strings.actions}</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {filteredIssues
                                                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                                    .map((issue, index) => (
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
                                            count={filteredIssues.length}
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
                                        {filteredIssues
                                            .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                                            .map((issue, index) => (
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
                                            count={filteredIssues.length}
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
                                {/* Issue Description Section */}
                                {/* <Box>
                                    <Typography variant="h6" color="primary" gutterBottom>
                                        {strings.issueDescription}
                                    </Typography>
                                    <Paper 
                                        variant="outlined" 
                                        sx={{ 
                                            p: 2, 
                                            bgcolor: 'background.default',
                                            borderRadius: 2
                                        }}
                                    >
                                        <Typography variant="body1">
                                            {selectedIssue.text}
                                        </Typography>
                                    </Paper>
                                </Box> */}

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
                                        {selectedIssue.createdFor && (
                                            <Grid item xs={12} sm={6}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                    <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                    <Typography variant="subtitle2" color="text.secondary">
                                                        {strings.createdFor}
                                                    </Typography>
                                                </Box>
                                                <Typography variant="body1">
                                                    {selectedIssue.createdFor}
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