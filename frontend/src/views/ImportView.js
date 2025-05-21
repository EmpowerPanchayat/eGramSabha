// File: frontend/src/views/ImportView.js
import React from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Alert,
  AlertTitle,
  Grid,
  Chip,
  Divider,
  useTheme,
  useMediaQuery
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';
import WarningIcon from '@mui/icons-material/Warning';

const FieldItem = ({ required, icon, title, description }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        p: 1.5,
        borderRadius: 1,
        bgcolor: required ? 'success.lighter' : 'grey.50',
        borderLeft: 3,
        borderColor: required ? 'success.main' : 'info.main'
      }}
    >
      {icon}
      <Box sx={{ ml: 1.5 }}>
        <Typography variant="subtitle2">{title}</Typography>
        <Typography variant="caption" color="text.secondary">
          {description}
        </Typography>
      </Box>
    </Box>
  );
};

const ImportView = ({ fileInputRef, handleFileUpload, selectedPanchayat }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  const handleBrowseClick = () => {
    if (!selectedPanchayat) return;
    fileInputRef.current.click();
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="h5" gutterBottom>Import Members</Typography>
          <Typography variant="body2" color="text.secondary">
            Import members from a CSV file. The file should contain member details including name, Voter ID, and contact information.
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          {!selectedPanchayat ? (
            <Alert severity="warning">
              <AlertTitle>No Panchayat Selected</AlertTitle>
              Please select a panchayat before importing members.
            </Alert>
          ) : (
            <Alert severity="info">
              <AlertTitle>Ready to Import</AlertTitle>
              Importing to: <strong>{selectedPanchayat.name}</strong>
            </Alert>
          )}

          <Box 
            sx={{ 
              display: 'flex',
              flexDirection: isMobile ? 'column' : 'row',
              alignItems: 'center',
              gap: 2,
              mt: 3,
              p: 2,
              border: '1px dashed',
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'grey.50'
            }}
          >
            <UploadFileIcon sx={{ fontSize: 40, color: 'primary.main' }} />
            <Box sx={{ flex: 1, textAlign: isMobile ? 'center' : 'left' }}>
              <Typography variant="subtitle1">Select a CSV file to import members</Typography>
              <Typography variant="caption" color="text.secondary">
                File should follow the requirements specified below
              </Typography>
            </Box>
            <Button
              variant="contained"
              startIcon={<UploadFileIcon />}
              onClick={handleBrowseClick}
              disabled={!selectedPanchayat}
            >
              Browse Files
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                hidden
                onChange={handleFileUpload}
                disabled={!selectedPanchayat}
              />
            </Button>
          </Box>
        </Box>
      </Paper>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>CSV File Requirements</Typography>
        
        <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Required Fields:</Typography>
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {['Name', 'Voter id number', 'Gender'].map((field) => (
            <Grid item xs={12} sm={6} md={4} key={field}>
              <FieldItem
                required
                icon={<CheckCircleIcon color="success" />}
                title={field}
                description={`${field} of the member`}
              />
            </Grid>
          ))}
        </Grid>

        <Typography variant="subtitle2" sx={{ mt: 3, mb: 2 }}>Optional Fields:</Typography>
        <Grid container spacing={2}>
          {[
            'Father Name',
            'Husband Name',
            'Mother Name',
            'Address',
            'Mobile number',
            'Caste',
            'Caste Category'
          ].map((field) => (
            <Grid item xs={12} sm={6} md={4} key={field}>
              <FieldItem
                icon={<InfoIcon color="info" />}
                title={field}
                description={`${field} of the member`}
              />
            </Grid>
          ))}
        </Grid>

        <Alert 
          severity="warning" 
          sx={{ mt: 4 }}
          icon={<WarningIcon />}
        >
          <AlertTitle>Important Notes</AlertTitle>
          <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
            <li>Importing a new CSV will replace all existing members for the selected panchayat.</li>
            <li>Ensure that all Voter IDs are unique to avoid registration issues.</li>
            <li>Face registration data will be preserved for previously registered users with matching Voter IDs.</li>
          </ul>
        </Alert>
      </Paper>
    </Box>
  );
};

export default ImportView;