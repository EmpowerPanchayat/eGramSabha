// File: frontend/src/views/OfficialPortal.js
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
import { LanguageProvider, useLanguage } from '../utils/LanguageContext';
import { useAuth } from '../utils/authContext';
import OfficialDashboard from './OfficialDashboard';
import IssueCreationView from './IssueCreationView';
import IssueListView from './IssueListView';
import GramSabhaView from './GramSabhaView';
import SupportTicketsView from './SupportTicketsView';
import PanchayatSettingsView from './PanchayatSettingsView';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import HelpButton from '../components/HelpButton';

// View states
const VIEWS = {
    DASHBOARD: 'dashboard',
    CREATE_ISSUE: 'create_issue',
    LIST_ISSUES: 'list_issues',
    GRAM_SABHA: 'gram_sabha',
    SUPPORT_TICKETS: 'support_tickets',
    PANCHAYAT_SETTINGS: 'panchayat_settings'
};

// Create a separate header component to properly use the language context
const PortalHeader = ({ currentView, handleBackToDashboard, user }) => {
    const { strings } = useLanguage();

    return (
        <AppBar position="static" color="primary">
            <Toolbar>
                <AdminPanelSettingsIcon sx={{ mr: 2 }} />
                <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                    {strings.officialPortal} - {user.name}
                </Typography>
                {currentView !== VIEWS.DASHBOARD && currentView !== VIEWS.PANCHAYAT_SETTINGS && (
                    <Button
                        color="inherit"
                        onClick={handleBackToDashboard}
                        startIcon={<AdminPanelSettingsIcon />}
                    >
                        {strings.backToDashboard}
                    </Button>
                )}
            </Toolbar>
        </AppBar>
    );
};

const OfficialPortal = () => {
    const { user, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const [currentView, setCurrentView] = useState(VIEWS.DASHBOARD);
    const [selectedIssue, setSelectedIssue] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const { strings } = useLanguage();

    // Check if user is authenticated and has official role
    useEffect(() => {
        if (!authLoading && (!user || !['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role))) {
            navigate('/official/login');
        }
    }, [user, authLoading, navigate]);

    const handleCreateIssue = () => {
        setCurrentView(VIEWS.CREATE_ISSUE);
    };

    const handleViewIssues = () => {
        setCurrentView(VIEWS.LIST_ISSUES);
    };

    const handleManageGramSabha = () => {
        setCurrentView(VIEWS.GRAM_SABHA);
    };

    const handleViewSupportTickets = () => {
        setCurrentView(VIEWS.SUPPORT_TICKETS);
    };

    const handlePanchayatSettings = () => {
        setCurrentView(VIEWS.PANCHAYAT_SETTINGS);
    };

    const handleBackToDashboard = () => {
        setCurrentView(VIEWS.DASHBOARD);
        setSelectedIssue(null);
    };

    const handleViewIssue = (issue) => {
        setSelectedIssue(issue);
    };

    if (authLoading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    if (!user || !['SECRETARY', 'PRESIDENT', 'WARD_MEMBER', 'COMMITTEE_SECRETARY'].includes(user.role)) {
        return null; // Will be redirected by the useEffect
    }

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            {/* Header - Now using the separate component that has access to language context */}
            <PortalHeader
                currentView={currentView}
                handleBackToDashboard={handleBackToDashboard}
                user={user}
            />

            {/* Main Content */}
            <Container maxWidth="xl" sx={{ py: 4, flex: 1 }}>
                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                        <CircularProgress size={60} />
                    </Box>
                ) : (
                    <>
                        {currentView === VIEWS.DASHBOARD && (
                            <OfficialDashboard
                                onCreateIssue={handleCreateIssue}
                                onViewIssues={handleViewIssues}
                                onManageGramSabha={handleManageGramSabha}
                                onPanchayatSettings={handlePanchayatSettings}
                                user={user}
                            />
                        )}

                        {currentView === VIEWS.CREATE_ISSUE && (
                            <IssueCreationView
                                user={user}
                                onBack={handleBackToDashboard}
                                onSuccess={() => {
                                    setSuccess(strings.issueCreatedSuccess);
                                    handleBackToDashboard();
                                }}
                            />
                        )}

                        {currentView === VIEWS.LIST_ISSUES && (
                            <IssueListView
                                user={user}
                                onBack={handleBackToDashboard}
                                onViewIssue={handleViewIssue}
                            />
                        )}

                        {currentView === VIEWS.GRAM_SABHA && (
                            <GramSabhaView
                                user={user}
                                onBack={handleBackToDashboard}
                            />
                        )}

                        {currentView === VIEWS.SUPPORT_TICKETS && (
                            <SupportTicketsView
                                user={user}
                            />
                        )}

                        {currentView === VIEWS.PANCHAYAT_SETTINGS && (
                            <PanchayatSettingsView
                                user={user}
                                panchayatId={user?.panchayatId}
                                onBack={handleBackToDashboard}
                            />
                        )}
                    </>
                )}
            </Container>

            {/* Success and Error Messages */}
            <Snackbar
                open={!!success}
                autoHideDuration={6000}
                onClose={() => setSuccess('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setSuccess('')} severity="success" sx={{ width: '100%' }}>
                    {success}
                </Alert>
            </Snackbar>

            <Snackbar
                open={!!error}
                autoHideDuration={6000}
                onClose={() => setError('')}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setError('')} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>

            {/* Help Button */}
            <HelpButton
                user={user}
                panchayatId={user?.panchayatId}
                sourcePortal="OFFICIAL"
            />
        </Box>
    );
};

// Wrap the main component with LanguageProvider
const OfficialPortalWithLanguage = () => {
    return (
        <LanguageProvider>
            <OfficialPortal />
        </LanguageProvider>
    );
};

export default OfficialPortalWithLanguage;