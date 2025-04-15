// File: frontend/src/views/ForgotPasswordView.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Box,
    Container,
    Typography,
    Paper,
    TextField,
    Button,
    Alert,
    CircularProgress,
    Link as MuiLink
} from '@mui/material';
import LockResetIcon from '@mui/icons-material/LockReset';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { forgotPassword } from '../api/auth';

const ForgotPasswordView = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!email) {
            setError('Please enter your email address');
            return;
        }

        setLoading(true);
        setError('');

        try {
            await forgotPassword(email);
            setSuccess(true);
        } catch (err) {
            console.error('Error requesting password reset:', err);
            setError(err.message || 'Failed to process password reset request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                flexDirection: 'column',
                backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), url("/assets/background-pattern.png")',
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
                py: 4
            }}
        >
            <Container maxWidth="sm">
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <LockResetIcon color="primary" sx={{ fontSize: 60, mb: 2 }} />
                        <Typography variant="h5" component="h1" gutterBottom>
                            Reset Your Password
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Enter your email address and we'll send you instructions to reset your password.
                        </Typography>
                    </Box>

                    {error && (
                        <Alert severity="error" sx={{ mb: 3 }}>
                            {error}
                        </Alert>
                    )}

                    {success ? (
                        <Box>
                            <Alert severity="success" sx={{ mb: 3 }}>
                                If your email exists in our system, you will receive password reset instructions shortly.
                            </Alert>
                            <Button
                                fullWidth
                                variant="contained"
                                color="primary"
                                component={Link}
                                to="/admin/login"
                                startIcon={<ArrowBackIcon />}
                            >
                                Return to Login
                            </Button>
                        </Box>
                    ) : (
                        <Box component="form" onSubmit={handleSubmit}>
                            <TextField
                                fullWidth
                                label="Email Address"
                                type="email"
                                name="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                margin="normal"
                                required
                                autoFocus
                                disabled={loading}
                            />

                            <Button
                                type="submit"
                                fullWidth
                                variant="contained"
                                color="primary"
                                disabled={loading}
                                sx={{ mt: 3, mb: 2 }}
                            >
                                {loading ? <CircularProgress size={24} /> : 'Request Password Reset'}
                            </Button>

                            <Box sx={{ textAlign: 'center', mt: 2 }}>
                                <MuiLink
                                    component={Link}
                                    to="/admin/login"
                                    variant="body2"
                                    underline="hover"
                                >
                                    Back to Login
                                </MuiLink>
                            </Box>
                        </Box>
                    )}
                </Paper>
            </Container>
        </Box>
    );
};

export default ForgotPasswordView;