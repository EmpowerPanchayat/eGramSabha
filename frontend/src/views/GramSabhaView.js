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
    useMediaQuery
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
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
                            <MeetingRoomIcon sx={{ mr: 1 }} />
                            <Typography variant="h5" component="h1">
                                {strings.gramSabhaManagement}
                            </Typography>
                        </Box>
                    </Box>
                    <LanguageSwitcher />
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