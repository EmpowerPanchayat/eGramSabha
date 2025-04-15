import React, { useEffect, useState } from 'react';
import {
    Card,
    CardContent,
    CardActions,
    Typography,
    Button,
    Chip,
    Box,
    IconButton,
    Divider,
    Tooltip,
    Avatar,
    CircularProgress
} from '@mui/material';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PublicIcon from '@mui/icons-material/Public';
import GroupsIcon from '@mui/icons-material/Groups';
import LanguageIcon from '@mui/icons-material/Language';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import { fetchWards } from '../api';

const PanchayatCard = ({
    panchayat,
    onSelect,
    onEdit,
    onDelete,
    isSelected,
    loading
}) => {
    // Add state for ward count
    const [wardCount, setWardCount] = useState(0);
    const [wardsLoading, setWardsLoading] = useState(false);

    // When the card loads or panchayat changes, fetch the ward count
    useEffect(() => {
        if (panchayat && panchayat._id) {
            fetchWardCount(panchayat._id);
        }
    }, [panchayat]);

    // Function to fetch ward count
    const fetchWardCount = async (panchayatId) => {
        setWardsLoading(true);
        try {
            const wards = await fetchWards(panchayatId);
            setWardCount(wards ? wards.length : 0);
        } catch (error) {
            console.error('Error fetching wards:', error);
            setWardCount(0);
        } finally {
            setWardsLoading(false);
        }
    };

    // Destructure panchayat data with defaults to prevent errors
    const {
        _id,
        name = 'Unnamed Panchayat',
        state = '',
        district = '',
        block = '',
        population = 0,
        language = '',
        officialWhatsappNumber = '',
        villages = ''
    } = panchayat || {};

    // Format population with commas
    const formattedPopulation = population ? population.toLocaleString() : 'Not specified';

    // Get first letter of name for avatar
    const firstLetter = name.charAt(0).toUpperCase();

    // Determine if this panchayat has villages
    const hasVillages = villages && villages.trim().length > 0;

    // Get first two villages if any
    const villagesList = hasVillages
        ? villages.split(',').map(v => v.trim()).filter(v => v)
        : [];

    const showingVillages = villagesList.slice(0, 2);
    const extraVillages = villagesList.length > 2 ? villagesList.length - 2 : 0;

    const handleSelect = () => {
        if (!loading && !isSelected) {
            onSelect(panchayat);
        }
    };

    return (
        <Card
            elevation={3}
            sx={{
                height: '100%',
                minWidth: '320px',
                maxWidth: '480px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.2s ease-in-out',
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: (theme) => theme.shadows[8]
                },
                border: isSelected ? '2px solid' : '1px solid',
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor: isSelected ? 'primary.50' : 'background.paper',
                opacity: loading ? 0.7 : 1,
            }}
        >
            {isSelected && (
                <Chip
                    icon={<CheckCircleIcon />}
                    label="Selected"
                    color="primary"
                    size="small"
                    sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        zIndex: 1,
                        fontWeight: 'medium',
                        '& .MuiChip-icon': {
                            color: 'inherit'
                        }
                    }}
                />
            )}

            <Box
                sx={{
                    bgcolor: isSelected ? 'primary.main' : 'primary.light',
                    p: 2,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    transition: 'background-color 0.2s'
                }}
            >
                <Avatar
                    sx={{
                        bgcolor: isSelected ? 'primary.dark' : 'primary.main',
                        color: 'white',
                        mr: 2,
                        width: 48,
                        height: 48,
                        fontWeight: 'bold',
                        fontSize: '1.5rem',
                        boxShadow: 2
                    }}
                >
                    {firstLetter}
                </Avatar>
                <Typography
                    variant="h6"
                    component="h3"
                    sx={{
                        fontWeight: 600,
                        textOverflow: 'ellipsis',
                        overflow: 'hidden',
                        whiteSpace: 'nowrap'
                    }}
                >
                    {name}
                </Typography>
            </Box>

            <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <LocationOnIcon sx={{ 
                            mr: 1, 
                            color: 'primary.main', 
                            mt: 0.3,
                            fontSize: '1.25rem' 
                        }} />
                        <Box>
                            <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ mb: 0.3, fontWeight: 500 }}
                            >
                                Location
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {district ? `${district}, ` : ''}{state || 'Not specified'}
                            </Typography>
                        </Box>
                    </Box>

                    {block && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <PublicIcon sx={{ mr: 1, color: 'primary.main', mt: 0.3 }} />
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Block
                                </Typography>
                                <Typography variant="body1">
                                    {block}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <GroupsIcon sx={{ mr: 1, color: 'primary.main', mt: 0.3 }} />
                        <Box>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                Population
                            </Typography>
                            <Typography variant="body1">
                                {formattedPopulation}
                            </Typography>
                        </Box>
                    </Box>

                    {language && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <LanguageIcon sx={{ mr: 1, color: 'primary.main', mt: 0.3 }} />
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Language
                                </Typography>
                                <Typography variant="body1">
                                    {language}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {officialWhatsappNumber && (
                        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                            <WhatsAppIcon sx={{ mr: 1, color: 'primary.main', mt: 0.3 }} />
                            <Box>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    WhatsApp
                                </Typography>
                                <Typography variant="body1">
                                    {officialWhatsappNumber}
                                </Typography>
                            </Box>
                        </Box>
                    )}

                    {hasVillages && (
                        <Box sx={{ mt: 1.5 }}>
                            <Typography 
                                variant="body2" 
                                color="text.secondary" 
                                sx={{ mb: 0.75, fontWeight: 500 }}
                            >
                                Villages
                            </Typography>
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                                {showingVillages.map((village, index) => (
                                    <Chip
                                        key={index}
                                        label={village}
                                        size="small"
                                        sx={{ 
                                            fontWeight: 'medium',
                                            bgcolor: 'primary.50',
                                            color: 'primary.main'
                                        }}
                                    />
                                ))}
                                {extraVillages > 0 && (
                                    <Chip
                                        label={`+${extraVillages} more`}
                                        size="small"
                                        variant="outlined"
                                        color="primary"
                                        sx={{ fontWeight: 'medium' }}
                                    />
                                )}
                            </Box>
                        </Box>
                    )}

                    {/* Add ward count section */}
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                        <AccountBalanceIcon sx={{
                            mr: 1,
                            color: 'primary.main',
                            mt: 0.3,
                            fontSize: '1.25rem'
                        }} />
                        <Box>
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mb: 0.3, fontWeight: 500 }}
                            >
                                Wards
                            </Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'medium' }}>
                                {wardsLoading ? (
                                    <CircularProgress size={16} sx={{ mr: 1 }} />
                                ) : (
                                    wardCount
                                )}
                            </Typography>
                        </Box>
                    </Box>
                </Box>
            </CardContent>

            <Divider />

            <CardActions sx={{ p: 2, justifyContent: 'space-between' }}>
                <Button
                    variant={isSelected ? "contained" : "outlined"}
                    color={isSelected ? "success" : "primary"}
                    onClick={handleSelect}
                    disabled={loading || isSelected}
                    sx={{ 
                        fontWeight: 'medium',
                        px: 2.5,
                        py: 0.75,
                        minWidth: 100,
                        position: 'relative'
                    }}
                >
                    {loading ? (
                        <CircularProgress size={20} color="inherit" />
                    ) : isSelected ? (
                        <>
                            <CheckCircleIcon sx={{ mr: 1 }} />
                            Selected
                        </>
                    ) : (
                        'Select'
                    )}
                </Button>

                <Box sx={{ display: 'flex', gap: 0.75 }}>
                    <Tooltip title="Edit">
                        <IconButton
                            color="primary"
                            onClick={() => onEdit(panchayat)}
                            size="medium"
                            sx={{ 
                                '&:hover': {
                                    bgcolor: 'primary.50'
                                }
                            }}
                        >
                            <EditIcon />
                        </IconButton>
                    </Tooltip>

                    <Tooltip title="Delete">
                        <IconButton
                            color="error"
                            onClick={() => onDelete(panchayat)}
                            size="medium"
                            sx={{ 
                                '&:hover': {
                                    bgcolor: 'error.50'
                                }
                            }}
                        >
                            <DeleteIcon />
                        </IconButton>
                    </Tooltip>
                </Box>
            </CardActions>
        </Card>
    );
};

export default PanchayatCard;