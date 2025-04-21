import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Menu,
  MenuItem,
  Grid,
  Tooltip
} from '@mui/material';
import {
  Download as DownloadIcon,
  Add as AddIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Help as HelpIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import {
  fetchGramSabhaMeeting,
  addAttachment,
  submitRSVP,
  getRSVPStatus,
  getRSVPStats
} from '../../api/gram-sabha';
import { useLanguage } from '../../utils/LanguageContext';

const GramSabhaDetails = ({ meetingId, user }) => {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [rsvpStatus, setRsvpStatus] = useState(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [rsvpStats, setRsvpStats] = useState(null);
  const { strings } = useLanguage();
  const dataFetched = useRef(false);

  const isPresident = user?.role === 'PRESIDENT' || user?.role === 'PRESIDENT_PANCHAYAT';
  const canRSVP = !isPresident && meeting && new Date(meeting.dateTime) > new Date();

  // Consolidated data fetching in a single useEffect
  useEffect(() => {
    const fetchData = async () => {
      if (!meetingId || dataFetched.current) return;

      setLoading(true);
      setError('');

      try {
        // Fetch meeting details
        const meetingData = await fetchGramSabhaMeeting(meetingId);
        setMeeting(meetingData);

        // Fetch RSVP status if user is logged in
        if (user?._id) {
          const rsvpResponse = await getRSVPStatus(meetingId, user._id);
          setRsvpStatus(rsvpResponse.data?.status || null);
        }

        // Fetch RSVP stats if user is president
        if (isPresident) {
          const statsResponse = await getRSVPStats(meetingId);
          setRsvpStats(statsResponse.data);
        }

        dataFetched.current = true;
      } catch (err) {
        setError(err.message || 'Failed to load meeting data');
        console.error('Error loading meeting data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [meetingId, user?._id, isPresident]);

  const handleRSVP = async (status) => {
    if (!user?._id) {
      setError('Please login to RSVP');
      return;
    }

    try {
      setRsvpLoading(true);
      await submitRSVP(meetingId, { status }, user._id);

      // Update local RSVP status
      setRsvpStatus(status);

      // If user is president, also update stats
      if (isPresident) {
        const statsResponse = await getRSVPStats(meetingId);
        setRsvpStats(statsResponse.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to submit RSVP');
    } finally {
      setRsvpLoading(false);
      handleMenuClose();
    }
  };

  const handleAddAttachment = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const formData = new FormData();
      formData.append('file', file);

      const response = await addAttachment(meetingId, formData);

      // Update the local state with the new attachment
      if (response.success && response.data) {
        setMeeting(prev => ({
          ...prev,
          attachments: [...(prev.attachments || []), response.data]
        }));
      }
    } catch (err) {
      setError(err.message || 'Failed to add attachment');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (attachment) => {
    try {
      // Check if the attachment data is a data URL or just a base64 string
      let base64Data;
      if (attachment.attachment.includes(',')) {
        // It's a data URL, extract the base64 part
        base64Data = attachment.attachment.split(',')[1];
      } else {
        // It's already a base64 string
        base64Data = attachment.attachment;
      }

      const binaryString = window.atob(base64Data);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: attachment.mimeType });

      // Create and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading file:', err);
      setError('Failed to download file. Please try again.');
    }
  };

  const generatePDF = () => {
    if (!meeting) return;

    const doc = new jsPDF();

    // Add title
    doc.setFontSize(20);
    doc.text('Gram Sabha Meeting Details', 14, 15);

    // Add meeting details
    doc.setFontSize(12);
    doc.text(`Title: ${meeting.title}`, 14, 25);
    doc.text(`Date & Time: ${new Date(meeting.dateTime).toLocaleString()}`, 14, 35);
    doc.text(`Location: ${meeting.location}`, 14, 45);
    doc.text(`Duration: ${meeting.scheduledDurationMinutes} minutes`, 14, 55);
    doc.text(`Status: ${meeting.status}`, 14, 65);

    if (meeting.agenda) {
      doc.text('Agenda:', 14, 75);
      const splitAgenda = doc.splitTextToSize(meeting.agenda, 180);
      doc.text(splitAgenda, 14, 85);
    }

    // Save the PDF
    doc.save(`gram-sabha-${meeting.title}-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const getRSVPButtonProps = () => {
    switch (rsvpStatus) {
      case 'CONFIRMED':
        return {
          color: 'success',
          icon: <CheckCircleIcon />,
          text: strings.confirmed
        };
      case 'DECLINED':
        return {
          color: 'error',
          icon: <CancelIcon />,
          text: strings.declined
        };
      case 'MAYBE':
        return {
          color: 'warning',
          icon: <HelpIcon />,
          text: strings.maybe
        };
      default:
        return {
          color: 'primary',
          icon: <CheckCircleIcon />,
          text: strings.rsvp
        };
    }
  };

  if (loading && !meeting) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <CircularProgress />
      </Box>
    );
  }

  if (!meeting) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {strings.meetingNotFound}
      </Alert>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ mb: 3, boxShadow: 1 }}>
        <CardContent>
          {/* Meeting Title and Action Buttons */}
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
            <Typography variant="h5" fontWeight="500">
              {meeting.title}
            </Typography>
            <Box display="flex" gap={2}>
              {canRSVP && (
                <>
                  <Button
                    variant="contained"
                    color={getRSVPButtonProps().color}
                    onClick={handleMenuOpen}
                    disabled={rsvpLoading}
                    startIcon={getRSVPButtonProps().icon}
                    size="medium"
                  >
                    {getRSVPButtonProps().text}
                  </Button>
                  <Menu
                    anchorEl={anchorEl}
                    open={Boolean(anchorEl)}
                    onClose={handleMenuClose}
                  >
                    <MenuItem
                      onClick={() => handleRSVP('CONFIRMED')}
                      disabled={rsvpStatus === 'CONFIRMED'}
                    >
                      <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />
                      {strings.confirm}
                    </MenuItem>
                    <MenuItem
                      onClick={() => handleRSVP('DECLINED')}
                      disabled={rsvpStatus === 'DECLINED'}
                    >
                      <CancelIcon sx={{ mr: 1, color: 'error.main' }} />
                      {strings.decline}
                    </MenuItem>
                    <MenuItem
                      onClick={() => handleRSVP('MAYBE')}
                      disabled={rsvpStatus === 'MAYBE'}
                    >
                      <HelpIcon sx={{ mr: 1, color: 'warning.main' }} />
                      {strings.maybe}
                    </MenuItem>
                  </Menu>
                </>
              )}

              <Tooltip title={strings.downloadPDF}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<DownloadIcon />}
                  onClick={generatePDF}
                  disabled={loading}
                >
                  {strings.download}
                </Button>
              </Tooltip>

              {isPresident && (
                <Tooltip title={strings.attachFile}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<AddIcon />}
                    component="label"
                  >
                    {strings.uploadFile}
                    <input
                      type="file"
                      hidden
                      onChange={handleAddAttachment}
                    />
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Meeting Details */}
          <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: 'background.default' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box display="flex" sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ width: 120, fontWeight: 500 }}>
                    {strings.date} & {strings.time}:
                  </Typography>
                  <Typography variant="body1">
                    {new Date(meeting.dateTime).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                      hour12: true
                    })}
                  </Typography>
                </Box>

                <Box display="flex" sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ width: 120, fontWeight: 500 }}>
                    {strings.location}:
                  </Typography>
                  <Typography variant="body1">
                    {meeting.location}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Box display="flex" sx={{ mb: 2 }}>
                  <Typography variant="body1" sx={{ width: 120, fontWeight: 500 }}>
                    {strings.duration}:
                  </Typography>
                  <Typography variant="body1">
                    {meeting.scheduledDurationMinutes} {strings.minutes}
                  </Typography>
                </Box>

                <Box display="flex">
                  <Typography variant="body1" sx={{ width: 120, fontWeight: 500 }}>
                    {strings.status}:
                  </Typography>
                  <Typography
                    variant="body1"
                    sx={{
                      color: meeting.status === 'SCHEDULED' ? 'primary.main' :
                        meeting.status === 'COMPLETED' ? 'success.main' :
                          meeting.status === 'CANCELLED' ? 'error.main' : 'text.primary',
                      fontWeight: 500
                    }}
                  >
                    {strings[`status${meeting.status}`] || meeting.status}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* RSVP Stats for President - Redesigned */}
          {isPresident && rsvpStats && (
            <Box sx={{ mb: 4 }}>
              <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
                {strings.rsvpStats}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Card sx={{
                    height: '100%',
                    boxShadow: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    borderLeft: '4px solid',
                    borderColor: 'success.main'
                  }}>
                    <CardContent>
                      <Typography variant="h4" align="center" color="success.main" fontWeight="bold">
                        {rsvpStats.CONFIRMED}
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        {strings.confirmed}
                      </Typography>
                      <Box position="absolute" bottom={5} right={5} sx={{ opacity: 0.1 }}>
                        <CheckCircleIcon sx={{ fontSize: 40 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Card sx={{
                    height: '100%',
                    boxShadow: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    borderLeft: '4px solid',
                    borderColor: 'error.main'
                  }}>
                    <CardContent>
                      <Typography variant="h4" align="center" color="error.main" fontWeight="bold">
                        {rsvpStats.DECLINED}
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        {strings.declined}
                      </Typography>
                      <Box position="absolute" bottom={5} right={5} sx={{ opacity: 0.1 }}>
                        <CancelIcon sx={{ fontSize: 40 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Card sx={{
                    height: '100%',
                    boxShadow: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    borderLeft: '4px solid',
                    borderColor: 'warning.main'
                  }}>
                    <CardContent>
                      <Typography variant="h4" align="center" color="warning.main" fontWeight="bold">
                        {rsvpStats.MAYBE}
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        {strings.maybe}
                      </Typography>
                      <Box position="absolute" bottom={5} right={5} sx={{ opacity: 0.1 }}>
                        <HelpIcon sx={{ fontSize: 40 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3}>
                  <Card sx={{
                    height: '100%',
                    boxShadow: 2,
                    position: 'relative',
                    overflow: 'hidden',
                    borderLeft: '4px solid',
                    borderColor: 'grey.500'
                  }}>
                    <CardContent>
                      <Typography variant="h4" align="center" color="text.secondary" fontWeight="bold">
                        {rsvpStats.NO_RESPONSE}
                      </Typography>
                      <Typography variant="body2" align="center" color="text.secondary">
                        {strings.noResponse}
                      </Typography>
                      <Box position="absolute" bottom={5} right={5} sx={{ opacity: 0.1 }}>
                        <PeopleIcon sx={{ fontSize: 40 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 2, textAlign: 'right' }}>
                {strings.totalRegisteredUsers}: <strong>{rsvpStats.TOTAL}</strong>
              </Typography>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Agenda Section */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              {strings.agenda}
            </Typography>
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default' }}>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                {meeting.agenda || strings.noAgenda}
              </Typography>
            </Paper>
          </Box>

          {/* Attachments Section */}
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
              {strings.attachments}
            </Typography>

            {meeting.attachments && meeting.attachments.length > 0 ? (
              <TableContainer component={Paper} variant="outlined">
                <Table>
                  <TableHead>
                    <TableRow sx={{ bgcolor: 'background.default' }}>
                      <TableCell sx={{ fontWeight: 'bold' }}>{strings.fileName}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{strings.fileType}</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>{strings.uploadedAt}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 'bold' }}>{strings.actions}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {meeting.attachments.map((attachment) => (
                      <TableRow key={attachment._id} hover>
                        <TableCell>{attachment.filename}</TableCell>
                        <TableCell>{attachment.mimeType}</TableCell>
                        <TableCell>
                          {new Date(attachment.uploadedAt).toLocaleString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: 'numeric',
                            minute: 'numeric',
                            hour12: true
                          })}
                        </TableCell>
                        <TableCell align="right">
                          <Button
                            variant="text"
                            color="primary"
                            startIcon={<DownloadIcon />}
                            onClick={() => handleDownload(attachment)}
                            size="small"
                          >
                            {strings.download}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
                <Typography variant="body2" color="text.secondary">
                  {strings.noAttachments}
                </Typography>
              </Paper>
            )}
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default GramSabhaDetails;