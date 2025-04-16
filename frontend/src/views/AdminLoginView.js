// File: frontend/src/views/AdminLoginView.js
import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Paper,
    Button,
    Grid,
    useTheme,
    useMediaQuery
} from '@mui/material';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PersonIcon from '@mui/icons-material/Person';
import LoginForm from '../components/auth/LoginForm';
import { useAuth } from '../utils/authContext';

const AdminLoginView = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    // Redirect to appropriate dashboard if already logged in
    useEffect(() => {
        if (user) {
            const from = location.state?.from?.pathname;
            if (from) {
                navigate(from, { replace: true });
            } else {
                // Redirect based on role
                if (user.role === 'ADMIN') {
                    navigate('/admin', { replace: true });
                } else {
                    navigate('/official/dashboard', { replace: true });
                }
            }
        }
    }, [user, navigate, location]);

    // Handle successful login
    const handleLoginSuccess = (userData) => {
        const from = location.state?.from?.pathname;
        if (from) {
            navigate(from, { replace: true });
        } else {
            // Redirect based on role
            if (userData.role === 'ADMIN') {
                navigate('/admin/dashboard', { replace: true });
            } else {
                navigate('/official/dashboard', { replace: true });
            }
        }
    };

    // Navigate to citizen portal
    const handleCitizenPortal = () => {
        navigate('/');
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), url("/assets/background-pattern.png")',
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed'
            }}
        >
            {/* Header */}
            <Box
                sx={{
                    bgcolor: 'primary.main',
                    color: 'white',
                    py: 1,
                    px: 3,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccountBalanceIcon sx={{ mr: 1 }} />
                    <Typography variant="h6" component="div">
                        Gram Sabha Management
                    </Typography>
                </Box>
                <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    startIcon={<PersonIcon />}
                    onClick={handleCitizenPortal}
                    sx={{
                        borderColor: 'rgba(255,255,255,0.5)',
                        '&:hover': {
                            borderColor: 'white',
                            backgroundColor: 'rgba(255,255,255,0.1)'
                        }
                    }}
                >
                    Citizen Portal
                </Button>
            </Box>

            <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', py: 4 }}>
                <Grid container spacing={4} alignItems="center" justifyContent="center">
                    {/* Left Side - Description */}
                    {!isMobile && (
                        <Grid item xs={12} md={6}>
                            <Paper
                                elevation={2}
                                sx={{
                                    p: 4,
                                    height: '100%',
                                    bgcolor: 'primary.main',
                                    color: 'white'
                                }}
                            >
                                <Typography variant="h4" component="h1" gutterBottom>
                                    Welcome to Administrator Portal
                                </Typography>
                                <Typography variant="body1" paragraph>
                                    This secure portal is designed for Gram Sabha officials and administrators to manage the entire panchayat system efficiently.
                                </Typography>
                                <Typography variant="body1" paragraph>
                                    From here, you can manage panchayats, users, official accounts, and oversee the democratic processes of rural governance.
                                </Typography>
                                <Box sx={{ mt: 4 }}>
                                    <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                                        Key Features:
                                    </Typography>
                                    <ul>
                                        <li>Manage panchayat information and structure</li>
                                        <li>Create and manage official accounts</li>
                                        <li>Track citizenship issues and complaints</li>
                                        <li>Oversee gram sabha operations</li>
                                    </ul>
                                </Box>
                            </Paper>
                        </Grid>
                    )}

                    {/* Right Side - Login Form */}
                    <Grid item xs={12} md={6}>
                        <Box sx={{ maxWidth: 500, mx: 'auto' }}>
                            <LoginForm onSuccess={handleLoginSuccess} />
                        </Box>
                    </Grid>
                </Grid>
            </Container>

            {/* Footer */}
            <Box
                component="footer"
                sx={{
                    py: 2,
                    px: 3,
                    mt: 'auto',
                    backgroundColor: 'grey.200',
                    textAlign: 'center'
                }}
            >
                <Typography variant="body2" color="text.secondary">
                    &copy; {new Date().getFullYear()} Gram Sabha Management System
                </Typography>
            </Box>
        </Box>
    );
};

export default AdminLoginView;