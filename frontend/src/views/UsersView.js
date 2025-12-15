// File: frontend/src/views/UsersView.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  TextField,
  InputAdornment,
  Alert,
  AlertTitle,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  IconButton,
  Menu,
  Divider
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PendingIcon from '@mui/icons-material/Pending';
import FilterListIcon from '@mui/icons-material/FilterList';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ClearIcon from '@mui/icons-material/Clear';
import PeopleIcon from '@mui/icons-material/People';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useLanguage } from '../utils/LanguageContext';

const UsersView = ({ users, loggedInUser = {}, setSelectedUser, selectedPanchayat, setShowAllCitizen }) => {
  const { strings } = useLanguage();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');

  // Filtering state
  const [filters, setFilters] = useState({
    status: 'all', // 'all', 'registered', 'pending'
    gender: 'all'  // 'all', 'Male', 'Female', 'Other'
  });

  // Filter menu state
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const handleFilterMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterMenuClose = () => {
    setAnchorEl(null);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(0);
  };

  const clearSearch = () => {
    setSearchTerm('');
  };

  const handleFilterChange = (event) => {
    setFilters({
      ...filters,
      [event.target.name]: event.target.value
    });
    setPage(0);
  };

  const resetFilters = () => {
    setFilters({
      status: 'all',
      gender: 'all'
    });
  };

  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle direction if clicking on the same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Set new field and default to ascending
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const renderSortIcon = (field) => {
    if (sortField !== field) return null;

    return sortDirection === 'asc'
      ? <ArrowUpwardIcon fontSize="small" />
      : <ArrowDownwardIcon fontSize="small" />;
  };

  // Apply filters to users
  const filteredUsers = users.filter(user => {
    // Search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      user.name?.toLowerCase().includes(searchLower) ||
      user.voterIdNumber?.toLowerCase().includes(searchLower) ||
      user.address?.toLowerCase().includes(searchLower) ||
      user.mobileNumber?.includes(searchTerm);

    // Status filter
    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'registered' && user.isRegistered) ||
      (filters.status === 'pending' && !user.isRegistered);

    // Gender filter
    const matchesGender =
      filters.gender === 'all' ||
      (user.gender === filters.gender);

    return matchesSearch && matchesStatus && matchesGender;
  });

  // Sort filtered users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    let valueA = a[sortField] || '';
    let valueB = b[sortField] || '';

    // Handle special case for sorting by status
    if (sortField === 'status') {
      valueA = a.isRegistered ? 1 : 0;
      valueB = b.isRegistered ? 1 : 0;
    }

    // Compare the values
    if (valueA < valueB) {
      return sortDirection === 'asc' ? -1 : 1;
    }
    if (valueA > valueB) {
      return sortDirection === 'asc' ? 1 : -1;
    }
    return 0;
  });

  // Slice for pagination
  const paginatedUsers = sortedUsers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  // Reset pagination when users or filters change
  useEffect(() => {
    setPage(0);
  }, [users, filters.status, filters.gender]);

  if (!selectedPanchayat) {
    return (
      <Box>
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Members
          </Typography>
          <Alert severity="warning">
            <AlertTitle>No Panchayat Selected</AlertTitle>
            Please select a panchayat from the dropdown in the top menu to view its members.
          </Alert>
        </Paper>
      </Box>
    );
  }

  const activeFiltersCount = Object.values(filters).filter(value => value !== 'all').length;

  return (
    <Box>
      {loggedInUser?.userType === 'ADMIN' && (
        <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Members
          </Typography>
          <Typography variant="body1" paragraph>
            Manage registered Gram Sabha members for {selectedPanchayat.name}.
          </Typography>
        </Paper>
      )}
      {loggedInUser?.userType === 'OFFICIAL' && (
        <Box
          sx={{
              p: 3,
              backgroundColor: 'primary.main',
              color: 'white',
              borderTopLeftRadius: 8,
              borderTopRightRadius: 8,
              position: 'relative',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
                onClick={() => { setShowAllCitizen(false); setSelectedUser(null); }}
                sx={{ mr: 1, color: 'white' }}
                size="small"
            >
              <ArrowBackIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <PeopleIcon sx={{ mr: 1 }} />
              <Typography variant="h5" component="h1">
                  {strings.members}
              </Typography>
            </Box>
          </Box>
      </Box>
      )}

      <Paper elevation={2} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h6">
            Member List
          </Typography>

          <Stack direction="row" spacing={2} alignItems="center">
            <TextField
              placeholder="Search members..."
              variant="outlined"
              size="small"
              value={searchTerm}
              onChange={handleSearchChange}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton
                      size="small"
                      onClick={clearSearch}
                      aria-label="clear search"
                    >
                      <ClearIcon fontSize="small" />
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Button
              startIcon={<FilterListIcon />}
              endIcon={activeFiltersCount > 0 ? <Chip size="small" label={activeFiltersCount} /> : null}
              variant={activeFiltersCount > 0 ? "contained" : "outlined"}
              color={activeFiltersCount > 0 ? "primary" : "inherit"}
              onClick={handleFilterMenuOpen}
            >
              Filter
            </Button>

            <Menu
              anchorEl={anchorEl}
              open={open}
              onClose={handleFilterMenuClose}
              PaperProps={{
                sx: { width: 250, padding: 2 }
              }}
            >
              <Typography variant="subtitle2" sx={{ px: 2, pb: 1 }}>
                Filter Members
              </Typography>
              <Divider sx={{ mb: 2 }} />

              <Box sx={{ px: 2, mb: 2 }}>
                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel id="status-filter-label">Status</InputLabel>
                  <Select
                    labelId="status-filter-label"
                    name="status"
                    value={filters.status}
                    label="Status"
                    onChange={handleFilterChange}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="registered">Registered</MenuItem>
                    <MenuItem value="pending">Pending</MenuItem>
                  </Select>
                </FormControl>

                <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                  <InputLabel id="gender-filter-label">Gender</InputLabel>
                  <Select
                    labelId="gender-filter-label"
                    name="gender"
                    value={filters.gender}
                    label="Gender"
                    onChange={handleFilterChange}
                  >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="Male">Male</MenuItem>
                    <MenuItem value="Female">Female</MenuItem>
                    <MenuItem value="Other">Other</MenuItem>
                  </Select>
                </FormControl>

                <Button
                  variant="text"
                  size="small"
                  onClick={resetFilters}
                  disabled={filters.status === 'all' && filters.gender === 'all'}
                  sx={{ mt: 1 }}
                >
                  Reset Filters
                </Button>
              </Box>
            </Menu>
          </Stack>
        </Box>

        {users.length === 0 ? (
          <Alert severity="info">
            No members found for this panchayat. Import members or add them manually.
          </Alert>
        ) : filteredUsers.length === 0 ? (
          <Alert severity="info">
            No members match your search criteria.
          </Alert>
        ) : (
          <>
            <TableContainer component={Paper} variant="outlined">
              <Table sx={{ minWidth: 650 }} aria-label="members table">
                <TableHead>
                  <TableRow>
                    <TableCell
                      sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => handleSort('name')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Name {renderSortIcon('name')}
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => handleSort('voterIdNumber')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Voter ID {renderSortIcon('voterIdNumber')}
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => handleSort('gender')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Gender {renderSortIcon('gender')}
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => handleSort('mobileNumber')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Phone {renderSortIcon('mobileNumber')}
                      </Box>
                    </TableCell>
                    <TableCell
                      sx={{ fontWeight: 'bold', cursor: 'pointer' }}
                      onClick={() => handleSort('status')}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        Status {renderSortIcon('status')}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ fontWeight: 'bold' }} alignItems="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedUsers.map((user) => (
                    <TableRow key={user._id} hover>
                      <TableCell component="th" scope="row">
                        {user.name || 'N/A'}
                      </TableCell>
                      <TableCell>{user.voterIdNumber}</TableCell>
                      <TableCell>{user.gender || 'N/A'}</TableCell>
                      <TableCell>{user.mobileNumber || 'N/A'}</TableCell>
                      <TableCell>
                        {user.isRegistered ? (
                          <Chip
                            icon={<HowToRegIcon />}
                            label="Registered"
                            color="success"
                            size="small"
                            variant="outlined"
                          />
                        ) : (
                          <Chip
                            icon={<PendingIcon />}
                            label="Pending"
                            color="warning"
                            size="small"
                            variant="outlined"
                          />
                        )}
                      </TableCell>
                      <TableCell alignItems="center">
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => setSelectedUser(user)}
                          sx={{ width: 70 }}
                        >
                          {user.isRegistered ? 'View' : 'Register'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2 }}>
              <Typography variant="body2" color="text.secondary">
                Showing {Math.min(filteredUsers.length, 1 + page * rowsPerPage)}-
                {Math.min(filteredUsers.length, (page + 1) * rowsPerPage)} of {filteredUsers.length} members
                {activeFiltersCount > 0 && ' (filtered)'}
              </Typography>

              <TablePagination
                rowsPerPageOptions={[10, 50, 100, { value: -1, label: 'All' }]}
                component="div"
                count={filteredUsers.length}
                rowsPerPage={rowsPerPage}
                page={page}
                onPageChange={handleChangePage}
                onRowsPerPageChange={handleChangeRowsPerPage}
                labelRowsPerPage="Rows per page:"
                SelectProps={{
                  inputProps: { 'aria-label': 'rows per page' },
                  native: true,
                }}
              />
            </Box>
          </>
        )}
      </Paper>
    </Box>
  );
};

export default UsersView;