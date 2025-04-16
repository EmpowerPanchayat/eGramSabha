import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { 
  fetchGramSabhaMeeting, 
  addAttendance, 
  addAttachment 
} from '../../api/gram-sabha';
import { useAuth } from '../../utils/authContext';
import { useLanguage } from '../../utils/LanguageContext';

const GramSabhaDetails = ({ meetingId }) => {
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [openAttendanceDialog, setOpenAttendanceDialog] = useState(false);
  const [openAttachmentDialog, setOpenAttachmentDialog] = useState(false);
  const [attendanceData, setAttendanceData] = useState({
    name: '',
    age: '',
    gender: '',
    address: '',
    contactNumber: ''
  });
  const [attachmentData, setAttachmentData] = useState({
    title: '',
    description: '',
    file: null
  });
  const { user } = useAuth();
  const { strings } = useLanguage();

  useEffect(() => {
    loadMeetingDetails();
  }, [meetingId]);

  const loadMeetingDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await fetchGramSabhaMeeting(meetingId);
      setMeeting(data);
    } catch (error) {
      setError(error.message || 'Failed to load meeting details');
      console.error('Error loading meeting details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttendance = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      await addAttendance(meetingId, attendanceData);
      setOpenAttendanceDialog(false);
      loadMeetingDetails();
    } catch (error) {
      setError(error.message || 'Failed to add attendance');
      console.error('Error adding attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAttachment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError('');
      const formData = new FormData();
      formData.append('title', attachmentData.title);
      formData.append('description', attachmentData.description);
      formData.append('file', attachmentData.file);
      
      await addAttachment(meetingId, formData);
      setOpenAttachmentDialog(false);
      loadMeetingDetails();
    } catch (error) {
      setError(error.message || 'Failed to add attachment');
      console.error('Error adding attachment:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !meeting) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (!meeting) {
    return (
      <Alert severity="error">
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

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            {meeting.title}
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>{strings.date} & {strings.time}:</strong> {new Date(meeting.dateTime).toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>{strings.location}:</strong> {meeting.location}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>{strings.duration}:</strong> {meeting.scheduledDurationMinutes} {strings.minutes}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body1">
                <strong>{strings.status}:</strong> {meeting.status}
              </Typography>
            </Grid>
            {meeting.meetingLink && (
              <Grid item xs={12}>
                <Typography variant="body1">
                  <strong>{strings.meetingLink}:</strong>{' '}
                  <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer">
                    {meeting.meetingLink}
                  </a>
                </Typography>
              </Grid>
            )}
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">{strings.attendance}</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenAttendanceDialog(true)}
                  disabled={loading}
                >
                  {strings.addAttendance}
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{strings.name}</TableCell>
                      <TableCell>{strings.age}</TableCell>
                      <TableCell>{strings.gender}</TableCell>
                      <TableCell>{strings.contactNumber}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {meeting.attendance?.map((attendee) => (
                      <TableRow key={attendee._id}>
                        <TableCell>{attendee.name}</TableCell>
                        <TableCell>{attendee.age}</TableCell>
                        <TableCell>{attendee.gender}</TableCell>
                        <TableCell>{attendee.contactNumber}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">{strings.attachments}</Typography>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setOpenAttachmentDialog(true)}
                  disabled={loading}
                >
                  {strings.addAttachment}
                </Button>
              </Box>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>{strings.title}</TableCell>
                      <TableCell>{strings.description}</TableCell>
                      <TableCell>{strings.actions}</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {meeting.attachments?.map((attachment) => (
                      <TableRow key={attachment._id}>
                        <TableCell>{attachment.title}</TableCell>
                        <TableCell>{attachment.description}</TableCell>
                        <TableCell>
                          <Button
                            href={attachment.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            disabled={loading}
                          >
                            {strings.download}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Attendance Dialog */}
      <Dialog open={openAttendanceDialog} onClose={() => setOpenAttendanceDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{strings.addAttendance}</DialogTitle>
        <form onSubmit={handleAddAttendance}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={strings.name}
                  value={attendanceData.name}
                  onChange={(e) => setAttendanceData({ ...attendanceData, name: e.target.value })}
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label={strings.age}
                  type="number"
                  value={attendanceData.age}
                  onChange={(e) => setAttendanceData({ ...attendanceData, age: e.target.value })}
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth>
                  <InputLabel>{strings.gender}</InputLabel>
                  <Select
                    value={attendanceData.gender}
                    onChange={(e) => setAttendanceData({ ...attendanceData, gender: e.target.value })}
                    label={strings.gender}
                    required
                    disabled={loading}
                  >
                    <MenuItem value="MALE">{strings.male}</MenuItem>
                    <MenuItem value="FEMALE">{strings.female}</MenuItem>
                    <MenuItem value="OTHER">{strings.other}</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={strings.address}
                  value={attendanceData.address}
                  onChange={(e) => setAttendanceData({ ...attendanceData, address: e.target.value })}
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={strings.contactNumber}
                  value={attendanceData.contactNumber}
                  onChange={(e) => setAttendanceData({ ...attendanceData, contactNumber: e.target.value })}
                  required
                  disabled={loading}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAttendanceDialog(false)} disabled={loading}>
              {strings.cancel}
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {strings.add}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Attachment Dialog */}
      <Dialog open={openAttachmentDialog} onClose={() => setOpenAttachmentDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{strings.addAttachment}</DialogTitle>
        <form onSubmit={handleAddAttachment}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={strings.title}
                  value={attachmentData.title}
                  onChange={(e) => setAttachmentData({ ...attachmentData, title: e.target.value })}
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label={strings.description}
                  multiline
                  rows={3}
                  value={attachmentData.description}
                  onChange={(e) => setAttachmentData({ ...attachmentData, description: e.target.value })}
                  required
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <Button
                  variant="outlined"
                  component="label"
                  fullWidth
                  disabled={loading}
                >
                  {strings.uploadFile}
                  <input
                    type="file"
                    hidden
                    onChange={(e) => setAttachmentData({ ...attachmentData, file: e.target.files[0] })}
                  />
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAttachmentDialog(false)} disabled={loading}>
              {strings.cancel}
            </Button>
            <Button type="submit" variant="contained" color="primary" disabled={loading}>
              {strings.add}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default GramSabhaDetails; 