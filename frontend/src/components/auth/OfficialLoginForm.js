// frontend/src/components/auth/OfficialLoginForm.js
import React, { useState } from 'react';
import {
    TextField,
    Button,
    Box,
    Typography,
    Paper,
    Alert,
    CircularProgress,
    Link
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../../utils/authContext';
import api from '../../api';

const OfficialLoginForm = () => {
    const { login } = useAuth();

    const [formData, setFormData] = useState({
        username: '',
        password: ''
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Handle input change
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validate form
        if (!formData.username || !formData.password) {
            setError('Please enter both username and password');
            return;
        }

        try {
            setLoading(true);
            setError('');

            // Call the official login API
            const response = await api.post('/auth/official/login', formData);

            if (response.data.success) {
                // Store token in auth context
                login(
                    response.data.data.token,
                    response.data.data.refreshToken,
                    response.data.data.user
                );
            }
        } catch (error) {
            console.error('Official login error:', error);
            setError(
                error.response?.data?.message ||
                'Login failed. Please check your credentials and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2 }}>
            <Box
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center'
                }}
            >
                <Box
                    sx={{
                        bgcolor: 'primary.main',
                        color: 'white',
                        borderRadius: '50%',
                        p: 1,
                        display: 'flex',
                        mb: 2
                    }}
                >
                    <LockOutlinedIcon />
                </Box>

                <Typography component="h1" variant="h5" gutterBottom>
                    Official Login
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, width: '100%' }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 1, width: '100%' }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="username"
                        label="Username"
                        name="username"
                        autoComplete="username"
                        autoFocus
                        value={formData.username}
                        onChange={handleChange}
                        disabled={loading}
                    />

                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={formData.password}
                        onChange={handleChange}
                        disabled={loading}
                    />

                    <Button
                        type="submit"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2, py: 1.2 }}
                        disabled={loading}
                        endIcon={loading ? <CircularProgress size={20} color="inherit" /> : null}
                    >
                        {loading ? 'Signing in...' : 'Sign In'}
                    </Button>

                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Link href="#" variant="body2">
                            Forgot password?
                        </Link>
                    </Box>
                </Box>
            </Box>
        </Paper>
    );
};

export default OfficialLoginForm;