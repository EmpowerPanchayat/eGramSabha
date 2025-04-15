// File: frontend/src/components/LoadingOverlay.js
import React from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';

const LoadingOverlay = ({ message = "Loading..." }) => {
  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <CircularProgress 
        size={60} 
        thickness={4} 
        sx={{ color: 'white' }} 
      />
      <Typography 
        variant="h6" 
        sx={{ 
          color: 'white', 
          mt: 2,
          fontWeight: 'medium'
        }}
      >
        {message}
      </Typography>
    </Box>
  );
};

export default LoadingOverlay;