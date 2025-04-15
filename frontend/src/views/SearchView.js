// File: frontend/src/views/SearchView.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  InputAdornment,
  Alert,
  AlertTitle,
  Autocomplete,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import { fetchUsers } from '../api';

const SearchView = ({ searchQuery, setSearchQuery, searchUser, selectedPanchayat }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [voterIdOptions, setVoterIdOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(null);

  // Load all users data once when component mounts or panchayat changes
  useEffect(() => {
    const loadAllUsers = async () => {
      if (!selectedPanchayat) {
        setAllUsers([]);
        setDataLoaded(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const users = await fetchUsers(selectedPanchayat._id);
        setAllUsers(users);
        setDataLoaded(true);
        console.log(`Loaded ${users.length} users for panchayat: ${selectedPanchayat.name}`);
      } catch (error) {
        console.error('Error fetching users:', error);
        setError('Failed to load user data. Please try again later.');
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };

    loadAllUsers();
  }, [selectedPanchayat]);

  // Filter locally whenever input changes
  useEffect(() => {
    if (!inputValue || inputValue.length < 1) {
      setVoterIdOptions([]);
      return;
    }

    // Filter the already loaded data locally
    const filteredOptions = allUsers
      .filter(user => user.voterIdNumber.toLowerCase().includes(inputValue.toLowerCase()))
      .map(user => ({
        label: user.voterIdNumber,
        name: user.name
      }));

    setVoterIdOptions(filteredOptions);
  }, [inputValue, allUsers]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedPanchayat && searchQuery) {
      searchUser();
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Typography variant="h2" component="h1" gutterBottom>
          Member Search
        </Typography>
        <Typography variant="body1" paragraph>
          Search for a Gram Sabha member by Voter ID to view or register their face biometrics.
        </Typography>

        {!selectedPanchayat ? (
          <Alert severity="warning" sx={{ mt: 3 }}>
            <AlertTitle>No Panchayat Selected</AlertTitle>
            Please select a panchayat from the dropdown in the top menu before searching for members.
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mt: 3 }}>
            <AlertTitle>Searching in {selectedPanchayat.name}</AlertTitle>
            Enter a Voter ID to search for members in this panchayat.
            {dataLoaded && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1 }}>
                {allUsers.length} members available in this panchayat
              </Typography>
            )}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        )}
      </Paper>

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box component="form" onSubmit={handleSubmit} sx={{ width: '100%' }}>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, width: '100%', gap: 2 }}>
            <Box sx={{ flexGrow: 1, width: { xs: '100%', sm: '75%' } }}>
              <Autocomplete
                freeSolo
                options={voterIdOptions}
                value={searchQuery}
                onChange={(event, newValue) => {
                  setSearchQuery(newValue?.label || newValue || '');
                }}
                inputValue={inputValue}
                onInputChange={(event, newInputValue) => {
                  setInputValue(newInputValue);
                }}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option;
                  return option.label;
                }}
                renderOption={(props, option) => (
                  <li {...props}>
                    <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="body1">{option.label}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {option.name}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Voter ID"
                    variant="outlined"
                    placeholder="Enter Voter ID Number"
                    disabled={!selectedPanchayat || loading}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <>
                          {loading ? <CircularProgress color="inherit" size={20} /> : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    fullWidth
                  />
                )}
                loading={loading}
                loadingText="Loading voter IDs..."
                noOptionsText={dataLoaded ? "No matching voter IDs found" : "Loading data..."}
                sx={{ width: '100%' }}
                disabled={!dataLoaded && !loading && selectedPanchayat}
              />
            </Box>

            <Box sx={{ width: { xs: '100%', sm: '180px' } }}>
              <Button
                fullWidth
                type="submit"
                variant="contained"
                size="large"
                startIcon={<HowToRegIcon />}
                disabled={!searchQuery || !selectedPanchayat || loading}
                sx={{ height: '100%', minHeight: '56px' }}
              >
                Find Member
              </Button>
            </Box>
          </Box>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="body2" color="text.secondary">
            Tips for searching:
          </Typography>
          <ul>
            <li>
              <Typography variant="body2" color="text.secondary">
                Start typing to see matching voter IDs
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                The Voter ID should match exactly as it appears on the voter card
              </Typography>
            </li>
            <li>
              <Typography variant="body2" color="text.secondary">
                If you can't find a member, verify they've been imported to the system
              </Typography>
            </li>
          </ul>
        </Box>
      </Paper>
    </Box>
  );
};

export default SearchView;