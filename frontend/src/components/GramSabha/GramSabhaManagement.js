import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Alert,
  CircularProgress,
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  AttachFile as AttachFileIcon,
  Close as CloseIcon,
  Download as DownloadIcon,
} from "@mui/icons-material";
import {
  fetchGramSabhaMeetings,
  createGramSabhaMeeting,
  updateGramSabhaMeeting,
  deleteGramSabhaMeeting,
  addAttachment,
  listJioMeetRecordings,
  downloadJioMeetMRecording,
} from "../../api/gram-sabha";
import { fetchIssueSummary } from "../../api/summary";
import { useAuth } from "../../utils/authContext";
import { useLanguage } from "../../utils/LanguageContext";
import GramSabhaDetails from "./GramSabhaDetails";

const GramSabhaManagement = ({ panchayatId }) => {
  const { strings, language } = useLanguage();
  const [gramSabhas, setGramSabhas] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedGramSabha, setSelectedGramSabha] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [meetingToDelete, setMeetingToDelete] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    date: "",
    time: "",
    location: "",
    scheduledDurationHours: 2,
    attachments: [],
  });
  const [previewTitle, setPreviewTitle] = useState("");
  const { user, logout } = useAuth();
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [agendaItems, setAgendaItems] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [selectedAgendaItems, setSelectedAgendaItems] = useState([]);
  const [allAgendaItems, setAllAgendaItems] = useState([]);
  const [recordings, setRecordings] = useState([]);

  useEffect(() => {
    if (!user) {
      setError("Please login to access Gram Sabha management");
      return;
    }

    // Add this check
    if (!panchayatId) {
      setError("No panchayat selected. Please select a panchayat first.");
      return;
    }

    loadGramSabhas();
    loadAgendaItems();
  }, [panchayatId, user]);

  useEffect(() => {
    if (formData.date && formData.time) {
      const formattedDate = new Date(formData.date).toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }
      );

      const formattedTime = new Date(
        `2000-01-01T${formData.time}`
      ).toLocaleTimeString("en-IN", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });

      const calculatedTitle =
        formData.title || `Gram Sabha - ${formattedDate} - ${formattedTime}`;
      if (calculatedTitle !== previewTitle) {
        setPreviewTitle(calculatedTitle);
      }
    }
  }, [formData.date, formData.time, formData.title, previewTitle]);

  useEffect(() => {
    const fetchData = async () => {
      if (!Array.isArray(gramSabhas) || gramSabhas.length === 0) return;

      try {
        const recordingsList = [];

        for (const sabha of gramSabhas) {
          if (sabha?.jioMeetData?.historyId) {
            const res = await fetchRecordingList(
              sabha?.jioMeetData?.jiomeetId,
              sabha?.jioMeetData?.roomPIN,
              sabha?.jioMeetData?.historyId
            );
            if (res) {
              recordingsList.push(...res);
            }
          }
        }

        setRecordings(recordingsList); // or process as needed
      } catch (err) {
        console.error("Error fetching recordings:", err);
      }
    };

    fetchData();
  }, [gramSabhas]);

  const loadGramSabhas = async () => {
    // Add this check
    if (!panchayatId) {
      setError("Invalid panchayat ID");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await fetchGramSabhaMeetings(panchayatId);
      setGramSabhas(data);
    } catch (error) {
      setError(error.message || "Failed to load Gram Sabha meetings");
      console.error("Error loading Gram Sabhas:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAgendaItems = async () => {
    if (!panchayatId) return;

    try {
      setLoadingAgenda(true);
      const summaryData = await fetchIssueSummary(panchayatId);
      if (
        summaryData.success &&
        summaryData.summary &&
        summaryData.summary.agendaItems
      ) {
        setAgendaItems(summaryData.summary.agendaItems);
        // Initialize selected items as empty for new meetings
        setSelectedAgendaItems([]);
      } else {
        setAgendaItems([]);
        setSelectedAgendaItems([]);
      }
    } catch (error) {
      console.error("Error loading agenda items:", error);
      setAgendaItems([]);
      setSelectedAgendaItems([]);
    } finally {
      setLoadingAgenda(false);
    }
  };

  async function fetchRecordingList(jiomeetId, roomPIN, historyId) {
    console.log("Fetching recordings for:", { jiomeetId, roomPIN, historyId });

    try {
      const result = await listJioMeetRecordings({
        jiomeetId,
        roomPIN,
        historyId,
      });
      return result?.recordingData || result;
    } catch (error) {
      console.error(" Fetch error:", error.message || error);
    }
  }
  // Helper to merge and deduplicate agenda items by _id
  const mergeAgendaItems = (meetingAgenda, summaryAgenda) => {
    const map = new Map();
    meetingAgenda.forEach((item) => item._id && map.set(item._id, item));
    summaryAgenda.forEach(
      (item) => item._id && !map.has(item._id) && map.set(item._id, item)
    );
    return Array.from(map.values());
  };

  // Load agenda items for dialog (meeting + summary)
  const loadAgendaItemsForDialog = async (gramSabha) => {
    setLoadingAgenda(true);
    try {
      const summaryData = await fetchIssueSummary(panchayatId);
      const summaryAgenda =
        summaryData.success &&
        summaryData.summary &&
        summaryData.summary.agendaItems
          ? summaryData.summary.agendaItems
          : [];
      const meetingAgenda =
        gramSabha && Array.isArray(gramSabha.agenda) ? gramSabha.agenda : [];
      const merged = mergeAgendaItems(meetingAgenda, summaryAgenda);
      setAllAgendaItems(merged);
      // Pre-select those in the meeting's agenda
      setSelectedAgendaItems(meetingAgenda);
    } catch (error) {
      setAllAgendaItems([]);
      setSelectedAgendaItems([]);
    } finally {
      setLoadingAgenda(false);
    }
  };

  const handleOpenDialog = (gramSabha = null) => {
    if (gramSabha) {
      setSelectedGramSabha(gramSabha);
      const dateTime = new Date(gramSabha.dateTime);
      setFormData({
        title: gramSabha.title,
        date: dateTime.toISOString().split("T")[0],
        time: dateTime.toTimeString().slice(0, 5),
        location: gramSabha.location,
        description: gramSabha.description,
        scheduledDurationHours: gramSabha.scheduledDurationHours,
        attachments: gramSabha.attachments || [],
      });
      loadAgendaItemsForDialog(gramSabha);
    } else {
      setSelectedGramSabha(null);
      setFormData({
        title: "",
        date: "",
        time: "",
        location: "",
        description: "",
        scheduledDurationHours: 2,
        attachments: [],
      });
      loadAgendaItemsForDialog(null);
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setSelectedGramSabha(null);
    setSelectedAgendaItems([]);
    setError("");
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => {
      const newFormData = {
        ...prev,
        [name]: value,
      };
      return newFormData;
    });
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setFormData((prev) => ({
      ...prev,
      attachments: [...prev.attachments, ...files],
    }));
  };

  const removeAttachment = (index) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const prepareAgendaItemsForSubmission = (items) => {
    return items.map((item) => ({
      ...item,
      createdByType: item.createdByType || "SYSTEM",
      createdByUserId:
        item.createdByType === "USER" && item.createdByUserId
          ? item.createdByUserId
          : null,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError("Please login to create a Gram Sabha meeting");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Combine date and time into a single dateTime field
      const dateTime = new Date(`${formData.date}T${formData.time}`);
      if (isNaN(dateTime.getTime())) {
        throw new Error("Invalid date or time format");
      }

      // Create FormData object for multipart/form-data
      const formDataToSend = new FormData();
      formDataToSend.append("panchayatId", panchayatId);

      if (selectedGramSabha) {
        // For updates, only include changed fields
        let hasChanges = false;

        if (formData.title !== selectedGramSabha.title) {
          formDataToSend.append("title", formData.title || "");
          hasChanges = true;
        }

        // Format the existing dateTime for comparison
        const existingDate = new Date(selectedGramSabha.dateTime);
        if (dateTime.getTime() !== existingDate.getTime()) {
          formDataToSend.append("dateTime", dateTime.toISOString());
          hasChanges = true;
        }

        formDataToSend.append("date", formData.date);
        formDataToSend.append("time", formData.time);

        if (formData.location !== selectedGramSabha.location) {
          formDataToSend.append("location", formData.location);
          hasChanges = true;
        }

        if (
          parseInt(formData.scheduledDurationHours) !==
          parseInt(selectedGramSabha.scheduledDurationHours)
        ) {
          formDataToSend.append(
            "scheduledDurationHours",
            formData.scheduledDurationHours
          );
          hasChanges = true;
        }

        // Handle attachments - don't send the attachments array directly
        if (formData.attachments && formData.attachments.length > 0) {
          // Only add files that are actual File objects (new uploads)
          const newFiles = formData.attachments.filter(
            (file) => file instanceof File
          );

          newFiles.forEach((file) => {
            formDataToSend.append("attachments", file);
            hasChanges = true;
          });
        }

        // Add selected agenda items
        if (selectedAgendaItems.length > 0) {
          const preparedItems =
            prepareAgendaItemsForSubmission(selectedAgendaItems);
          formDataToSend.append(
            "selectedAgendaItems",
            JSON.stringify(preparedItems)
          );
          hasChanges = true;
        }

        if (hasChanges) {
          await updateGramSabhaMeeting(selectedGramSabha._id, formDataToSend);
        }

        handleCloseDialog();
        loadGramSabhas();
      } else {
        // For new record, add all fields
        formDataToSend.append("title", formData.title || "");
        formDataToSend.append("dateTime", dateTime.toISOString());
        formDataToSend.append("location", formData.location);
        formDataToSend.append(
          "scheduledDurationHours",
          formData.scheduledDurationHours
        );
        formDataToSend.append("date", formData.date);
        formDataToSend.append("time", formData.time);

        // Add selected agenda items
        if (selectedAgendaItems.length > 0) {
          const preparedItems =
            prepareAgendaItemsForSubmission(selectedAgendaItems);
          formDataToSend.append(
            "selectedAgendaItems",
            JSON.stringify(preparedItems)
          );
        }

        // Append each attachment file
        if (formData.attachments && formData.attachments.length > 0) {
          formData.attachments.forEach((file) => {
            if (file instanceof File) {
              formDataToSend.append("attachments", file);
            }
          });
        }

        await createGramSabhaMeeting(formDataToSend);
        handleCloseDialog();
        loadGramSabhas();
        // Reload agenda items to reflect changes
        loadAgendaItems();
      }
    } catch (err) {
      console.error("Error in handleSubmit:", err);
      if (
        err.message === "Invalid token" ||
        err.message === "Token has expired"
      ) {
        logout();
        setError("Your session has expired. Please login again.");
      } else {
        setError(err.message || "Failed to save Gram Sabha meeting");
      }
      console.error("Error submitting form:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!user) {
      setError("Please login to delete a Gram Sabha meeting");
      return;
    }

    setMeetingToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!meetingToDelete) return;

    try {
      setLoading(true);
      setError("");
      await deleteGramSabhaMeeting(meetingToDelete);
      setGramSabhas(
        gramSabhas.filter((meeting) => meeting._id !== meetingToDelete)
      );
      setDeleteDialogOpen(false);
      setMeetingToDelete(null);
    } catch (error) {
      if (error.response?.status === 401) {
        logout();
        setError("Your session has expired. Please login again.");
      } else if (error.response?.status === 403) {
        setError(
          "You do not have permission to delete this Gram Sabha meeting. Only the meeting creator can delete it."
        );
      } else if (error.response?.status === 404) {
        setError(
          "Gram Sabha meeting not found. It may have been already deleted or you do not have permission to delete it."
        );
      } else {
        setError(
          error.response?.data?.message || "Failed to delete Gram Sabha meeting"
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const cancelDelete = () => {
    setDeleteDialogOpen(false);
    setMeetingToDelete(null);
  };

  const handleDownloadRecording = async (gramSabha) => {
    const recordings = gramSabha?.jioMeetData?.recordings;
    if (!Array.isArray(recordings) || recordings.length === 0) {
      console.warn(" No recordings found.");
      return;
    }

    for (const rec of recordings) {
      if (!rec?.url) continue;

      try {
        await downloadJioMeetMRecording(
          rec.url,
          `${rec.customName || "recording"}.mp4`
        );
      } catch (err) {
        console.error("❌ Download failed:", err.message || err);
      }
    }
  };

  // Helper function to get multilingual text
  const getMultilingualText = (item, field) => {
    if (!item || !item[field]) return "";

    // If it's a Map object (from MongoDB), convert to plain object first
    let textObj = item[field];
    if (textObj && typeof textObj === "object" && textObj.get) {
      // It's a Map, convert to plain object
      textObj = Object.fromEntries(textObj);
    }

    // If it's already a plain object with language keys
    if (typeof textObj === "object" && textObj !== null) {
      return (
        textObj[language] || textObj.en || textObj.hi || textObj.hindi || ""
      );
    }

    // If it's a string, return as is
    return textObj || "";
  };

  const isConcluded =
    selectedGramSabha && selectedGramSabha.status === "CONCLUDED";
  const supportedLanguages = ["en", "hi", "hindi"];
  const isMissingTranslation = (field) => {
    if (!field || typeof field !== "object") return false;

    const hasAtLeastOneFilled = Object.values(field).some((val) => val?.trim());
    const isMissingAnyLang = supportedLanguages.some(
      (lang) => !field[lang]?.trim()
    );

    return hasAtLeastOneFilled && isMissingAnyLang;
  };
  const showAgendaTranslationAlert = allAgendaItems.some(
    (item) =>
      isMissingTranslation(item.title) || isMissingTranslation(item.description)
  );

  return (
    <Box>
      <Box
        display="flex"
        justifyContent="space-between"
        alignItems="center"
        mb={3}
      >
        <Typography variant="h4">{strings.gramSabhaManagement}</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog()}
          disabled={loading}
        >
          {strings.scheduleMeeting}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>{strings.tableTitle}</TableCell>
                <TableCell>{strings.tableDateTime}</TableCell>
                <TableCell>{strings.tableLocation}</TableCell>
                <TableCell>{strings.tableDuration}</TableCell>
                <TableCell>{strings.tableStatus}</TableCell>
                <TableCell>{strings.tableActions}</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {gramSabhas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    {strings.noDataToDisplay}
                  </TableCell>
                </TableRow>
              ) : (
                gramSabhas.map((gramSabha) => (
                  <TableRow key={gramSabha._id}>
                    <TableCell>{gramSabha.title}</TableCell>
                    <TableCell>
                      {new Date(gramSabha.dateTime).toLocaleString()}
                    </TableCell>
                    <TableCell>{gramSabha.location}</TableCell>
                    <TableCell>
                      {gramSabha.scheduledDurationHours} {strings.hours}
                    </TableCell>
                    <TableCell>{gramSabha.status}</TableCell>
                    <TableCell>
                      <IconButton
                        onClick={() => setSelectedMeetingId(gramSabha._id)}
                        disabled={loading}
                        title={strings.viewDetails}
                      >
                        <ViewIcon />
                      </IconButton>
                      <IconButton
                        onClick={() => handleOpenDialog(gramSabha)}
                        disabled={loading}
                        title={strings.edit}
                      >
                        <EditIcon />
                      </IconButton>
                      {/* recording button*/}
                      {gramSabha?.jioMeetData?.recordings && (
                        <IconButton
                          onClick={() => handleDownloadRecording(gramSabha)}
                          disabled={loading}
                          title={strings.recordings}
                        >
                          <DownloadIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* View Details Dialog */}
      <Dialog
        open={!!selectedMeetingId}
        onClose={() => setSelectedMeetingId(null)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>{strings.gramSabhaDetails}</DialogTitle>
        <DialogContent>
          {selectedMeetingId && (
            <GramSabhaDetails meetingId={selectedMeetingId} user={user} />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSelectedMeetingId(null)}>
            {strings.close}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openDialog}
        onClose={handleCloseDialog}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {selectedGramSabha ? strings.editMeeting : strings.createMeeting}
        </DialogTitle>
        <DialogContent>
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <Stack spacing={3}>
              {!isConcluded ? (
                <>
                  <TextField
                    fullWidth
                    label={strings.titleOptional}
                    name="title"
                    value={formData.title}
                    onChange={handleInputChange}
                    helperText={strings.titleHelperText}
                  />

                  <Typography variant="subtitle2" color="text.secondary">
                    {strings.previewTitle}: {previewTitle}
                  </Typography>

                  <Divider />

                  <Typography variant="h6" gutterBottom>
                    {strings.dateAndTime}
                  </Typography>

                  <Stack direction="row" spacing={2}>
                    <TextField
                      fullWidth
                      label={strings.date}
                      name="date"
                      type="date"
                      value={formData.date}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                    <TextField
                      fullWidth
                      label={strings.time}
                      name="time"
                      type="time"
                      value={formData.time}
                      onChange={handleInputChange}
                      InputLabelProps={{ shrink: true }}
                      required
                    />
                  </Stack>

                  <TextField
                    fullWidth
                    label={strings.duration}
                    name="scheduledDurationHours"
                    type="number"
                    value={formData.scheduledDurationHours}
                    onChange={handleInputChange}
                    InputProps={{ inputProps: { min: 15, max: 480 } }}
                    helperText={strings.durationHelperText}
                    required
                  />

                  <TextField
                    fullWidth
                    label={strings.location}
                    name="location"
                    value={formData.location}
                    onChange={handleInputChange}
                    required
                  />

                  {/* Agenda Items from Issue Summary */}
                  <Box>
                    <Typography variant="h6" gutterBottom>
                      {strings.agenda || "Agenda Items"}
                    </Typography>

                    {loadingAgenda ? (
                      <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress size={24} />
                      </Box>
                    ) : allAgendaItems.length > 0 ? (
                      <Box>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          gutterBottom
                        >
                          Select agenda items to include in this meeting:
                        </Typography>
                        {/* Show translation alert */}
                        {showAgendaTranslationAlert && (
                          <Alert severity="info" sx={{ mb: 2 }}>
                            {strings.translationInProgress}
                          </Alert>
                        )}
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          {allAgendaItems.map((item, index) => {
                            const isSelected = selectedAgendaItems.some(
                              (selected) => selected._id === item._id
                            );
                            return (
                              <Box
                                key={item._id || index}
                                sx={{
                                  p: 2,
                                  mb: 1,
                                  border: "1px solid #e0e0e0",
                                  borderRadius: 1,
                                  backgroundColor: isSelected
                                    ? "#e3f2fd"
                                    : "#fafafa",
                                  cursor: "pointer",
                                  "&:hover": {
                                    backgroundColor: isSelected
                                      ? "#bbdefb"
                                      : "#f5f5f5",
                                  },
                                }}
                                onClick={() => {
                                  if (isSelected) {
                                    setSelectedAgendaItems(
                                      selectedAgendaItems.filter(
                                        (selected) => selected._id !== item._id
                                      )
                                    );
                                  } else {
                                    setSelectedAgendaItems([
                                      ...selectedAgendaItems,
                                      item,
                                    ]);
                                  }
                                }}
                              >
                                <Box display="flex" alignItems="flex-start">
                                  <Checkbox
                                    checked={isSelected}
                                    sx={{ mt: 0 }}
                                  />
                                  <Box sx={{ ml: 1, flex: 1 }}>
                                    <Typography
                                      variant="subtitle1"
                                      fontWeight="medium"
                                    >
                                      {getMultilingualText(item, "title") ||
                                        `Agenda Item ${index + 1}`}
                                    </Typography>
                                    <Typography
                                      variant="body2"
                                      color="text.secondary"
                                    >
                                      {getMultilingualText(
                                        item,
                                        "description"
                                      ) || strings.noDescription}
                                    </Typography>
                                    {item.linkedIssues &&
                                      item.linkedIssues.length > 0 && (
                                        <Typography
                                          variant="caption"
                                          color="primary"
                                          sx={{ mt: 0.5, display: "block" }}
                                        >
                                          📋 {item.linkedIssues.length} linked
                                          issue
                                          {item.linkedIssues.length !== 1
                                            ? "s"
                                            : ""}
                                        </Typography>
                                      )}
                                  </Box>
                                </Box>
                              </Box>
                            );
                          })}
                        </Paper>
                        {selectedAgendaItems.length > 0 && (
                          <Box
                            sx={{
                              mt: 2,
                              p: 2,
                              backgroundColor: "#e8f5e8",
                              borderRadius: 1,
                              border: "1px solid #4caf50",
                            }}
                          >
                            <Typography
                              variant="body2"
                              color="success.main"
                              fontWeight="medium"
                            >
                              ✅ {selectedAgendaItems.length} item
                              {selectedAgendaItems.length !== 1 ? "s" : ""}{" "}
                              selected for this meeting
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    ) : (
                      <Alert severity="info">{strings.noAgendaInfo}</Alert>
                    )}
                  </Box>
                </>
              ) : (
                <Alert severity="info">{strings.meetingConcludedInfo}</Alert>
              )}
              <Box>
                <Typography variant="subtitle1" gutterBottom>
                  {strings.attachments}
                </Typography>
                <FormControl fullWidth variant="outlined" sx={{ mb: 2 }}>
                  <InputLabel htmlFor="file-upload-input" shrink>
                    {strings.uploadFile || "Upload Files"}
                  </InputLabel>
                  <Button
                    variant="outlined"
                    component="label"
                    startIcon={<AttachFileIcon />}
                    fullWidth
                    sx={{
                      height: "56px",
                      justifyContent: "flex-start",
                      textTransform: "none",
                      border: "1px solid rgba(0, 0, 0, 0.23)",
                      borderRadius: 1,
                      pl: 2,
                      "&:hover": {
                        backgroundColor: "rgba(0, 0, 0, 0.04)",
                      },
                    }}
                  >
                    {formData.attachments.length > 0
                      ? `${formData.attachments.length} ${
                          formData.attachments.length === 1
                            ? strings.fileSelected || "file selected"
                            : strings.filesSelected || "files selected"
                        }`
                      : strings.clickToUpload || "Click to upload"}
                    <input
                      type="file"
                      multiple
                      onChange={handleFileChange}
                      style={{ display: "none" }}
                      id="file-upload-input"
                    />
                  </Button>
                </FormControl>

                {formData.attachments.length > 0 && (
                  <Paper variant="outlined" sx={{ p: 1 }}>
                    <List dense disablePadding>
                      {formData.attachments.map((file, index) => (
                        <ListItem
                          key={index}
                          sx={{
                            borderBottom:
                              index < formData.attachments.length - 1
                                ? "1px solid rgba(0, 0, 0, 0.12)"
                                : "none",
                            py: 0.5,
                          }}
                          secondaryAction={
                            <IconButton
                              edge="end"
                              onClick={() => removeAttachment(index)}
                              disabled={loading}
                              size="small"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          }
                        >
                          <ListItemIcon sx={{ minWidth: 36 }}>
                            <AttachFileIcon fontSize="small" />
                          </ListItemIcon>
                          <ListItemText
                            primary={
                              <Typography
                                variant="body2"
                                noWrap
                                title={file.name || file.filename}
                              >
                                {file.name || file.filename}
                              </Typography>
                            }
                            secondary={
                              <Typography
                                variant="caption"
                                noWrap
                                component="div"
                                color="text.secondary"
                              >
                                {file instanceof File
                                  ? `${(file.size / 1024).toFixed(1)} KB • ${
                                      file.type || "Unknown type"
                                    }`
                                  : file.mimeType
                                  ? `${file.mimeType} • ${new Date(
                                      file.uploadedAt
                                    ).toLocaleDateString()}`
                                  : "Existing attachment"}
                              </Typography>
                            }
                            sx={{ m: 0 }}
                          />
                        </ListItem>
                      ))}
                    </List>
                  </Paper>
                )}
              </Box>
            </Stack>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>{strings.cancel}</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={
              loading ||
              !formData.date ||
              !formData.time ||
              !formData.location||
              selectedAgendaItems.length === 0
            }
          >
            {loading ? <CircularProgress size={24} /> : strings.save}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={cancelDelete}
        aria-labelledby="delete-dialog-title"
        aria-describedby="delete-dialog-description"
      >
        <DialogTitle id="delete-dialog-title">
          {strings.deleteMeeting}
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="delete-dialog-description">
            {strings.deleteConfirmation}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete} disabled={loading}>
            {strings.cancel}
          </Button>
          <Button
            onClick={confirmDelete}
            color="error"
            variant="contained"
            disabled={loading}
            startIcon={loading ? <CircularProgress size={20} /> : null}
          >
            {strings.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GramSabhaManagement;
