// File: frontend/src/components/PanchayatSelector.js (Updated to handle API response structure)
import React, { useState, useEffect } from 'react';
import {
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Button,
  Chip,
  CircularProgress
} from '@mui/material';
import { fetchPanchayats } from '../api';

const PanchayatSelector = ({
  value,
  onChange,
  label = "Panchayat",
  showAllOption = true,
  size = "medium",
  required = false,
  fullWidth = true,
  sx = {},
  disabled = false
}) => {
  const [panchayats, setPanchayats] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadPanchayats = async () => {
      setLoading(true);
      try {
        const data = await fetchPanchayats();
        setPanchayats(data);

        // Auto-select first panchayat if no value and only one panchayat exists
        if (!value && data.length === 1 && onChange && !showAllOption) {
          onChange(data[0]._id);
        }
      } catch (error) {
        setError('Failed to load panchayats');
      } finally {
        setLoading(false);
      }
    };

    loadPanchayats();
  }, []);

  // Handle the case when no panchayats are found
  if (loading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <CircularProgress size={20} />
        <Typography variant="body2">Loading panchayats...</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" variant="body2">{error}</Typography>
    );
  }

  if (!loading && panchayats.length === 0) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography color="text.secondary" variant="body2" sx={{ whiteSpace: 'nowrap' }}>
          No panchayats available
        </Typography>
        {/* <Button
          variant="contained"
          size="small"
          color="primary"
          onClick={() => {
            // Navigate to panchayats view (tab index 4)
            window.location.hash = '#/panchayats';
            // This is a workaround since we don't have a proper router
            const viewIndex = 4;
            const event = new CustomEvent('changeView', { detail: viewIndex });
            window.dispatchEvent(event);
          }}
        >
          Add Panchayat
        </Button> */}
      </Box>
    );
  }

  return (
    <FormControl
      fullWidth={fullWidth}
      size={size}
      required={required}
      sx={{
        '& .MuiOutlinedInput-root': {
          backgroundColor: 'white',
          ...(size === 'small' && { '& fieldset': { borderColor: 'rgba(255,255,255,0.5)' } })
        },
        ...sx
      }}
      disabled={disabled || loading}
    >
      {label && <InputLabel id="panchayat-select-label">{label}</InputLabel>}
      <Select
        labelId="panchayat-select-label"
        id="panchayat-select"
        value={value || ''}
        label={label || undefined}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        displayEmpty={!label}
        placeholder="Select Panchayat"
        renderValue={(selected) => {
          if (!selected && showAllOption) {
            return <em>All Panchayats</em>;
          }

          if (!selected && !showAllOption) {
            return <em>Select Panchayat</em>;
          }

          const selectedPanchayat = panchayats.find(p => p._id === selected);

          if (!selectedPanchayat) return <em>Select Panchayat</em>;

          return (
            <Typography variant="body2" noWrap sx={{ maxWidth: '100%', fontWeight: size === 'small' ? 'medium' : 'normal' }}>
              {selectedPanchayat.name}
            </Typography>
          );
        }}
      >
        {showAllOption && (
          <MenuItem value="">
            <em>All Panchayats</em>
          </MenuItem>
        )}
        {panchayats.map((panchayat) => (
          <MenuItem key={panchayat._id} value={panchayat._id}>
            {panchayat.name} ({panchayat.district}, {panchayat.state})
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default PanchayatSelector;