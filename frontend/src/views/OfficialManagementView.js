// File: frontend/src/views/OfficialManagementView.js
import React, { useState, useEffect } from 'react';
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
    Button,
    TextField,
    InputAdornment,
    Alert,
    AlertTitle,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    CircularProgress,
    Stack,
    Menu,
    MenuItem,
    Tooltip,
    Divider,
    Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import KeyIcon from '@mui/icons-material/Key';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LinkIcon from '@mui/icons-material/Link';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import FaceIcon from '@mui/icons-material/Face';
import AssignmentIndIcon from '@mui/icons-material/AssignmentInd';

import OfficialForm from '../components/OfficialForm';
import { fetchOfficials, resetPassword, toggleOfficialStatus, linkOfficialWithCitizen } from '../api/officials';
import { fetchUsers } from '../api';
import { useAuth } from '../utils/authContext';
import ConfirmationDialog from './ConfirmationDialog';

const OfficialManagementView = ({ selectedPanchayat }) => {
    const { user: currentUser } = useAuth();
    const [officials, setOfficials] = useState([]);
    const [citizens, setCitizens] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [searchTerm, setSearchTerm] = useState('');
    const [openForm, setOpenForm] = useState(false);
    const [currentOfficial, setCurrentOfficial] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    const [selectedOfficialId, setSelectedOfficialId] = useState(null);
    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        title: '',
        content: '',
        action: null
    });
    const [linkCitizenDialog, setLinkCitizenDialog] = useState({
        open: false,
        officialId: null
    });
    const [selectedCitizen, setSelectedCitizen] = useState(null);

    const openMenu = Boolean(anchorEl);

    // Role display names mapping
    const roleLabels = {
        ADMIN: 'System Administrator',
        SECRETARY: 'Panchayat Secretary',
        PRESIDENT: 'Panchayat President',
        WARD_MEMBER: 'Ward Member',
        COMMITTEE_SECRETARY: 'Committee Secretary',
        GUEST: 'Guest User'
    };

    // Role colors mapping
    const roleColors = {
        ADMIN: 'error',
        SECRETARY: 'primary',
        PRESIDENT: 'secondary',
        WARD_MEMBER: 'success',
        COMMITTEE_SECRETARY: 'info',
        GUEST: 'default'
    };

    // Fetch officials on component mount and when selectedPanchayat changes
    useEffect(() => {
        if (selectedPanchayat) {
            loadOfficials();
            loadCitizens();
        }
    }, [selectedPanchayat]);

    // Load officials from API
    const loadOfficials = async () => {
        if (!selectedPanchayat) return;

        setLoading(true);
        setError('');
        setSuccess('');

        try {
            const params = {
                panchayatId: selectedPanchayat._id
            };

            const response = await fetchOfficials(params);
            setOfficials(response.data || []);
        } catch (err) {
            console.error('Error loading officials:', err);
            setError('Failed to load officials. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Load citizens (users) from API for linking
    const loadCitizens = async () => {
        if (!selectedPanchayat) return;

        try {
            const users = await fetchUsers(selectedPanchayat._id);
            setCitizens(users || []);
        } catch (err) {
            console.error('Error loading citizens:', err);
            // Don't set error as this is a secondary feature
        }
    };

    // Handle menu open
    const handleMenuOpen = (event, officialId) => {
        setAnchorEl(event.currentTarget);
        setSelectedOfficialId(officialId);
    };

    // Handle menu close
    const handleMenuClose = () => {
        setAnchorEl(null);
        setSelectedOfficialId(null);
    };

    // Handle page change
    const handleChangePage = (event, newPage) => {
        setPage(newPage);
    };

    // Handle rows per page change
    const handleChangeRowsPerPage = (event) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
    };

    // Handle search
    const handleSearchChange = (event) => {
        setSearchTerm(event.target.value);
        setPage(0);
    };

    // Open add/edit form
    const handleOpenForm = (official = null) => {
        setCurrentOfficial(official);
        setOpenForm(true);
    };

    // Close form
    const handleCloseForm = () => {
        setOpenForm(false);
        setCurrentOfficial(null);
    };

    // Handle form submission
    const handleFormSubmit = (officialData) => {
        // Refresh the list after create/update
        loadOfficials();
        setOpenForm(false);
        setSuccess(currentOfficial ? 'Official updated successfully' : 'Official created successfully');
        // Clear success message after 5 seconds
        setTimeout(() => setSuccess(''), 5000);
    };

    // Handle password reset
    const handleResetPassword = async () => {
        setConfirmDialog({
            open: true,
            title: 'Reset Password',
            content: 'Are you sure you want to reset this official\'s password? They will receive a new temporary password.',
            action: 'reset'
        });
    };

    // Handle toggle official status (activate/deactivate)
    const handleToggleStatus = () => {
        const official = officials.find(o => o._id === selectedOfficialId);

        setConfirmDialog({
            open: true,
            title: official.isActive ? 'Deactivate Official' : 'Activate Official',
            content: `Are you sure you want to ${official.isActive ? 'deactivate' : 'activate'} this official's account?`,
            action: 'toggleStatus'
        });
    };

    // Handle citizen linking dialog open
    const handleOpenLinkDialog = () => {
        setLinkCitizenDialog({
            open: true,
            officialId: selectedOfficialId
        });
        handleMenuClose();
    };

    // Handle citizen linking dialog close
    const handleCloseLinkDialog = () => {
        setLinkCitizenDialog({
            open: false,
            officialId: null
        });
        setSelectedCitizen(null);
    };

    // Handle link citizen submission
    const handleLinkCitizen = async () => {
        if (!selectedCitizen) return;

        try {
            await linkOfficialWithCitizen(linkCitizenDialog.officialId, selectedCitizen);

            // Refresh officials list
            loadOfficials();

            // Close dialog
            handleCloseLinkDialog();
            setSuccess('Official linked with citizen successfully');
            setTimeout(() => setSuccess(''), 5000);
        } catch (err) {
            console.error('Error linking official with citizen:', err);
            setError(err.message || 'Failed to link official with citizen');
            setTimeout(() => setError(''), 5000);
        }
    };

    // Handle confirmation dialog actions
    const handleConfirmAction = async () => {
        try {
            if (confirmDialog.action === 'reset') {
                const response = await resetPassword(selectedOfficialId);
                setSuccess(`Password reset successfully. New password: ${response.data.newPassword}`);
            } else if (confirmDialog.action === 'toggleStatus') {
                await toggleOfficialStatus(selectedOfficialId);
                setSuccess('Official status updated successfully');
                loadOfficials(); // Refresh the list
            }
        } catch (err) {
            console.error(`Error during ${confirmDialog.action}:`, err);
            setError(`Failed to ${confirmDialog.action === 'reset' ? 'reset password' : 'update status'}. ${err.message}`);
        } finally {
            setConfirmDialog({ open: false, title: '', content: '', action: null });
            handleMenuClose();
        }
    };

    // Filter officials based on search term
    const filteredOfficials = officials.filter(official => {
        const searchLower = searchTerm.toLowerCase();
        return (
            official.name?.toLowerCase().includes(searchLower) ||
            official.username?.toLowerCase().includes(searchLower) ||
            official.email?.toLowerCase().includes(searchLower) ||
            roleLabels[official.role]?.toLowerCase().includes(searchLower)
        );
    });

    // Get current page data
    const currentOfficials = filteredOfficials.slice(
        page * rowsPerPage,
        page * rowsPerPage + rowsPerPage
    );

    // Check if user has permission to manage officials
    const canManageOfficials =
        currentUser?.role === 'ADMIN' ||
        currentUser?.role === 'SECRETARY';

    return (
        <Box>
            <Paper elevation={1} sx={{ mb: 4, overflow: 'hidden' }}>
                <Box
                    sx={{
                        p: 2.5,
                        backgroundColor: 'primary.main',
                        color: 'white'
                    }}
                >
                    <Typography variant="h5" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center' }}>
                        <AdminPanelSettingsIcon sx={{ mr: 1 }} />
                        Official Management
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                        Manage officials who can access the administrative portal for {selectedPanchayat?.name || 'the Panchayat'}. Add, edit, or remove official accounts and their access permissions.
                    </Typography>
                </Box>
            </Paper>

            {/* Success and Error Alerts */}
            {success && (
                <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            {error && (
                <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {!selectedPanchayat ? (
                <Alert severity="warning">
                    <AlertTitle>No Panchayat Selected</AlertTitle>
                    Please select a panchayat to manage officials.
                </Alert>
            ) : (
                <Paper elevation={2} sx={{ p: 3 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                        <Typography variant="h6">Officials</Typography>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                placeholder="Search officials..."
                                variant="outlined"
                                size="small"
                                value={searchTerm}
                                onChange={handleSearchChange}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon />
                                        </InputAdornment>
                                    ),
                                }}
                            />
                            {canManageOfficials && (
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<PersonAddIcon />}
                                    onClick={() => handleOpenForm()}
                                >
                                    Add Official
                                </Button>
                            )}
                        </Box>
                    </Box>

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                            <CircularProgress />
                        </Box>
                    ) : filteredOfficials.length === 0 ? (
                        <Alert severity="info" sx={{ mb: 3 }}>
                            No officials found. {canManageOfficials && 'Click "Add Official" to create one.'}
                        </Alert>
                    ) : (
                        <>
                            <TableContainer component={Paper} variant="outlined">
                                <Table>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Username</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
                                            <TableCell sx={{ fontWeight: 'bold' }}>Linked Citizen</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {currentOfficials.map((official) => (
                                            <TableRow
                                                key={official._id}
                                                hover
                                                sx={{
                                                    opacity: official.isActive ? 1 : 0.6,
                                                    bgcolor: official.isActive ? 'inherit' : 'action.hover'
                                                }}
                                            >
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <AccountCircleIcon sx={{ mr: 1, color: 'primary.main' }} />
                                                        <Typography variant="body1">{official.name}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>{official.username}</TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <EmailIcon sx={{ mr: 1, fontSize: '0.875rem', color: 'text.secondary' }} />
                                                        <Typography variant="body2">{official.email}</Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        label={roleLabels[official.role] || official.role}
                                                        color={roleColors[official.role] || 'default'}
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        icon={official.isActive ? <CheckCircleIcon /> : <BlockIcon />}
                                                        label={official.isActive ? 'Active' : 'Inactive'}
                                                        color={official.isActive ? 'success' : 'error'}
                                                        variant="outlined"
                                                        size="small"
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {official.linkedCitizenId ? (
                                                        <Chip
                                                            icon={<FaceIcon />}
                                                            label="Linked"
                                                            color="info"
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    ) : (
                                                        <Chip
                                                            icon={<LinkIcon />}
                                                            label="Not Linked"
                                                            color="default"
                                                            size="small"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Tooltip title="Options">
                                                        <IconButton
                                                            onClick={(e) => handleMenuOpen(e, official._id)}
                                                            size="small"
                                                        >
                                                            <MoreVertIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>

                            <TablePagination
                                rowsPerPageOptions={[5, 10, 25]}
                                component="div"
                                count={filteredOfficials.length}
                                rowsPerPage={rowsPerPage}
                                page={page}
                                onPageChange={handleChangePage}
                                onRowsPerPageChange={handleChangeRowsPerPage}
                            />
                        </>
                    )}
                </Paper>
            )}

            {/* Options Menu */}
            <Menu
                anchorEl={anchorEl}
                open={openMenu}
                onClose={handleMenuClose}
            >
                {canManageOfficials && (
                    <MenuItem onClick={() => {
                        const official = officials.find(o => o._id === selectedOfficialId);
                        handleOpenForm(official);
                        handleMenuClose();
                    }}>
                        <EditIcon fontSize="small" sx={{ mr: 1 }} />
                        Edit
                    </MenuItem>
                )}

                {canManageOfficials && (
                    <MenuItem onClick={handleResetPassword}>
                        <KeyIcon fontSize="small" sx={{ mr: 1 }} />
                        Reset Password
                    </MenuItem>
                )}

                {canManageOfficials && (
                    <MenuItem onClick={handleToggleStatus}>
                        {officials.find(o => o._id === selectedOfficialId)?.isActive ? (
                            <>
                                <BlockIcon fontSize="small" sx={{ mr: 1 }} />
                                Deactivate
                            </>
                        ) : (
                            <>
                                <CheckCircleIcon fontSize="small" sx={{ mr: 1 }} />
                                Activate
                            </>
                        )}
                    </MenuItem>
                )}

                <MenuItem onClick={handleOpenLinkDialog}>
                    <AssignmentIndIcon fontSize="small" sx={{ mr: 1 }} />
                    Link with Citizen
                </MenuItem>
            </Menu>

            {/* Official Form Dialog */}
            <Dialog
                open={openForm}
                onClose={handleCloseForm}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    {currentOfficial ? 'Edit Official' : 'Add New Official'}
                </DialogTitle>
                <DialogContent dividers>
                    <OfficialForm
                        official={currentOfficial}
                        selectedPanchayat={selectedPanchayat}
                        onSubmit={handleFormSubmit}
                        onCancel={handleCloseForm}
                    />
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <ConfirmationDialog
                open={confirmDialog.open}
                title={confirmDialog.title}
                content={confirmDialog.content}
                confirmText="Confirm"
                cancelText="Cancel"
                confirmColor={confirmDialog.action === 'toggleStatus' ? 'error' : 'primary'}
                onConfirm={handleConfirmAction}
                onCancel={() => setConfirmDialog({ open: false, title: '', content: '', action: null })}
            />

            {/* Link Citizen Dialog */}
            <Dialog
                open={linkCitizenDialog.open}
                onClose={handleCloseLinkDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Link Official with Citizen</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body2" paragraph color="text.secondary">
                        Linking an official with a citizen allows the official to see their profile information and manage their issues.
                    </Typography>

                    <TextField
                        select
                        label="Select Citizen"
                        fullWidth
                        value={selectedCitizen || ''}
                        onChange={(e) => setSelectedCitizen(e.target.value)}
                        helperText="Select a citizen to link with this official"
                        sx={{ mb: 2 }}
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {citizens.map((citizen) => (
                            <MenuItem key={citizen._id} value={citizen._id}>
                                {citizen.name} ({citizen.voterIdNumber})
                            </MenuItem>
                        ))}
                    </TextField>

                    {selectedCitizen && (
                        <Alert severity="info" sx={{ mt: 2 }}>
                            The selected citizen will be linked with this official's account.
                        </Alert>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseLinkDialog}>Cancel</Button>
                    <Button
                        onClick={handleLinkCitizen}
                        variant="contained"
                        color="primary"
                        disabled={!selectedCitizen}
                    >
                        Link Citizen
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default OfficialManagementView;