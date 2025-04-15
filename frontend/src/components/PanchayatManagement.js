import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Grid,
  Alert,
  AlertTitle,
  Snackbar,
  CircularProgress,
  Paper,
  InputAdornment,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Pagination,
  useTheme,
  useMediaQuery,
  Fade,
  Skeleton
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import {
  fetchPanchayats,
  createPanchayat,
  updatePanchayat,
  deletePanchayat,
  fetchPanchayat,
  fetchWards
} from '../api';

// Import our improved components
import PanchayatCard from './PanchayatCard';
import PanchayatForm from './PanchayatForm';

const PanchayatManagement = ({ onSelectPanchayat }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isTablet = useMediaQuery(theme.breakpoints.down('md'));

  // States
  const [panchayats, setPanchayats] = useState([]);
  const [filteredPanchayats, setFilteredPanchayats] = useState([]);
  const [selectedPanchayat, setSelectedPanchayat] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPanchayat, setCurrentPanchayat] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  // Pagination
  const [page, setPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(6); // 6 cards per page
  const [totalPages, setTotalPages] = useState(1);

  // First load
  const [initialLoad, setInitialLoad] = useState(true);

  // Load panchayats when component mounts
  useEffect(() => {
    loadPanchayats();
  }, []);

  // Filter panchayats when search term changes
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredPanchayats(panchayats);
    } else {
      const lowercaseSearchTerm = searchTerm.toLowerCase();
      const filtered = panchayats.filter(
        panchayat =>
          panchayat.name?.toLowerCase().includes(lowercaseSearchTerm) ||
          panchayat.district?.toLowerCase().includes(lowercaseSearchTerm) ||
          panchayat.state?.toLowerCase().includes(lowercaseSearchTerm) ||
          panchayat.block?.toLowerCase().includes(lowercaseSearchTerm)
      );
      setFilteredPanchayats(filtered);
    }

    // Reset to first page when search changes
    setPage(1);
  }, [searchTerm, panchayats]);

  // Update total pages when filtered panchayats change
  useEffect(() => {
    setTotalPages(Math.ceil(filteredPanchayats.length / itemsPerPage));
  }, [filteredPanchayats, itemsPerPage]);

  // Items to display on current page
  const paginatedPanchayats = filteredPanchayats.slice(
    (page - 1) * itemsPerPage,
    page * itemsPerPage
  );

  // Load panchayats from the API
  const loadPanchayats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPanchayats();
      setPanchayats(data);
      setFilteredPanchayats(data);
      setInitialLoad(false);
    } catch (error) {
      console.error('Error loading panchayats:', error);
      setSnackbar({
        open: true,
        message: `Error loading panchayats: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Form dialog handlers
  const handleOpenFormDialog = (panchayat = null) => {
    setCurrentPanchayat(panchayat);
    setFormDialogOpen(true);
  };

  const handleCloseFormDialog = () => {
    setFormDialogOpen(false);
    setCurrentPanchayat(null);
  };

  // Delete dialog handlers
  const handleOpenDeleteDialog = (panchayat) => {
    setCurrentPanchayat(panchayat);
    setDeleteDialogOpen(true);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteDialogOpen(false);
    setCurrentPanchayat(null);
  };

  // Submit form handler
  const handleSubmitForm = async (formData) => {
    setLoading(true);
    try {
      let result;

      if (formData._id) {
        // Update existing panchayat
        result = await updatePanchayat(formData._id, formData);
        setSnackbar({
          open: true,
          message: 'Panchayat updated successfully',
          severity: 'success'
        });
      } else {
        // Create new panchayat
        result = await createPanchayat(formData);
        setSnackbar({
          open: true,
          message: 'Panchayat created successfully',
          severity: 'success'
        });
      }

      // Refresh panchayat list
      await loadPanchayats();
      return result;
    } catch (error) {
      console.error('Error saving panchayat:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Delete panchayat handler
  const handleDelete = async () => {
    if (!currentPanchayat) return;

    setLoading(true);
    try {
      const result = await deletePanchayat(currentPanchayat._id);

      if (result.success) {
        // If deleted panchayat was selected, deselect it
        if (selectedPanchayat && selectedPanchayat._id === currentPanchayat._id) {
          setSelectedPanchayat(null);
        }

        setSnackbar({
          open: true,
          message: 'Panchayat deleted successfully',
          severity: 'success'
        });

        // Refresh panchayat list
        await loadPanchayats();
        handleCloseDeleteDialog();
      } else {
        throw new Error(result.message || 'Error deleting panchayat');
      }
    } catch (error) {
      console.error('Error deleting panchayat:', error);
      setSnackbar({
        open: true,
        message: `Error: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // In the handleSelectPanchayat function, we'll fetch the wards and include them when passing the panchayat

  const handleSelectPanchayat = async (panchayat) => {
    try {
      setLoading(true);

      // Fetch wards for this panchayat
      let wardData = [];
      try {
        wardData = await fetchWards(panchayat._id);
      } catch (error) {
        console.error('Error fetching wards for panchayat:', error);
        // Continue even if ward fetch fails
      }

      // Create an enhanced panchayat object with wards
      const enhancedPanchayat = {
        ...panchayat,
        wards: wardData || []
      };

      setSelectedPanchayat(enhancedPanchayat);

      if (onSelectPanchayat) {
        onSelectPanchayat(enhancedPanchayat);
      }

      setSnackbar({
        open: true,
        message: `Selected ${panchayat.name} panchayat successfully`,
        severity: 'success'
      });
    } catch (error) {
      console.error('Error selecting panchayat:', error);
      setSnackbar({
        open: true,
        message: `Error selecting panchayat: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Snackbar close handler
  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle search
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  // Render loading skeletons during initial load
  const renderSkeletons = () => {
    return Array.from(new Array(itemsPerPage)).map((_, index) => (
      <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
        <Skeleton
          variant="rounded"
          height={300}
          animation="wave"
          sx={{ borderRadius: 2 }}
        />
      </Grid>
    ));
  };

  return (
    <Box>
      {/* Header Section */}
      <Paper
        elevation={1}
        sx={{
          p: 3,
          mb: 4,
          borderRadius: 2,
          background: 'linear-gradient(to right, #f5f7fa, #e4e8ef)'
        }}
      >
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'medium' }}>
          Panchayat Management
        </Typography>
        <Typography variant="body1" paragraph>
          Manage Gram Panchayats in the system. Add, edit, or delete panchayats and select one to work with.
        </Typography>
      </Paper>

      {/* Action Bar Section */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexDirection: { xs: 'column', sm: 'row' },
          mb: 4,
          gap: 2
        }}
      >
        <Typography variant="h5" component="h2">
          Panchayat List
        </Typography>

        <Box
          sx={{
            display: 'flex',
            gap: 2,
            width: { xs: '100%', sm: 'auto' },
            flexDirection: { xs: 'column', sm: 'row' }
          }}
        >
          <TextField
            placeholder="Search panchayats..."
            variant="outlined"
            size="small"
            value={searchTerm}
            onChange={handleSearchChange}
            sx={{ width: { xs: '100%', sm: 260 } }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />

          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenFormDialog()}
            size={isMobile ? "medium" : "large"}
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add Panchayat
          </Button>
        </Box>
      </Box>

      {/* Empty State */}
      {!initialLoad && panchayats.length === 0 ? (
        <Alert severity="info" sx={{ mt: 2, mb: 4 }}>
          <AlertTitle>No panchayats found</AlertTitle>
          <Typography paragraph>
            Your system needs at least one panchayat to function properly.
            Click the "Add Panchayat" button above to create your first panchayat.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => handleOpenFormDialog()}
            sx={{ mt: 1 }}
          >
            Add Your First Panchayat
          </Button>
        </Alert>
      ) : null}

      {/* No Results State */}
      {!initialLoad && panchayats.length > 0 && filteredPanchayats.length === 0 && (
        <Alert severity="info" sx={{ mt: 2, mb: 4 }}>
          <AlertTitle>No matching panchayats</AlertTitle>
          <Typography>
            No panchayats match your search criteria. Try a different search term or clear the search.
          </Typography>
        </Alert>
      )}

      {/* Panchayat Cards */}
      <Grid container spacing={3}>
        {initialLoad ? (
          renderSkeletons()
        ) : (
          paginatedPanchayats.map((panchayat) => (
            <Grid item xs={12} sm={6} md={4} key={panchayat._id}>
              <Fade in={true} timeout={300}>
                <Box>
                  <PanchayatCard
                    panchayat={panchayat}
                    onSelect={handleSelectPanchayat}
                    onEdit={handleOpenFormDialog}
                    onDelete={handleOpenDeleteDialog}
                    isSelected={selectedPanchayat && selectedPanchayat._id === panchayat._id}
                    loading={loading}
                  />
                </Box>
              </Fade>
            </Grid>
          ))
        )}
      </Grid>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
            size={isMobile ? "small" : "medium"}
            showFirstButton
            showLastButton
          />
        </Box>
      )}

      {/* Panchayat Form Dialog */}
      <PanchayatForm
        open={formDialogOpen}
        onClose={handleCloseFormDialog}
        onSubmit={handleSubmitForm}
        panchayat={currentPanchayat}
        loading={loading}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={handleCloseDeleteDialog}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle sx={{ bgcolor: 'error.main', color: 'white' }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          <DialogContentText>
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>This action cannot be undone</AlertTitle>
            </Alert>
            <Typography>
              Are you sure you want to delete the panchayat <strong>{currentPanchayat?.name}</strong>?
            </Typography>
            <Typography sx={{ mt: 2 }}>
              This will also permanently remove all associated voter data and other related information.
            </Typography>
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button
            onClick={handleCloseDeleteDialog}
            color="inherit"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} color="inherit" /> : null}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default PanchayatManagement;