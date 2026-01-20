// File: frontend/src/views/AdminPortal.js
import React, { useState, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Alert,
    CircularProgress,
    Paper
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import Header from '../components/Header';
import { useAuth } from '../utils/authContext';

// Import views
import { HomeView, SearchView, RegistrationView, UsersView, ImportView } from '.';
import PanchayatsView from './PanchayatsView';

// Import API functions
import { fetchStats, searchUser, fetchUsers, getFaceImage, importCsv } from '../api';

// Import components
import FaceRegistration from '../components/FaceRegistration';
import LoadingOverlay from '../components/LoadingOverlay';
import PanchayatSelector from '../components/PanchayatSelector';
import OfficialManagementView from './OfficialManagementView';
import SupportTicketsView from './SupportTicketsView';
import HelpButton from '../components/HelpButton';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';

// TabPanel component for view switching
function TabPanel(props) {
    const { children, value, index, ...other } = props;

    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`nav-tabpanel-${index}`}
            aria-labelledby={`nav-tab-${index}`}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

const AdminPortal = () => {
    const { user, loading: authLoading } = useAuth();
    const [activeView, setActiveView] = useState(0); // 0 = home, 1 = search, 2 = users, 3 = import, 4 = panchayats
    const [users, setUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedUser, setSelectedUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [stats, setStats] = useState({ totalUsers: 0, registeredUsers: 0, pendingUsers: 0 });
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [selectedPanchayat, setSelectedPanchayat] = useState(null);
    const fileInputRef = React.useRef();
    const navigate = useNavigate();

    // Check if user is authenticated and has admin role
    useEffect(() => {
        if (!authLoading && (!user || user.role !== 'ADMIN')) {
            navigate('/admin/login');
        }
    }, [user, authLoading, navigate]);

    // Load face-api models
    useEffect(() => {
        const loadModels = async () => {
            setLoading(true);
            try {
                // Use a CDN instead of local files
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                setModelsLoaded(true);
                console.log('Face-api models loaded successfully from CDN');
            } catch (error) {
                console.error('Error loading models:', error);
                setMessage({ type: 'error', text: 'Failed to load facial recognition models.' });
            } finally {
                setLoading(false);
            }
        };

        loadModels();
    }, []);

    // Fetch stats - updated to include panchayat filter
    useEffect(() => {
        const getStats = async () => {
            try {
                const panchayatId = selectedPanchayat ? selectedPanchayat._id : null;
                const statsData = await fetchStats(panchayatId);
                setStats(statsData);
            } catch (error) {
                console.error('Error fetching stats:', error);
                setMessage({ type: 'error', text: 'Failed to fetch statistics.' });
            }
        };

        getStats();
    }, [selectedPanchayat]);

    // Handle CSV import - updated to include panchayatId
    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!selectedPanchayat) {
            setMessage({
                type: 'error',
                text: 'Please select a panchayat before importing members.'
            });
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const data = await importCsv(formData, selectedPanchayat._id);

            setMessage({ type: 'success', text: data.message });

            // Refresh stats and users
            const panchayatId = selectedPanchayat ? selectedPanchayat._id : null;
            const userList = await fetchUsers(panchayatId);
            setUsers(userList);

            const statsData = await fetchStats(panchayatId);
            setStats(statsData);
        } catch (error) {
            console.error('Error importing CSV:', error);
            setMessage({
                type: 'error',
                text: error.message || 'Error importing CSV file.'
            });
        } finally {
            setLoading(false);
        }
    };

    // Search user by voter ID - updated to include panchayatId
    const handleSearchUser = async () => {
        if (!searchQuery) {
            setMessage({ type: 'error', text: 'Please enter a voter ID.' });
            return;
        }

        if (!selectedPanchayat) {
            setMessage({
                type: 'error',
                text: 'Please select a panchayat before searching for members.'
            });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const userData = await searchUser(searchQuery, selectedPanchayat._id);

            // If user is registered, attempt to fetch face image data
            if (userData.isRegistered) {
                try {
                    // This will pre-fetch the image data, but the actual display
                    // is handled in the RegistrationView component
                    await getFaceImage(userData.voterIdNumber, userData.panchayatId);
                } catch (imgError) {
                    console.warn('Face image not available:', imgError);
                    // We don't set an error message here as the image might not be critical
                }
            }

            setSelectedUser(userData);
            setActiveView(1); // Set to registration view
        } catch (error) {
            console.error('Error searching member:', error);
            setMessage({
                type: 'error',
                text: error.message || 'Error searching for member.'
            });
            setSelectedUser(null);
        } finally {
            setLoading(false);
        }
    };

    // Navigation handlers - updated to include citizen portal view
    const handleChangeView = (event, newValue) => {
        setActiveView(newValue);
        setMessage({ type: '', text: '' });

        // Reset selected user when switching views
        if (newValue !== 1) { // Not the registration view
            setSelectedUser(null);
        }

        if (newValue === 2) { // Users view
            if (selectedPanchayat) {
                fetchUsers(selectedPanchayat._id).then(data => setUsers(data));
            } else {
                setMessage({ type: 'info', text: 'Please select a panchayat to view members.' });
            }
        }

        // If navigating to panchayats view, clear any messages
        if (newValue === 4) {
            setMessage({ type: '', text: '' });
        }
    };

    // Handle panchayat selection
    const handlePanchayatChange = (panchayat) => {
        if (!panchayat) {
            setSelectedPanchayat(null);
            return;
        }
        let panchayatId = panchayat;
        if (panchayat && panchayat?._id) {
            panchayatId = panchayat?._id;
        }

        setLoading(true);
        // Fetch the full panchayat object
        import('../api').then(({ fetchPanchayat }) => {
            fetchPanchayat(panchayatId)
                .then(data => {
                    if (data && data.success && data.panchayat) {
                        // Extract the panchayat object from the response
                        const panchayatData = data.panchayat;
                        setSelectedPanchayat(panchayatData);

                        // Refresh users and stats for the selected panchayat
                        fetchUsers(panchayatData._id).then(userData => setUsers(userData));
                        fetchStats(panchayatData._id).then(statsData => setStats(statsData));
                    } else {
                        console.error("Invalid panchayat data received:", data);
                        setMessage({ type: 'error', text: 'Failed to select panchayat. Please try again.' });
                    }
                })
                .catch(err => {
                    console.error("Error fetching panchayat:", err);
                    setMessage({ type: 'error', text: 'Error selecting panchayat: ' + err.message });
                })
                .finally(() => {
                    setLoading(false);
                });
        });
    };

    // Handle user update (after registration)
    const handleUserUpdate = (updatedUser) => {
        setSelectedUser(updatedUser); // Update selectedUser with new data
        // Update the users list with the updated user
        setUsers(prevUsers =>
            prevUsers.map(u =>
                u._id === updatedUser._id ? { ...u, ...updatedUser } : u
            )
        );
        // Refresh stats
        if (selectedPanchayat) {
            fetchStats(selectedPanchayat._id).then(data => setStats(data));
        } else {
            fetchStats().then(data => setStats(data));
        }
    };

    // Handle selecting a user from the users table
    const handleUserSelect = async (user) => {
        setSelectedUser(user);

        // If user is registered, pre-fetch their face image
        if (user.isRegistered) {
            setLoading(true);
            try {
                await getFaceImage(user.voterIdNumber, user.panchayatId);
            } catch (error) {
                console.warn('Could not fetch face image:', error);
            } finally {
                setLoading(false);
            }
        }

        setActiveView(1); // Set to registration view
    };

    // Custom navigate function for all views
    const navigateTo = (view) => {
        // Map string view name to tab index
        const viewMap = {
            'home': 0,
            'search': 1,
            'users': 2,
            'import': 3,
            'panchayats': 4,
            'registration': 1,
            'citizen': 'citizen'
        };

        if (view === 'citizen') {
            // Navigate to citizen portal
            navigate('/');
            return;
        }

        setSelectedUser(null);
        setActiveView(viewMap[view]);
    };

    // Updated menu items to include Citizen Portal
    const menuItems = [
        { label: 'Home', icon: <HomeIcon /> },
        { label: 'Search', icon: <SearchIcon /> },
        { label: 'Members', icon: <PeopleIcon /> },
        { label: 'Import', icon: <UploadFileIcon /> },
        { label: 'Panchayats', icon: <AccountBalanceIcon /> },
        { label: 'Officials', icon: <AdminPanelSettingsIcon /> },
        { label: 'Support', icon: <SupportAgentIcon /> }
    ];

    if (authLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user || user.role !== 'ADMIN') {
        return null; // Will be redirected by the useEffect
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header
                activeView={activeView}
                handleChangeView={handleChangeView}
                menuItems={menuItems}
                selectedPanchayat={selectedPanchayat}
                onPanchayatChange={handlePanchayatChange}
                isAdminPortal={true}
                onSwitchPortal={() => navigate('/')}
            />

            <Container component="main" sx={{ flexGrow: 1, py: 4, maxWidth: 'lg' }}>
                {/* Display messages */}
                {message.text && (
                    <Alert
                        severity={message.type || 'info'}
                        sx={{ mb: 3 }}
                    >
                        {message.text}
                    </Alert>
                )}

                {/* Home View */}
                <TabPanel value={activeView} index={0}>
                    <HomeView
                        stats={stats}
                        navigateTo={navigateTo}
                        selectedPanchayat={selectedPanchayat}
                    />
                </TabPanel>

                {/* Search/Registration View */}
                <TabPanel value={activeView} index={1}>
                    {!selectedUser ? (
                        <SearchView
                            searchQuery={searchQuery}
                            setSearchQuery={setSearchQuery}
                            searchUser={handleSearchUser}
                            selectedPanchayat={selectedPanchayat}
                        />
                    ) : (
                        <RegistrationView
                            user={selectedUser}
                            navigateTo={navigateTo}
                            onUserUpdate={handleUserUpdate}
                        >
                            <FaceRegistration
                                user={selectedUser}
                                modelsLoaded={modelsLoaded}
                                onUserUpdate={handleUserUpdate}
                                setMessage={setMessage}
                                setLoading={setLoading}
                            />
                        </RegistrationView>
                    )}
                </TabPanel>

                {/* Users View */}
                <TabPanel value={activeView} index={2}>
                    <UsersView
                        users={users}
                        setSelectedUser={handleUserSelect}
                        selectedPanchayat={selectedPanchayat}
                    />
                </TabPanel>

                {/* Import View */}
                <TabPanel value={activeView} index={3}>
                    <ImportView
                        fileInputRef={fileInputRef}
                        handleFileUpload={handleFileUpload}
                        selectedPanchayat={selectedPanchayat}
                    />
                </TabPanel>

                {/* Panchayats View */}
                <TabPanel value={activeView} index={4}>
                    <PanchayatsView
                        navigateTo={navigateTo}
                        setSelectedPanchayat={handlePanchayatChange}
                    />
                </TabPanel>

                {/* Officials View */}
                <TabPanel value={activeView} index={5}>
                    <OfficialManagementView
                        selectedPanchayat={selectedPanchayat}
                    />
                </TabPanel>

                {/* Support Tickets View */}
                <TabPanel value={activeView} index={6}>
                    <SupportTicketsView
                        user={user}
                        selectedPanchayat={selectedPanchayat}
                    />
                </TabPanel>
            </Container>

            {/* Loading indicator overlay */}
            {loading && <LoadingOverlay />}

            <Box
                component="footer"
                sx={{
                    backgroundColor: 'grey.200',
                    p: 2,
                    textAlign: 'center',
                    mt: 'auto'
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    &copy; 2025 Empower Panchayat
                </Typography>
            </Box>

            {/* Help Button */}
            <HelpButton
                user={user}
                panchayatId={selectedPanchayat?._id}
                sourcePortal="ADMIN"
            />
        </Box>
    );
};

export default AdminPortal;