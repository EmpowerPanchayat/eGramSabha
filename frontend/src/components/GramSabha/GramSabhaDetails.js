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
import { fetchLetterheadBase64 } from '../../api';
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
  const { language, strings } = useLanguage();
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

  // Helper to get multilingual text
  const getMultilingualText = (item, field) => {
    if (!item || !item[field]) return '';
    let textObj = item[field];
    if (textObj && typeof textObj === 'object' && textObj.get) {
      textObj = Object.fromEntries(textObj);
    }
    if (typeof textObj === 'object' && textObj !== null) {
      return textObj[language] || textObj.en || textObj.hi || textObj.hindi || '';
    }
    return textObj || '';
  };

  const handleDownloadAgendaPDF = async () => {
    if (!meeting) return;

    // Fetch letterhead if available
    let letterheadData = null;
    try {
      // meeting.panchayatId might be a populated object or just an ObjectId string
      const panchayatId = attendance?.panchayatId?._id || meeting.panchayatId?._id || meeting.panchayatId;
      console.log('PDF Debug - panchayatId:', panchayatId, 'meeting.panchayatId:', meeting.panchayatId);
      if (panchayatId) {
        letterheadData = await fetchLetterheadBase64(panchayatId);
        console.log('PDF Debug - letterheadData:', letterheadData);
        console.log('PDF Debug - margins:', letterheadData?.margins);
        console.log('PDF Debug - imageTransform:', letterheadData?.imageTransform);
      }
    } catch (e) {
      console.warn('Letterhead not available, continuing without:', e);
    }

    const panchayat = attendance?.panchayatId || {};
    const agendaItemsHTML = Array.isArray(meeting.agenda)
      ? meeting.agenda.map((item, i) => {
          const title = getMultilingualText(item, 'title') || `${strings.agenda} ${i + 1}`;
          const desc = getMultilingualText(item, 'description') || '';
          const linkedIssues = item.linkedIssues?.length
            ? `
              <p><strong>${strings.linkedIssues}:</strong></p>
              <table border="1" cellpadding="4" cellspacing="0" style="border-collapse: collapse; width: 100%; font-size: 11px; margin-bottom: 10px; table-layout: fixed;">
                <thead>
                  <tr style="page-break-inside: avoid;">
                    <th style="width: 10%;text-align: center;">${strings.serialNo}</th>
                    <th style="width: 70%;">${strings.issueDescription}</th>
                    <th style="width: 20%; text-align: center; vertical-align: top;">${strings.issueOwner}</th>
                  </tr>
                </thead>
                <tbody>
                  ${item.linkedIssues.map((issue, idx) => `
                    <tr style="page-break-inside: avoid;">
                      <td style="text-align: center;">${idx + 1}</td>
                      <td>
                        ${language === "hi"
                          ? issue.transcription?.enhancedHindiTranscription
                          : issue.transcription?.enhancedEnglishTranscription
                          || issue.transcription?.text
                          || "-"}
                      </td>
                      <td style="text-align: center;">${issue.createdForId?.name || '-'}</td>
                    </tr>
                  `).join("")}
                </tbody>
              </table>
            `
            : '';
          return `
            <p><strong>${i + 1}. ${title}</strong></p>
            <p>${desc}</p>
            ${linkedIssues}
            <br>
          `;
        }).join("")
      : `<p>${strings.noAgenda}</p>`;

    // Build the agenda content (common between letterhead and non-letterhead versions)
    const agendaContent = `
      <div style="text-align: right; margin-bottom: 10px;">
        <strong>${strings.serialNo} _____ </strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; ${strings.date} ${new Date().toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}
      </div>

      <h2 style="text-align: center;">${strings.gramSabhaAgendaNotice}</h2>

      <p><strong>${strings.village}:</strong> ${panchayat.name || "-"}<br/>
      <strong>${strings.date}:</strong> ${new Date(meeting.dateTime).toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN')}<br/>
      <strong>${strings.time}:</strong> ${new Date(meeting.dateTime).toLocaleTimeString(language === 'hi' ? 'hi-IN' : 'en-IN', {
        hour: '2-digit', minute: '2-digit', hour12: true
      })}<br/>
      <strong>${strings.location}:</strong> ${meeting.location || "-"}</p>

      <p>${strings.gramSabhaNoticeText}</p>

      <h3>${strings.newIssuesAndPlanHeading}:</h3>

      <p>${strings.newIssuesAndPlanDescription}</p>

      ${agendaItemsHTML}

      <br/><br/>
      <div style="display: flex; justify-content: space-between; margin-top: 40px;">
        <div><br/>
          <small>(${strings.secretary}, ${strings.gramPanchayat} ${panchayat.name || ""})</small>
        </div>
        <div><br/>
          <small>(${strings.sarpanch}, ${strings.gramPanchayat} ${panchayat.name || ""})</small>
        </div>
      </div>
    `;

    const container = document.createElement("div");

    // Default margins when no letterhead (in inches)
    const defaultMargins = { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 };

    // Apply letterhead if available
    console.log('PDF Debug - Applying letterhead?', !!letterheadData?.base64);
    if (letterheadData?.base64) {
      console.log('PDF Debug - ENTERING letterhead branch, type:', letterheadData.letterheadType);
      const { base64, letterheadType, margins, imageTransform } = letterheadData;
      const transform = imageTransform || { scale: 1, x: 0, y: 0 };

      // Calculate image transform styles
      const imgScale = transform.scale || 1;
      const imgX = transform.x || 0;
      const imgY = transform.y || 0;

      if (letterheadType === 'header') {
        // Header mode: letterhead at top, content below with side/bottom margins only
        // Using background-image instead of img tag for better html2canvas compatibility

        // The preview component uses 480x679 pixels to represent 8.27x11.69 inches (A4)
        // We need to convert pixel offsets to inches for proper scaling in the PDF
        const previewWidth = 480;
        const previewHeight = 679;
        const pxPerInchX = previewWidth / 8.27;
        const pxPerInchY = previewHeight / 11.69;

        // Convert pixel offsets to inches
        const xInches = imgX / pxPerInchX;
        const yInches = imgY / pxPerInchY;

        container.innerHTML = `
          <div style="font-family: 'Noto Sans Devanagari', sans-serif;">
            <div style="
              width: 100%;
              height: ${margins.top}in;
              background-image: url('${base64}');
              background-size: ${100 * imgScale}% auto;
              background-position: ${xInches}in ${yInches}in;
              background-repeat: no-repeat;
            "></div>
            <div style="padding: 0.2in ${margins.right}in ${margins.bottom}in ${margins.left}in; font-size: 12px; line-height: 1.6;">
              ${agendaContent}
            </div>
          </div>
        `;
      } else {
        // Full background mode: letterhead as background with content overlaid
        // The preview component uses 480x679 pixels to represent 8.27x11.69 inches (A4)
        const previewWidth = 480;
        const previewHeight = 679;
        const pxPerInchX = previewWidth / 8.27;
        const pxPerInchY = previewHeight / 11.69;

        // Convert pixel offsets to inches
        const xInches = imgX / pxPerInchX;
        const yInches = imgY / pxPerInchY;

        const bgSize = `${100 * imgScale}% ${100 * imgScale}%`;

        container.innerHTML = `
          <div style="
            font-family: 'Noto Sans Devanagari', sans-serif;
            background-image: url('${base64}');
            background-size: ${bgSize};
            background-position: ${xInches}in ${yInches}in;
            background-repeat: no-repeat;
            min-height: 10.5in;
          ">
            <div style="padding: ${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in; font-size: 12px; line-height: 1.6;">
              ${agendaContent}
            </div>
          </div>
        `;
      }
    } else {
      // Fallback: No letterhead - apply default margins via CSS padding
      container.innerHTML = `
        <div style="font-family: 'Noto Sans Devanagari', sans-serif; font-size: 12px; line-height: 1.6; padding: ${defaultMargins.top}in ${defaultMargins.right}in ${defaultMargins.bottom}in ${defaultMargins.left}in;">
          ${agendaContent}
        </div>
      `;
    }

    document.body.appendChild(container);
    console.log('PDF Debug - Container HTML (first 500 chars):', container.innerHTML.substring(0, 500));

    // Helper function to generate PDF
    const generatePDF = () => {
      html2pdf()
        .from(container)
        .set({
          margin: 0,
          filename: `agenda_${Date.now()}.pdf`,
          html2canvas: {
            scale: 2,
            useCORS: true,
            logging: true,  // Enable logging to debug image issues
            allowTaint: true,
            imageTimeout: 15000,  // Wait longer for images
            removeContainer: false  // Keep container for debugging
          },
          jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        })
        .save()
        .then(() => document.body.removeChild(container))
        .catch(err => {
          console.error('PDF generation error:', err);
          document.body.removeChild(container);
        });
    };

    // Wait a short moment for the DOM to render, then generate PDF
    // This ensures any images (including base64) are properly rendered
    setTimeout(() => {
      console.log('PDF Debug - Generating PDF after timeout');
      generatePDF();
    }, 100);
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

  let showTranslationAlert = false;

  const supportedLanguages = ['en', 'hi', 'hindi'];
  const isMissingTranslation = (field) => {
    if (!field || typeof field !== 'object') return false;

    const hasAtLeastOneFilled = Object.values(field).some(val => val?.trim());
    const isMissingAnyLang = supportedLanguages.some(lang => !field[lang]?.trim());

    return hasAtLeastOneFilled && isMissingAnyLang;
  };

  if (meeting.agenda?.some(item =>
    isMissingTranslation(item.title) || isMissingTranslation(item.description)
  )) {
    showTranslationAlert = true;
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

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              {strings.agenda}
            </Typography>

            <Tooltip title={strings.downloadPDF}>
              <Button
                variant="outlined"
                color="primary"
                startIcon={<DownloadIcon />}
                onClick={handleDownloadAgendaPDF}
                disabled={loading}
              >
                {strings.download}
              </Button>
            </Tooltip>
          </Box>
            
          {/* Agenda Section */}
          <Box sx={{ mb: 4 }}>
            <Paper variant="outlined" sx={{ p: 3, bgcolor: 'background.default' }}>
              {meeting.agenda && Array.isArray(meeting.agenda) && meeting.agenda.length > 0 ? (
                <Box>
                  {showTranslationAlert && (
                    <Alert severity="info" sx={{ mb: 2 }}>
                      {strings.translationInProgress}
                    </Alert>
                  )}
                  {meeting.agenda.map((item, index) => (
                    <Box key={item._id || index} sx={{ mb: 2, pb: 2, borderBottom: index < meeting.agenda.length - 1 ? '1px solid #e0e0e0' : 'none' }}>
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        {getMultilingualText(item, 'title') || `Agenda Item ${index + 1}`}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {getMultilingualText(item, 'description') || strings.noDescription}
                      </Typography>
                      {item.linkedIssues && item.linkedIssues.length > 0 && (
                        <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: 'block' }}>
                          📋 {item.linkedIssues.length} linked issue{item.linkedIssues.length !== 1 ? 's' : ''}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography variant="body1" sx={{ whiteSpace: 'pre-line' }}>
                  {strings.noAgenda}
                </Typography>
              )}
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