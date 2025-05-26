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
  getRSVPStats,
  getAttendanceStats,
  fetchGramSabhaMeetingAttendanceData
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
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const { strings } = useLanguage();
  const dataFetched = useRef(false);
  const isMenuOpen = Boolean(anchorEl);

  const isPresident = user?.role === 'PRESIDENT' || user?.role === 'PRESIDENT_PANCHAYAT';
  const canRSVP = !isPresident && meeting && new Date(meeting.dateTime) > new Date();

  const handleDownloadOption = (type) => {
    handleMenuClose();
    if (type === 'pdf') {
      handleDownloadAttendanceReportPDF();
    } else if (type === 'csv') {
      handleDownloadAttendanceReportCSV();
    }
  };

  function hasMeetingEndedFn(meeting) {
  if (!meeting || !meeting.dateTime) return false;

  const MS_PER_HOUR = 60 * 60 * 1000;
  const meetingStartTime = new Date(meeting.dateTime);
  const durationInHours = meeting.scheduledDurationHours || 0;

  const meetingEndTime = new Date(meetingStartTime.getTime() + durationInHours * MS_PER_HOUR);

  return new Date() > meetingEndTime;
}

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

        if (isPresident) {
          // Fetch RSVP stats if user is president
          const statsResponse = await getRSVPStats(meetingId);
          setRsvpStats(statsResponse.data);

          // Fetch gram sabha attendance details to export in a file if user is president
          const attendanceResponse = await fetchGramSabhaMeetingAttendanceData(meetingId);
          setAttendance(attendanceResponse);
        }

        // Fetch Attendance stats
        const attendanceStatsResponse = await getAttendanceStats(meetingId);
        setAttendanceStats(attendanceStatsResponse);

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
          text: strings.attending
        };
      case 'DECLINED':
        return {
          color: 'error',
          icon: <CancelIcon />,
          text: strings.notAttending
        };
      case 'MAYBE':
        return {
          color: 'warning',
          icon: <HelpIcon />,
          text: strings.mayAttend
        };
      default:
        return {
          color: 'primary',
          icon: <CheckCircleIcon />,
          text: strings.rsvp
        };
    }
  };

  const handleDownloadAttendanceReportPDF = () => {
    if (!attendanceStats || !meeting || !attendance) return;

    const doc = new jsPDF();
    const pageHeight = doc.internal.pageSize.height;
    let y = 20;
    const lineHeight = 6;
    const margin = 20;

    const addLine = (text, indent = 0) => {
      if (y + lineHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(text, margin + indent, y);
      y += lineHeight;
    };

    doc.setFontSize(16);
    addLine("Gram Sabha Attendance Report");
    addLine("");
    doc.setFontSize(10);

    doc.setFontSize(12);
    addLine("Panchayat Details");
    doc.setFontSize(10);
    const panchayat = attendance.panchayatId || {};
    addLine(`Panchayat: ${panchayat.name || "-"}`, 5);
    addLine(`Block: ${panchayat.block || "-"}`, 5);
    addLine(`District: ${panchayat.district || "-"}`, 5);
    addLine(`State: ${panchayat.state || "-"}`, 5);
    addLine(""); // extra space

    doc.setFontSize(12);
    addLine("Gram Sabha Details");
    doc.setFontSize(10);
    addLine(`Title: ${meeting.title || "-"}`, 5);
    addLine(`Date: ${new Date(meeting.dateTime).toLocaleDateString("en-IN")}`, 5);
    addLine(`Location: ${meeting.location || "-"}`, 5);
    addLine(`Agenda: ${meeting.agenda || "-"}`, 5);
    addLine(`Duration: ${meeting.scheduledDurationHours || "-"} hour(s)`, 5);
    addLine(`Status: ${meeting.status || "-"}`, 5);
    addLine(""); // extra space

    doc.setFontSize(12);
    addLine("Attendance Statistics");
    doc.setFontSize(10);
    addLine(`Total Voters: ${attendanceStats.totalVoters ?? "-"}`, 5);
    addLine(`Total Registered: ${attendanceStats.total ?? "-"}`, 5);
    addLine(`Present: ${attendanceStats.present ?? "-"}`, 5);
    addLine(`Quorum Required: ${attendanceStats.quorum ?? "-"}`, 5);
    addLine("");

    // Gender & Caste breakdown
    const genderCount = {};
    const casteCount = {};

    if(Array.isArray(attendance.attendances)) {
      attendance.attendances.forEach((att) => {
        const gender = att.userId?.gender || "N/A";
        const caste = att.userId?.caste?.category || "N/A";

        genderCount[gender] = (genderCount[gender] || 0) + 1;
        casteCount[caste] = (casteCount[caste] || 0) + 1;
      });
    }

    doc.setFontSize(12);
    addLine("Gender Statistics");
    doc.setFontSize(10);
    Object.entries(genderCount).forEach(([gender, count]) => {
      addLine(`${gender}: ${count}`, 5);
    });
    addLine("");

    doc.setFontSize(12);
    addLine("Caste Category Statistics");
    doc.setFontSize(10);
    Object.entries(casteCount).forEach(([caste, count]) => {
      addLine(`${caste}: ${count}`, 5);
    });

    addLine(""); // space before attendance list
    doc.setFontSize(12);
    addLine("Attendance List");
    doc.setFontSize(8);

    if(Array.isArray(attendance.attendances)) {
      attendance.attendances.forEach((att, index) => {
        const time = new Date(att.checkInTime).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        });
        const user = att.userId || {};
        const line = `${index + 1}. Name: ${user.name || "-"} | Gender: ${user.gender || "N/A"} | Caste: ${user.caste?.category || "N/A"} | Status: ${att.status} | Check-in: ${time} | Method: ${att.verificationMethod}`;
        const wrapped = doc.splitTextToSize(line, 170);

        wrapped.forEach(wLine => addLine(wLine));
        y += 2; // slight spacing after each entry
      });
    }

    doc.save(`attendance_report_${Date.now()}.pdf`);
  };

  const handleDownloadAttendanceReportCSV = () => {
    if (!attendanceStats || !meeting || !attendance) return;

    const rows = [];

    // Header metadata
    rows.push(["Gram Sabha Attendance Report"]);
    rows.push([]);
    rows.push(["Title", meeting.title || "-"]);
    rows.push(["Date", new Date(meeting.dateTime).toLocaleDateString("en-IN")]);
    rows.push(["Location", meeting.location || "-"]);
    rows.push(["Agenda", meeting.agenda || "-"]);
    rows.push(["Duration (hours)", meeting.scheduledDurationHours || "-"]);
    rows.push(["Status", meeting.status || "-"]);

    const panchayat = meeting.panchayatId || {};
    rows.push(["Panchayat", panchayat.name || "-"]);
    rows.push(["Block", panchayat.block || "-"]);
    rows.push(["District", panchayat.district || "-"]);
    rows.push(["State", panchayat.state || "-"]);
    rows.push([]);

    // Attendance summary
    rows.push(["Attendance Summary"]);
    rows.push(["Total Voters", attendanceStats.totalVoters ?? "-"]);
    rows.push(["Total Registered", attendanceStats.total ?? "-"]);
    rows.push(["Present", attendanceStats.present ?? "-"]);
    rows.push(["Quorum Required", attendanceStats.quorum ?? "-"]);
    rows.push([]);

    // Count by Gender and Caste
    const genderCount = {};
    const casteCount = {};

    if(Array.isArray(attendance.attendances)) {
      attendance.attendances.forEach((att) => {
        const gender = att.userId?.gender || "N/A";
        const caste = att.userId?.caste?.category || "N/A";

        genderCount[gender] = (genderCount[gender] || 0) + 1;
        casteCount[caste] = (casteCount[caste] || 0) + 1;
      });
    }

    rows.push(["Gender Count"]);
    Object.entries(genderCount).forEach(([gender, count]) => {
      rows.push([gender, count]);
    });

    rows.push([]);
    rows.push(["Caste Category Count"]);
    Object.entries(casteCount).forEach(([caste, count]) => {
      rows.push([caste || "N/A", count]);
    });

    rows.push([]);

    // Attendance Table Header
    rows.push([
      "S.No",
      "Name",
      "Gender",
      "Caste Category",
      "Status",
      "Check-in Time",
      "Verification Method",
    ]);

    // Attendance rows
    if(Array.isArray(attendance.attendances)) {
      attendance.attendances.forEach((att, index) => {
        const user = att.userId || {};
        const checkInTime = new Date(att.checkInTime).toLocaleString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        });

        rows.push([
          index + 1,
          user.name || "-",
          user.gender || "N/A",
          user.caste?.category || "N/A",
          att.status,
          checkInTime,
          att.verificationMethod,
        ]);
      });
    }

    // Convert to CSV string
    const csvContent = rows
      .map((row) => row.map((item) => `"${item}"`).join(","))
      .join("\n");

    // Trigger file download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `attendance_report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    //Revoke the object URL to prevent memory leaks
    URL.revokeObjectURL(url);
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
                    disabled={rsvpLoading || loading}
                    startIcon={rsvpLoading ? <CircularProgress size={20} color="inherit" /> : getRSVPButtonProps().icon}
                    size="medium"
                  >
                    {rsvpLoading ? strings.loading : getRSVPButtonProps().text}
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
                      {strings.attending}
                    </MenuItem>
                    <MenuItem
                      onClick={() => handleRSVP('DECLINED')}
                      disabled={rsvpStatus === 'DECLINED'}
                    >
                      <CancelIcon sx={{ mr: 1, color: 'error.main' }} />
                      {strings.notAttending}
                    </MenuItem>
                    <MenuItem
                      onClick={() => handleRSVP('MAYBE')}
                      disabled={rsvpStatus === 'MAYBE'}
                    >
                      <HelpIcon sx={{ mr: 1, color: 'warning.main' }} />
                      {strings.mayAttend}
                    </MenuItem>
                  </Menu>
                </>
              )}

              {/* Commented out PDF download button
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
              */}

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
                    {meeting.scheduledDurationHours} {strings.hours}
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

              <Grid container spacing={2} justifyContent="center">
                <Grid item xs={6} sm={3} sx={{ maxWidth: '250px' }}>
                  <Card sx={{
                    height: '100%',
                    boxShadow: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderTop: '4px solid',
                    borderColor: 'success.main',
                    bgcolor: 'background.paper'
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <CheckCircleIcon color="success" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {strings.attending}
                        </Typography>
                      </Box>
                      <Typography variant="h4" color="success.main" fontWeight="bold">
                        {rsvpStats.CONFIRMED}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3} sx={{ maxWidth: '250px' }}>
                  <Card sx={{
                    height: '100%',
                    boxShadow: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderTop: '4px solid',
                    borderColor: 'error.main',
                    bgcolor: 'background.paper'
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <CancelIcon color="error" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {strings.notAttending}
                        </Typography>
                      </Box>
                      <Typography variant="h4" color="error.main" fontWeight="bold">
                        {rsvpStats.DECLINED}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3} sx={{ maxWidth: '250px' }}>
                  <Card sx={{
                    height: '100%',
                    boxShadow: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderTop: '4px solid',
                    borderColor: 'warning.main',
                    bgcolor: 'background.paper'
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <HelpIcon color="warning" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {strings.mayAttend}
                        </Typography>
                      </Box>
                      <Typography variant="h4" color="warning.main" fontWeight="bold">
                        {rsvpStats.MAYBE}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3} sx={{ maxWidth: '250px' }}>
                  <Card sx={{
                    height: '100%',
                    boxShadow: 1,
                    position: 'relative',
                    overflow: 'hidden',
                    borderTop: '4px solid',
                    borderColor: 'grey.500',
                    bgcolor: 'background.paper'
                  }}>
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <PeopleIcon color="action" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {strings.noResponse}
                        </Typography>
                      </Box>
                      <Typography variant="h4" color="text.secondary" fontWeight="bold">
                        {rsvpStats.NO_RESPONSE}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
                {strings.totalRegisteredUsers}: <strong>{rsvpStats.TOTAL}</strong>
              </Typography>
            </Box>
          )}

          {hasMeetingEndedFn(meeting) && attendanceStats && (
            <Box sx={{ mb: 4 }}>
              <Box
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                sx={{ mb: 2 }}
              >
                <Typography variant="h6" gutterBottom>
                  {strings.attendanceStats}
                </Typography>

            {isPresident && (
                  <Box>
                    <Tooltip title={strings.download}>
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<DownloadIcon />}
                        onClick={handleMenuOpen}
                      >
                        {strings.download}
                      </Button>
                    </Tooltip>

                    <Menu
                      anchorEl={anchorEl}
                      open={isMenuOpen}
                      onClose={handleMenuClose}
                    >
                      <MenuItem onClick={() => handleDownloadOption('pdf')}>
                        {strings.downloadPDF}
                      </MenuItem>
                      <MenuItem onClick={() => handleDownloadOption('csv')}>
                        {strings.downloadCSV}
                      </MenuItem>
                    </Menu>
                  </Box>
                )}
              </Box>

              <Grid container spacing={2} justifyContent="center">
                <Grid item xs={6} sm={3} sx={{ maxWidth: "250px" }}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 1,
                      position: "relative",
                      overflow: "hidden",
                      borderTop: "4px solid",
                      borderColor: "info.main",
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <PeopleIcon color="info" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {strings.totalVoters}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h4"
                        color="info.main"
                        fontWeight="bold"
                      >
                        {attendanceStats.totalVoters || 0}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3} sx={{ maxWidth: "250px" }}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 1,
                      position: "relative",
                      overflow: "hidden",
                      borderTop: "4px solid",
                      borderColor: "primary.main",
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <PeopleIcon color="primary" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {strings.totalRegistered}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h4"
                        color="primary.main"
                        fontWeight="bold"
                      >
                        {attendanceStats.total}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3} sx={{ maxWidth: "250px" }}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 1,
                      position: "relative",
                      overflow: "hidden",
                      borderTop: "4px solid",
                      borderColor: "success.main",
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <CheckCircleIcon color="success" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {strings.present}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h4"
                        color="success.main"
                        fontWeight="bold"
                      >
                        {attendanceStats.present}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={6} sm={3} sx={{ maxWidth: "250px" }}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 1,
                      position: "relative",
                      overflow: "hidden",
                      borderTop: "4px solid",
                      borderColor: "warning.main",
                      bgcolor: "background.paper",
                    }}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box display="flex" alignItems="center" gap={1} mb={1}>
                        <HelpIcon color="warning" />
                        <Typography variant="subtitle2" color="text.secondary">
                          {strings.quorumRequired}
                        </Typography>
                      </Box>
                      <Typography
                        variant="h4"
                        color="warning.main"
                        fontWeight="bold"
                      >
                        {attendanceStats.quorum}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
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