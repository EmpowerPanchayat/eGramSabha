// File: frontend/src/views/GramSabhaView.js
import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Container,
    Paper,
    Card,
    CardContent,
    IconButton,
    Alert,
    CircularProgress,
    useTheme,
    useMediaQuery,
    Breadcrumbs,
    Link
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../utils/LanguageContext';
import GramSabhaManagement from '../components/GramSabha/GramSabhaManagement';
import { useAuth } from '../utils/authContext';

const GramSabhaView = ({ user, onBack }) => {
    const { strings } = useLanguage();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [panchayatId, setPanchayatId] = useState(null);

    useEffect(() => {
        // Set panchayat ID from user data
        if (user && user.panchayatId) {
            setPanchayatId(user.panchayatId);
        }
    }, [user]);

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
                    <MeetingRoomIcon sx={{ mr: 0.5, fontSize: 18 }} />
                    {strings.gramSabhaManagement || 'Gram Sabha Management'}
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
                        {strings.gramSabhaManagement || 'Gram Sabha Management'}
                    </Typography>
                    <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
                        {strings.gramSabhaDescription || 'Schedule, manage, and track Gram Sabha meetings. View upcoming meetings, past meetings, and create new meeting agendas.'}
                    </Typography>
                </Box>

                <CardContent sx={{ p: 3 }}>
                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
                            <CircularProgress size={60} />
                        </Box>
                    ) : (
                        <Box sx={{ width: '100%' }}>
                            <GramSabhaManagement
                                panchayatId={panchayatId}
                            />
                        </Box>
                    )}
                </CardContent>
            </Card>
        </Container>
    );
};

export default GramSabhaView;