// File: frontend/src/views/CitizenPortal.js (Fixed with LanguageProvider)
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Paper,
    Snackbar,
    Alert,
    CircularProgress,
    AppBar,
    Toolbar,
    Button
} from '@mui/material';
import { LanguageProvider } from '../utils/LanguageContext';
import CitizenLoginView from './CitizenLoginView';
import CitizenDashboard from './CitizenDashboard';
import IssueCreationView from './IssueCreationView';
import IssueListView from './IssueListView';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

// View states
const VIEWS = {
    LOGIN: 'login',
    DASHBOARD: 'dashboard',
    CREATE_ISSUE: 'create_issue',
    LIST_ISSUES: 'list_issues'
};

// Main component content - separated to be wrapped with LanguageProvider
const CitizenPortalContent = () => {
    const [currentView, setCurrentView] = useState(VIEWS.LOGIN);
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [notification, setNotification] = useState({
        open: false,
        message: '',
        severity: 'info'
    });
    const navigate = useNavigate();

    // Check for stored session on component mount
    useEffect(() => {
        const checkStoredSession = async () => {
            setLoading(true);
            const storedUser = localStorage.getItem('citizenUser');

            if (storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);

                    // Optional: Validate the stored user data with the backend
                    // This ensures the session is still valid
                    try {
                        const response = await fetch(`${process.env.REACT_APP_API_URL || 'http://localhost:5000/api'}/citizens/profile/${parsedUser._id}`);
                        if (response.ok) {
                            setUser(parsedUser);
                            setCurrentView(VIEWS.DASHBOARD);
                        } else {
                            // If the user session is invalid, clear it
                            localStorage.removeItem('citizenUser');
                            setCurrentView(VIEWS.LOGIN);
                        }
                    } catch (error) {
                        console.warn('Could not validate user session:', error);
                        // Fall back to stored user data if server validation fails
                        setUser(parsedUser);
                        setCurrentView(VIEWS.DASHBOARD);
                    }
                } catch (error) {
                    console.error('Error parsing stored user:', error);
                    // Clear invalid storage
                    localStorage.removeItem('citizenUser');
                }
            }
            setLoading(false);
        };

        checkStoredSession();
    }, []);

    // Handle user login
    const handleLogin = (userData) => {
        console.log({ userData });
        setUser(userData);
        // Store user data in local storage for session persistence
        localStorage.setItem('citizenUser', JSON.stringify(userData));
        setCurrentView(VIEWS.DASHBOARD);
        showNotification('Login successful', 'success');
    };

    // Handle user logout
    const handleLogout = () => {
        setUser(null);
        localStorage.removeItem('citizenUser');
        setCurrentView(VIEWS.LOGIN);
        showNotification('Logged out successfully', 'info');
    };

    // Show notification
    const showNotification = (message, severity = 'info') => {
        setNotification({
            open: true,
            message,
            severity
        });
    };

    // Close notification
    const handleCloseNotification = () => {
        setNotification(prev => ({
            ...prev,
            open: false
        }));
    };

    // Handle issue creation completion
    const handleIssueCreated = (issue) => {
        showNotification('Issue reported successfully', 'success');
        // Navigate back to dashboard after a short delay
        setTimeout(() => {
            setCurrentView(VIEWS.DASHBOARD);
        }, 2000);
    };

    // // Navigation to Admin Portal
    // const navigateToAdmin = () => {
    //     navigate('/admin');
    // };

    // Render the appropriate view
    const renderView = () => {
        switch (currentView) {
            case VIEWS.LOGIN:
                return (
                    <>
                        {/* Add admin button to login screen */}
                        {/* <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
                            <Button
                                variant="outlined"
                                color="primary"
                                onClick={navigateToAdmin}
                                startIcon={<AdminPanelSettingsIcon />}
                                sx={{
                                    backgroundColor: 'rgba(255,255,255,0.8)',
                                    '&:hover': {
                                        backgroundColor: 'rgba(255,255,255,0.9)',
                                    }
                                }}
                            >
                                Admin Portal
                            </Button>
                        </Box> */}
                        <CitizenLoginView onLogin={handleLogin} />
                    </>
                );

            case VIEWS.DASHBOARD:
                return (
                    <CitizenDashboard
                        user={user}
                        onCreateIssue={() => setCurrentView(VIEWS.CREATE_ISSUE)}
                        onViewIssues={() => setCurrentView(VIEWS.LIST_ISSUES)}
                        onLogout={handleLogout}
                    />
                );

            case VIEWS.CREATE_ISSUE:
                return (
                    <IssueCreationView
                        user={user}
                        onBack={() => setCurrentView(VIEWS.DASHBOARD)}
                        onIssueCreated={handleIssueCreated}
                    />
                );

            case VIEWS.LIST_ISSUES:
                return (
                    <IssueListView
                        user={user}
                        onBack={() => setCurrentView(VIEWS.DASHBOARD)}
                    />
                );

            default:
                return <CitizenLoginView onLogin={handleLogin} />;
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                bgcolor: 'background.default',
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), url("/assets/background-pattern.png")',
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative'
            }}
        >
            {/* Simple header with admin portal link */}
            {currentView !== VIEWS.LOGIN && (
                <AppBar position="static" color="primary" elevation={2}>
                    <Toolbar>
                        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                            Gram Sabha Citizen Portal
                        </Typography>
                        {/* <Button
                            color="inherit"
                            variant="outlined"
                            onClick={navigateToAdmin}
                            startIcon={<AdminPanelSettingsIcon />}
                            sx={{
                                borderColor: 'rgba(255,255,255,0.3)',
                                '&:hover': {
                                    borderColor: 'rgba(255,255,255,0.8)',
                                    backgroundColor: 'rgba(255,255,255,0.1)'
                                }
                            }}
                        >
                            Admin Portal
                        </Button> */}
                    </Toolbar>
                </AppBar>
            )}

            {loading ? (
                <Box sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                    gap: 2
                }}>
                    <CircularProgress size={60} />
                    <Typography variant="h6" color="text.secondary">
                        Loading application...
                    </Typography>
                </Box>
            ) : (
                <>
                    {renderView()}

                    <Snackbar
                        open={notification.open}
                        autoHideDuration={6000}
                        onClose={handleCloseNotification}
                        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                    >
                        <Alert
                            onClose={handleCloseNotification}
                            severity={notification.severity}
                            variant="filled"
                            sx={{ width: '100%', boxShadow: 4 }}
                        >
                            {notification.message}
                        </Alert>
                    </Snackbar>
                </>
            )}
        </Box>
    );
};

// Wrapper component that provides the LanguageProvider
const CitizenPortal = () => {
    return (
        <LanguageProvider>
            <CitizenPortalContent />
        </LanguageProvider>
    );
};

export default CitizenPortal;