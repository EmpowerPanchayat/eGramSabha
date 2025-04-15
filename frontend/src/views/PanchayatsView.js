// File: frontend/src/views/PanchayatsView.js
import React from 'react';
import { Box, Container, Typography, Paper } from '@mui/material';
import PanchayatManagement from '../components/PanchayatManagement';

const PanchayatsView = ({ navigateTo, setSelectedPanchayat }) => {
  const handleSelectPanchayat = (panchayat) => {
    if (setSelectedPanchayat) {
      setSelectedPanchayat(panchayat);
    }
    
    // Navigate to home view or another view as needed
    if (navigateTo) {
      navigateTo('home');
    }
  };

  return (
    <Container maxWidth="lg">
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Panchayat Management
        </Typography>
        <Typography variant="body1" paragraph>
          Manage Gram Panchayats in the system. Add, edit, or delete panchayats and select one to work with.
        </Typography>
      </Paper>
      
      <PanchayatManagement onSelectPanchayat={handleSelectPanchayat} />
    </Container>
  );
};

export default PanchayatsView;