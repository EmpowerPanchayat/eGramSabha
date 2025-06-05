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
import html2pdf from 'html2pdf.js';
import '../../fonts/NotoSansDevanagari-Regular-normal';
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
        if (user?.id) {
          const rsvpResponse = await getRSVPStatus(meetingId, user.id);
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
    if (!user?.id) {
      setError('Please login to RSVP');
      return;
    }

    try {
      setRsvpLoading(true);
      await submitRSVP(meetingId, { status }, user.id);

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

  const panchayat = attendance.panchayatId || {};

  const genderCount = {};
  const casteCount = {};

  if (Array.isArray(attendance.attendances)) {
    attendance.attendances.forEach((att) => {
      const gender = att.userId?.gender || "N/A";
      const caste = att.userId?.caste?.category || "N/A";
      genderCount[gender] = (genderCount[gender] || 0) + 1;
      casteCount[caste] = (casteCount[caste] || 0) + 1;
    });
  }

  const container = document.createElement('div');
  container.innerHTML = `
    <div style="font-family: 'Noto Sans Devanagari', sans-serif; font-size: 12px; padding: 20px; line-height: 1.6;">
      <h2 style="text-align: center;">${strings.attendanceReportTitle}</h2>

      <h3>${strings.panchayatDetails}</h3>
      <p><strong>${strings.panchayat}:</strong> ${panchayat.name || "-"}</p>
      <p><strong>${strings.block}:</strong> ${panchayat.block || "-"}</p>
      <p><strong>${strings.district}:</strong> ${panchayat.district || "-"}</p>
      <p><strong>${strings.state}:</strong> ${panchayat.state || "-"}</p>

      <h3>${strings.gramSabhaDetails}</h3>
      <p><strong>${strings.title}:</strong> ${meeting.title || "-"}</p>
      <p><strong>${strings.date}:</strong> ${new Date(meeting.dateTime).toLocaleDateString("hi-IN")}</p>
      <p><strong>${strings.location}:</strong> ${meeting.location || "-"}</p>
      <p><strong>${strings.agenda}:</strong> ${meeting.agenda || "-"}</p>
      <p><strong>${strings.duration}:</strong> ${meeting.scheduledDurationHours || "-"} ${strings.hours}</p>
      <p><strong>${strings.status}:</strong> ${meeting.status || "-"}</p>

      <h3>${strings.attendanceStats}</h3>
      <p><strong>${strings.totalVoters}:</strong> ${attendanceStats.totalVoters ?? "-"}</p>
      <p><strong>${strings.totalRegistered}:</strong> ${attendanceStats.total ?? "-"}</p>
      <p><strong>${strings.present}:</strong> ${attendanceStats.present ?? "-"}</p>
      <p><strong>${strings.quorumRequired}:</strong> ${attendanceStats.quorum ?? "-"}</p>

      <h3>${strings.genderStats}</h3>
      <ul>
        ${Object.entries(genderCount).map(([g, c]) => `<li>${g}: ${c}</li>`).join("")}
      </ul>

      <h3>${strings.casteStats}</h3>
      <ul>
        ${Object.entries(casteCount).map(([c, count]) => `<li>${c}: ${count}</li>`).join("")}
      </ul>

      <h3>${strings.attendanceList}</h3>
      <table border="1" cellspacing="0" cellpadding="4" style="border-collapse: collapse; width: 100%; font-size: 10px;">
        <thead>
          <tr>
            <th>${strings.sNo}</th>
            <th>${strings.name}</th>
            <th>${strings.gender}</th>
            <th>${strings.casteCategory}</th>
            <th>${strings.status}</th>
            <th>${strings.verificationMethod}</th>
          </tr>
        </thead>
        <tbody>
          ${
            Array.isArray(attendance.attendances)
              ? attendance.attendances.map((att, i) => {
                  const user = att.userId || {};
                  return `
                    <tr style="page-break-inside: avoid;">
                      <td>${i + 1}</td>
                      <td>${user.name || "-"}</td>
                      <td>${user.gender || "N/A"}</td>
                      <td>${user.caste?.category || "N/A"}</td>
                      <td>${att.status}</td>
                      <td>${att.verificationMethod}</td>
                    </tr>`;
                }).join("")
              : `<tr><td colspan="6">${strings.noData}</td></tr>`
          }
        </tbody>
      </table>
    </div>
  `;

  document.body.appendChild(container);

  html2pdf()
    .from(container)
    .set({
      margin: 0.5,
      filename: `attendance_report_${Date.now()}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
    })
    .save()
    .then(() => document.body.removeChild(container));
};


  const handleDownloadAttendanceReportCSV = () => {
    if (!attendanceStats || !meeting || !attendance) return;

    const rows = [];

    const panchayat = attendance.panchayatId || {};

    // Header metadata
    rows.push([strings.attendanceReportTitle]);
    rows.push([]);
    rows.push([strings.title, meeting.title || "-"]);
    rows.push([strings.date, new Date(meeting.dateTime).toLocaleDateString("hi-IN")]);
    rows.push([strings.location, meeting.location || "-"]);
    rows.push([strings.agenda, meeting.agenda || "-"]);
    rows.push([strings.duration, `${meeting.scheduledDurationHours || "-"} ${strings.hours}`]);
    rows.push([strings.status, meeting.status || "-"]);

    rows.push([strings.panchayat, panchayat.name || "-"]);
    rows.push([strings.block, panchayat.block || "-"]);
    rows.push([strings.district, panchayat.district || "-"]);
    rows.push([strings.state, panchayat.state || "-"]);
    rows.push([]);

    // Attendance summary
    rows.push([strings.attendanceStats]);
    rows.push([strings.totalVoters, attendanceStats.totalVoters ?? "-"]);
    rows.push([strings.totalRegistered, attendanceStats.total ?? "-"]);
    rows.push([strings.present, attendanceStats.present ?? "-"]);
    rows.push([strings.quorumRequired, attendanceStats.quorum ?? "-"]);
    rows.push([]);

    // Count by Gender and Caste
    const genderCount = {};
    const casteCount = {};

    if (Array.isArray(attendance.attendances)) {
      attendance.attendances.forEach((att) => {
        const gender = att.userId?.gender || "N/A";
        const caste = att.userId?.caste?.category || "N/A";
        genderCount[gender] = (genderCount[gender] || 0) + 1;
        casteCount[caste] = (casteCount[caste] || 0) + 1;
      });
    }

    rows.push([strings.genderStats]);
    Object.entries(genderCount).forEach(([gender, count]) => {
      rows.push([gender, count]);
    });

    rows.push([]);
    rows.push([strings.casteStats]);
    Object.entries(casteCount).forEach(([caste, count]) => {
      rows.push([caste || "N/A", count]);
    });

    rows.push([]);

    // Attendance Table Header
    rows.push([
      strings.sNo,
      strings.name,
      strings.gender,
      strings.casteCategory,
      strings.status,
      strings.verificationMethod,
    ]);

    // Attendance rows
    if (Array.isArray(attendance.attendances)) {
      attendance.attendances.forEach((att, index) => {
        const user = att.userId || {};
        rows.push([
          index + 1,
          user.name || "-",
          user.gender || "N/A",
          user.caste?.category || "N/A",
          att.status,
          att.verificationMethod,
        ]);
      });
    }

    // Convert to CSV with proper escaping and BOM for Hindi support
    const csvContent = rows
      .map((row) =>
        row.map((item) =>
          `"${String(item).replace(/"/g, '""')}"`
        ).join(",")
      )
      .join("\n");

    // Create a Blob and trigger file download
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
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