import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Box,
} from '@mui/material';
import { AddCircleOutline, RemoveCircleOutline, ArrowForward, ArrowBack } from '@mui/icons-material';
import { fetchAvailableAgendaItems } from '../../api/summaries';

const AgendaSelectionModal = ({ open, onClose, currentAgenda = [], panchayatId, onFinalize }) => {
  const [meetingAgenda, setMeetingAgenda] = useState([]);
  const [availableIssues, setAvailableIssues] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const getMultilingualText = (field) => {
    if (typeof field === 'object' && field !== null) {
      return field.en || field.hi || Object.values(field)[0] || '';
    }
    return field || '';
  };

  const loadAvailableItems = useCallback(async () => {
    if (!panchayatId) return;

    setLoading(true);
    setError('');
    try {
      const items = await fetchAvailableAgendaItems(panchayatId);
      // Filter out items that are already in the current meeting's agenda
      const currentAgendaIds = new Set(currentAgenda.map(item => item._id));
      setAvailableIssues(items.filter(item => !currentAgendaIds.has(item._id)));
    } catch (err) {
      setError(err.message || 'Failed to load available agenda items.');
    } finally {
      setLoading(false);
    }
  }, [panchayatId, currentAgenda]);

  useEffect(() => {
    if (open) {
      setMeetingAgenda([...currentAgenda]);
      loadAvailableItems();
    }
  }, [open, currentAgenda, loadAvailableItems]);

  const handleAddItem = (itemToAdd) => {
    setMeetingAgenda(prev => [...prev, itemToAdd]);
    setAvailableIssues(prev => prev.filter(item => item._id !== itemToAdd._id));
  };

  const handleRemoveItem = (itemToRemove) => {
    setAvailableIssues(prev => [...prev, itemToRemove]);
    setMeetingAgenda(prev => prev.filter(item => item._id !== itemToRemove._id));
  };

  const handleFinalize = () => {
    onFinalize(meetingAgenda);
    onClose();
  };

  const renderList = (title, items, handleItemClick, icon) => (
    <Paper variant="outlined" sx={{ height: 400, overflow: 'auto' }}>
      <Typography variant="h6" sx={{ p: 2, bgcolor: 'grey.200' }}>{title}</Typography>
      <List dense>
        {items.map(item => (
          <ListItem
            key={item._id}
            secondaryAction={
              <IconButton edge="end" onClick={() => handleItemClick(item)}>
                {icon}
              </IconButton>
            }
          >
            <ListItemText
              primary={getMultilingualText(item.title)}
              secondary={getMultilingualText(item.description)}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Edit and Finalize Agenda</DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 5 }}><CircularProgress /></Box>
        ) : (
          <Grid container spacing={2} justifyContent="center" alignItems="center" sx={{ mt: 1 }}>
            <Grid item xs={5.5}>
              {renderList('Available Issues', availableIssues, handleAddItem, <AddCircleOutline color="primary" />)}
            </Grid>
            <Grid item xs={1} textAlign="center">
              <ArrowForward />
              <ArrowBack />
            </Grid>
            <Grid item xs={5.5}>
              {renderList('Agenda for this Meeting', meetingAgenda, handleRemoveItem, <RemoveCircleOutline color="error" />)}
            </Grid>
          </Grid>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleFinalize} variant="contained" color="primary">
          Save & Finalize Agenda
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AgendaSelectionModal;
