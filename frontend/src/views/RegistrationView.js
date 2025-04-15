import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Grid,
  Button,
  Divider,
  Chip,
  List,
  ListItem,
  ListItemText,
  Card,
  CardContent,
  CardMedia,
  Alert,
  IconButton,
  Container,
  Skeleton,
  useMediaQuery,
  useTheme
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PendingIcon from '@mui/icons-material/Pending';
import WcIcon from '@mui/icons-material/Wc';
import PhoneIcon from '@mui/icons-material/Phone';
import HomeIcon from '@mui/icons-material/Home';
import FamilyRestroomIcon from '@mui/icons-material/FamilyRestroom';
import BadgeIcon from '@mui/icons-material/Badge';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';

import { getFaceImageUrl, getFaceImage } from '../api';

const RegistrationView = ({ user, navigateTo, children }) => {
  const [faceImageUrl, setFaceImageUrl] = useState(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [imageModal, setImageModal] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    // Try to fetch face image if user is registered
    if (user && user.isRegistered) {
      const fetchImage = async () => {
        setImageLoading(true);
        setImageError(false);
        try {
          console.log('Fetching face image for:', user.voterIdNumber);
          const imageData = await getFaceImage(user.voterIdNumber, user.panchayatId);
          console.log('Received image data:', imageData);

          if (imageData && imageData.faceImagePath) {
            // Fix for duplicate uploads path
            let imageUrl = getFaceImageUrl(imageData.faceImagePath);

            // Check and fix duplicate /uploads/ in the URL
            if (imageUrl.includes('//uploads')) {
              imageUrl = imageUrl.replace('//uploads', '/uploads');
              console.log('Fixed duplicate uploads path in URL:', imageUrl);
            }

            console.log('Final image URL:', imageUrl);
            setFaceImageUrl(imageUrl);
          } else {
            console.error('No faceImagePath in response');
            setImageError(true);
          }
        } catch (error) {
          console.error('Error fetching face image:', error);
          setImageError(true);
        } finally {
          setImageLoading(false);
        }
      };

      fetchImage();
    }
  }, [user]);

  if (!user) {
    return (
      <Alert severity="error">
        No user data available. Please search for a user first.
      </Alert>
    );
  }

  // Function to handle image load error
  const handleImageError = () => {
    console.error('Image failed to load:', faceImageUrl);
    setImageError(true);
  };

  return (
    <Box sx={{ backgroundColor: '#f8f9fa', minHeight: '100vh', pb: 4 }}>
      <Box sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        p: 2
      }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigateTo('users')}
          variant="outlined"
          size="small"
        >
          Back to Search
        </Button>
        <Chip
          icon={user.isRegistered ? <HowToRegIcon /> : <PendingIcon />}
          label={user.isRegistered ? 'Registered' : 'Pending Registration'}
          color={user.isRegistered ? 'success' : 'warning'}
        />
      </Box>

      <Container maxWidth="lg">
        {/* Centralized Image Card */}
        <Card elevation={3} sx={{ mb: 3, overflow: 'hidden' }}>
          <Grid container>
            {/* Image on the left */}
            <Grid item xs={12} md={6} sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              p: { xs: 2, md: 4 }
            }}>
              <Box sx={{
                width: '100%',
                maxWidth: '500px',
                position: 'relative'
              }}>
                {imageLoading ? (
                  <Skeleton
                    variant="rectangular"
                    width="100%"
                    height={isMobile ? 320 : 400}
                    animation="wave"
                  />
                ) : !imageError && faceImageUrl ? (
                  <Box sx={{ position: 'relative' }}>
                    <CardMedia
                      component="img"
                      image={faceImageUrl}
                      alt={user.name}
                      onError={handleImageError}
                      sx={{
                        height: isMobile ? 320 : 400,
                        objectFit: 'cover',
                        objectPosition: 'center top',
                        borderRadius: 2,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                      }}
                    />
                    <IconButton
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(255, 255, 255, 0.7)',
                        '&:hover': {
                          backgroundColor: 'rgba(255, 255, 255, 0.9)'
                        }
                      }}
                      onClick={() => setImageModal(true)}
                      size="medium"
                    >
                      <ZoomInIcon />
                    </IconButton>
                  </Box>
                ) : (
                  <Box sx={{
                    height: isMobile ? 320 : 400,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: 'grey.100',
                    borderRadius: 2
                  }}>
                    <PhotoCameraIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary">
                      {imageError ? 'Image failed to load' : 'No image available'}
                    </Typography>
                    {user.isRegistered && imageError && (
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ mt: 2 }}
                        onClick={() => {
                          setImageError(false);
                          setImageLoading(true);
                          getFaceImage(user.voterIdNumber)
                            .then(data => {
                              if (data && data.faceImagePath) {
                                const imageUrl = getFaceImageUrl(data.faceImagePath);
                                // Force browser to reload the image by adding a timestamp
                                setFaceImageUrl(`${imageUrl}?t=${new Date().getTime()}`);
                              } else {
                                setImageError(true);
                              }
                            })
                            .catch(() => setImageError(true))
                            .finally(() => setImageLoading(false));
                        }}
                      >
                        Retry Loading
                      </Button>
                    )}
                  </Box>
                )}
              </Box>
            </Grid>

            {/* Profile info on the right */}
            <Grid item xs={12} md={6}>
              <CardContent sx={{ p: { xs: 2, md: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h4" component="h2" fontWeight="medium">
                    {user.name || 'Unnamed Member'}
                  </Typography>
                  <Chip
                    icon={user.isRegistered ? <HowToRegIcon /> : <PendingIcon />}
                    label={user.isRegistered ? 'Registered' : 'Pending'}
                    color={user.isRegistered ? 'success' : 'warning'}
                    size="medium"
                  />
                </Box>

                <Chip
                  icon={<BadgeIcon />}
                  label={`Voter ID: ${user.voterIdNumber}`}
                  color="primary"
                  variant="outlined"
                  sx={{ mb: 3 }}
                />

                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Personal Information
                    </Typography>

                    <List dense>
                      {user.gender && (
                        <ListItem disableGutters>
                          <WcIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <ListItemText
                            primary="Gender"
                            secondary={user.gender}
                            primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                            secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
                          />
                        </ListItem>
                      )}

                      {user.mobileNumber && (
                        <ListItem disableGutters>
                          <PhoneIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <ListItemText
                            primary="Mobile Number"
                            secondary={user.mobileNumber}
                            primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                            secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
                          />
                        </ListItem>
                      )}

                      {user.registrationDate && (
                        <ListItem disableGutters>
                          <CalendarTodayIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <ListItemText
                            primary="Registration Date"
                            secondary={new Date(user.registrationDate).toLocaleDateString()}
                            primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                            secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                      Family Information
                    </Typography>

                    <List dense>
                      {user.fatherName && (
                        <ListItem disableGutters>
                          <FamilyRestroomIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <ListItemText
                            primary="Father's Name"
                            secondary={user.fatherName}
                            primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                            secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
                          />
                        </ListItem>
                      )}

                      {user.motherName && (
                        <ListItem disableGutters>
                          <FamilyRestroomIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <ListItemText
                            primary="Mother's Name"
                            secondary={user.motherName}
                            primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                            secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
                          />
                        </ListItem>
                      )}

                      {user.husbandName && (
                        <ListItem disableGutters>
                          <FamilyRestroomIcon fontSize="small" sx={{ mr: 1, color: 'text.secondary' }} />
                          <ListItemText
                            primary="Husband's Name"
                            secondary={user.husbandName}
                            primaryTypographyProps={{ variant: 'subtitle2', color: 'text.secondary' }}
                            secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium' }}
                          />
                        </ListItem>
                      )}
                    </List>
                  </Grid>
                </Grid>

                {user.address && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="h6" gutterBottom>
                      Address
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                      <HomeIcon fontSize="small" sx={{ mr: 1, mt: 0.5, color: 'text.secondary' }} />
                      <Typography variant="body1">{user.address}</Typography>
                    </Box>
                  </Box>
                )}
              </CardContent>
            </Grid>
          </Grid>
        </Card>

        {/* Face Registration Component */}
        <Paper elevation={3} sx={{ p: 0, overflow: 'hidden' }}>
          {/* We render the FaceRegistration component or any other children passed to this view */}
          {children}
        </Paper>
      </Container>

      {/* Image Modal */}
      {imageModal && faceImageUrl && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
          }}
          onClick={() => setImageModal(false)}
        >
          <Box sx={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <Box
              component="img"
              src={faceImageUrl}
              alt={user.name}
              sx={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                border: '2px solid white',
                borderRadius: '4px',
              }}
            />
            <IconButton
              sx={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                backgroundColor: 'rgba(255, 255, 255, 0.7)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.9)'
                }
              }}
              onClick={(e) => {
                e.stopPropagation();
                setImageModal(false);
              }}
            >
              <ZoomOutIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default RegistrationView;