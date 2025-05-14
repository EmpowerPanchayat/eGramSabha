import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  TextField,
  Grid,
  IconButton,
  LinearProgress,
  Chip,
  Snackbar,
  DialogContentText,
} from "@mui/material";
import {
  Event as EventIcon,
  LocationOn as LocationIcon,
  Videocam as VideocamIcon,
  CheckCircle as CheckCircleIcon,
  People as PeopleIcon,
  Close as CloseIcon,
  CameraAlt as CameraAltIcon,
  HowToReg as HowToRegIcon,
} from "@mui/icons-material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import StopIcon from "@mui/icons-material/Stop";
import {
  fetchGramSabhaMeetings,
  addAttendance,
  fetchTodaysMeetings,
} from "../../api/gram-sabha";
import { useLanguage } from "../../utils/LanguageContext";
import GramSabhaDetails from "./GramSabhaDetails";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import * as faceapi from "face-api.js";

const TodaysMeetingsBanner = ({ panchayatId, user }) => {
  const { strings } = useLanguage();
  const [todaysMeetings, setTodaysMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [voterIdLastFour, setVoterIdLastFour] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [historyId, setHistoryId] = useState(null);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [recodings, setRecordings] = useState(false);
  const [remotePeers, setRemotePeers] = useState([]);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [attendanceMessage, setAttendanceMessage] = useState({
    type: "",
    text: "",
  });

  // Liveliness verification state
  const [verificationState, setVerificationState] = useState({
    faceDetected: false,
    blink: { verified: false, count: 0 },
    movement: { verified: false, count: 0 },
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [activeFeedback, setActiveFeedback] = useState(null);

  const VERIFICATION_THRESHOLDS = { blink: 4, movement: 5 };
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const detectionState = useRef({
    previousLandmarks: null,
    movementHistory: [],
    baselineEAR: null,
    blinkStartTime: null,
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  useEffect(() => {
    const initializeFaceDetection = async () => {
      try {
        const MODEL_URL =
          "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";

        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        faceMeshRef.current = new FaceMesh({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
        });

        faceMeshRef.current.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshRef.current.onResults(handleFaceResults);
      } catch (error) {
        console.error("FaceMesh initialization error:", error);
        setAttendanceMessage({
          type: "error",
          text: "Face detection failed to initialize",
        });
      }
    };

    initializeFaceDetection();
    return () => stopCamera();
  }, []);

  const handleFaceResults = (results) => {
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx || !results.multiFaceLandmarks) {
      setVerificationState((prev) => ({ ...prev, faceDetected: false }));
      return;
    }

    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    const faceLandmarks = results.multiFaceLandmarks[0];

    if (faceLandmarks?.length >= 468) {
      drawFaceOutline(faceLandmarks);
      const livelinessChecks = {
        blink: detectBlink(faceLandmarks),
        movement: detectMacroMovement(faceLandmarks),
      };
      updateVerificationState(livelinessChecks);
      setVerificationState((prev) => ({ ...prev, faceDetected: true }));
    } else {
      setVerificationState((prev) => ({ ...prev, faceDetected: false }));
    }
  };

  const drawFaceOutline = (landmarks) => {
    const ctx = canvasRef.current.getContext("2d");
    const { width, height } = canvasRef.current;

    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);
    ctx.strokeStyle = "#42A5F5";
    ctx.lineWidth = 2;

    const minX = Math.min(...landmarks.map((l) => l.x));
    const maxX = Math.max(...landmarks.map((l) => l.x));
    const minY = Math.min(...landmarks.map((l) => l.y));
    const maxY = Math.max(...landmarks.map((l) => l.y));

    const centerX = ((minX + maxX) / 2) * width;
    const centerY = ((minY + maxY) / 2) * height;
    const radiusX = ((maxX - minX) / 2) * width * 1.2;
    const radiusY = ((maxY - minY) / 2) * height * 1.4;

    ctx.beginPath();
    ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
  };

  useEffect(() => {
    if (panchayatId) {
      loadTodaysMeetings();
    }
  }, [panchayatId]);

  const detectBlink = (landmarks) => {
    const eyeIndices = {
      left: [33, 160, 158, 133, 153, 144],
      right: [362, 385, 387, 263, 373, 380],
    };

    const calculateEAR = (points) => {
      const [p0, p1, p2, p3, p4, p5] = points;
      const A = Math.hypot(p1.x - p5.x, p1.y - p5.y);
      const B = Math.hypot(p2.x - p4.x, p2.y - p4.y);
      const C = Math.hypot(p0.x - p3.x, p0.y - p3.y);
      return (A + B) / (2 * C);
    };

    const avgEAR =
      (calculateEAR(eyeIndices.left.map((i) => landmarks[i])) +
        calculateEAR(eyeIndices.right.map((i) => landmarks[i]))) /
      2;

    if (!detectionState.current.baselineEAR) {
      detectionState.current.baselineEAR = avgEAR * 1.2;
      return false;
    }

    const isBlinking = avgEAR < detectionState.current.baselineEAR * 0.5;
    const now = Date.now();

    if (isBlinking) {
      detectionState.current.blinkStartTime ||= now;
      return false;
    }

    if (detectionState.current.blinkStartTime) {
      const duration = now - detectionState.current.blinkStartTime;
      detectionState.current.blinkStartTime = null;
      return duration > 50 && duration < 150;
    }
    return false;
  };

  const detectMacroMovement = (currentLandmarks) => {
    const state = detectionState.current;
    if (!state.previousLandmarks) {
      state.previousLandmarks = currentLandmarks;
      return false;
    }

    const referencePoints = [1, 33, 263, 61, 291];
    let totalMovement = 0;
    let validPoints = 0;

    referencePoints.forEach((index) => {
      const current = currentLandmarks[index];
      const previous = state.previousLandmarks[index];
      const movement = Math.hypot(
        current.x - previous.x,
        current.y - previous.y
      );
      if (movement > 0.001) {
        totalMovement += movement;
        validPoints++;
      }
    });

    if (validPoints < 3) return false;

    state.movementHistory.push(totalMovement / validPoints > 0.0025);
    state.movementHistory = state.movementHistory.slice(-10);
    state.previousLandmarks = currentLandmarks;

    return state.movementHistory.filter(Boolean).length >= 5;
  };

  const updateVerificationState = ({ blink, movement }) => {
    setVerificationState((prev) => ({
      ...prev,
      blink: blink
        ? updateCheck(
            prev.blink,
            VERIFICATION_THRESHOLDS.blink,
            "Blink verified"
          )
        : prev.blink,
      movement: movement
        ? updateCheck(
            prev.movement,
            VERIFICATION_THRESHOLDS.movement,
            "Movement verified"
          )
        : prev.movement,
    }));
  };

  const updateCheck = (check, threshold, message) => {
    if (check.verified) return check;
    const newCount = check.count + 1;
    if (newCount >= threshold) {
      showTemporaryFeedback(message);
      return { verified: true, count: newCount };
    }
    return { ...check, count: newCount };
  };

  const showTemporaryFeedback = (message) => {
    setActiveFeedback(message);
    setTimeout(() => setActiveFeedback(null), 2000);
  };

  const startCamera = async () => {
    try {
      if (!faceMeshRef.current) return;

      stopCamera();
      setCameraActive(true);

      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current?.send) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        facingMode: "user",
        width: 1280,
        height: 720,
      });

      await cameraRef.current.start();
    } catch (error) {
      console.error("Camera error:", error);
      setAttendanceMessage({
        type: "error",
        text: "Camera access failed. Please check permissions.",
      });
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (cameraRef.current) {
      cameraRef.current.stop();
      cameraRef.current = null;
    }
    setCameraActive(false);
    resetVerification();
  };

  const resetVerification = () => {
    setVerificationState({
      faceDetected: false,
      blink: { verified: false, count: 0 },
      movement: { verified: false, count: 0 },
    });
    detectionState.current = {
      previousLandmarks: null,
      movementHistory: [],
      baselineEAR: null,
      blinkStartTime: null,
    };
  };

  const loadTodaysMeetings = async () => {
    if (!panchayatId) return;

    try {
      setLoading(true);
      setError("");

      // Fetch today's meetings directly
      const data = await fetchTodaysMeetings(panchayatId);
      setTodaysMeetings(data);

      // Load attendance stats for the first meeting
      if (data.length > 0) {
        loadAttendanceStats(data[0]._id);
      }
    } catch (error) {
      console.error("Error loading meetings:", error);
      setError(error.message || "Failed to load today's meetings");
    } finally {
      setLoading(false);
    }
  };

  const loadAttendanceStats = async (meetingId) => {
    try {
      // Make API call to get attendance stats
      const response = await fetch(
        `${API_URL}/gram-sabha/${meetingId}/attendance-stats`,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch attendance statistics");
      }

      const data = await response.json();

      setAttendanceStats({
        total: data.totalRegistered || 0,
        totalVoters: data.totalVoters || 0,
        present: data.present || 0,
        quorum: data.quorumRequired || 0,
        quorumMet: (data.present || 0) >= (data.quorumRequired || 0),
      });
    } catch (error) {
      console.error("Error loading attendance stats:", error);
      // Don't show error for stats loading, just initialize with zeros
      setAttendanceStats({
        total: 0,
        totalVoters: 0,
        present: 0,
        quorum: 0,
        quorumMet: false,
      });
    }
  };

  const handleStartRecording = async (
    meetingId,
    meetingLink,
    roomPIN,
    hostToken
  ) => {
    // Instead of navigating, show meeting details
    // setSelectedMeeting(meetingId);

    // Show meeting details dialog
    setMeetingDetails({
      meetingId,
      meetingLink,
      roomPIN,
      hostToken,
    });
    setShowMeetingDetails(true);
  };

  const copyToClipboard = () => {
    const detailsText = `Meeting ID: ${meetingDetails.meetingId}
  Meeting Link: ${meetingDetails.meetingLink}
  Room PIN: ${meetingDetails.roomPIN}`;

    navigator.clipboard
      .writeText(detailsText)
      .then(() => {
        // Show success message
        setSnackbarMessage("Meeting details copied to clipboard");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  };

  const handleMarkAttendance = async (meetingId) => {
    // Reset form and show attendance dialog
    setVoterIdLastFour("");
    setFaceDetected(false);
    setAttendanceMessage({ type: "", text: "" });
    loadAttendanceStats(meetingId);
    setShowAttendanceForm(true);
  };

  const handleSubmitAttendance = async () => {
    if (!voterIdLastFour || voterIdLastFour.length !== 4) {
      setAttendanceMessage({
        type: "error",
        text: "Please enter the last 4 digits of the Voter ID.",
      });
      return;
    }

    const passedChecks = Object.values(verificationState)
      .filter((val) => typeof val === "object")
      .filter((check) => check.verified).length;

    if (passedChecks < 2) {
      setAttendanceMessage({
        type: "error",
        text: "No face detected. Please position your face in front of the camera.",
      });
      return;
    }

    try {
      setAttendanceLoading(true);

      // Detect face and get descriptor
      const detections = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setAttendanceMessage({
          type: "error",
          text: "Face not recognized clearly. Please try again.",
        });
        setAttendanceLoading(false);
        return;
      }

      // Get face descriptor
      const faceDescriptor = Array.from(detections.descriptor);

      // Create a canvas to capture the image
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = videoRef.current.videoWidth;
      tempCanvas.height = videoRef.current.videoHeight;
      const ctx = tempCanvas.getContext("2d");
      ctx.drawImage(
        videoRef.current,
        0,
        0,
        tempCanvas.width,
        tempCanvas.height
      );

      // Convert to base64
      const imageDataURL = tempCanvas.toDataURL("image/jpeg");

      // Send the attendance data to the server
      const response = await fetch(
        `${API_URL}/gram-sabha/${todaysMeetings[0]._id}/mark-attendance`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            faceDescriptor,
            voterIdLastFour,
            panchayatId,
            faceImage: imageDataURL,
            verificationMethod: "FACE_RECOGNITION",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to mark attendance");
      }

      // Success
      setAttendanceMessage({
        type: "success",
        text: "Attendance marked successfully!",
      });

      // Reload attendance stats
      await loadAttendanceStats(todaysMeetings[0]._id);

      // Reset form
      setVoterIdLastFour("");
      stopCamera();

      // If this attendance marked causes quorum to be met, reload the meeting to update it
      if (
        attendanceStats.present + 1 >= attendanceStats.quorum &&
        !attendanceStats.quorumMet
      ) {
        await loadTodaysMeetings();
      }
    } catch (error) {
      console.error("Error marking attendance:", error);
      setAttendanceMessage({
        type: "error",
        text: error.message || "Failed to mark attendance. Please try again.",
      });
    } finally {
      setAttendanceLoading(false);
    }
  };

  if (loading && todaysMeetings.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{ p: 3, display: "flex", justifyContent: "center" }}
      >
        <CircularProgress size={40} />
      </Paper>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  if (todaysMeetings.length === 0) {
    return (
      <Paper
        elevation={1}
        sx={{
          p: 3,
          textAlign: "center",
          bgcolor: "background.default",
          borderRadius: 2,
          mb: 3,
        }}
      >
        <Typography variant="body1" color="text.secondary">
          {strings.noMeetingsToday}
        </Typography>
      </Paper>
    );
  }

  // Just display the first meeting in the banner
  const meeting = todaysMeetings[0];
  const quorumMet = attendanceStats?.quorumMet;

  return (
    <Box sx={{ mb: 3, width: "100%", display: "flex" }}>
      <Card
        elevation={1}
        sx={{
          borderRadius: 2,
          overflow: "hidden",
          border: "1px solid",
          borderColor: "divider",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Banner Header */}
        <CardHeader
          sx={{
            bgcolor: "primary.main",
            color: "white",
            py: 1,
            "& .MuiCardHeader-title": {
              fontSize: "1rem",
              fontWeight: "bold",
            },
          }}
          title={strings.todaysMeeting}
          disableTypography
        />

        {/* Meeting Content */}
        <CardContent sx={{ px: 3, py: 2 }}>
          <Typography
            variant="h6"
            fontWeight="bold"
            color="text.primary"
            gutterBottom
          >
            {meeting.title}
          </Typography>

          <Stack spacing={1.5} sx={{ mb: 2 }}>
            <Box display="flex" alignItems="center" gap={1}>
              <LocationIcon fontSize="small" color="primary" />
              <Typography variant="body1" color="text.secondary">
                {meeting.location}
              </Typography>
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <EventIcon fontSize="small" color="primary" />
              <Typography variant="body1" color="text.secondary">
                {new Date(meeting.dateTime).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "long",
                  hour: "numeric",
                  minute: "numeric",
                  hour12: true,
                })}
              </Typography>
            </Box>
          </Stack>

          {/* Action Buttons */}
          <Box display="flex" justifyContent="flex-end" gap={2} sx={{ mt: 1 }}>
            <Button
              variant="contained"
              color="primary"
              onClick={() => handleMarkAttendance(meeting._id)}
              startIcon={<HowToRegIcon />}
              sx={{ px: 3 }}
            >
              {strings.markAttendance}
            </Button>
            {isRecording === false && (
              <Button
                variant="contained"
                color="success"
                onClick={() =>
                  handleStartRecording(
                    meeting.jioMeetData.jiomeetId,
                    meeting.meetingLink,
                    meeting.jioMeetData.roomPIN,
                    meeting.jioMeetData.hostToken
                  )
                }
                startIcon={<VideocamIcon />}
                disabled={!quorumMet}
                sx={{ px: 3 }}
              >
                {isStarting ? "Starting..." : "Show Meeting Details"}
              </Button>
            )}
            {showMeetingDetails && meetingDetails && (
              <Dialog
                open={showMeetingDetails}
                onClose={() => setShowMeetingDetails(false)}
                aria-labelledby="meeting-details-dialog-title"
              >
                <DialogTitle id="meeting-details-dialog-title">
                  Meeting Details
                  <IconButton
                    aria-label="copy"
                    onClick={copyToClipboard}
                    sx={{ ml: 1 }}
                    title="Copy to clipboard"
                  >
                    <ContentCopyIcon />
                  </IconButton>
                </DialogTitle>
                <DialogContent>
                  <DialogContentText>
                    <Typography variant="body1">
                      <strong>Meeting ID:</strong> {meetingDetails.meetingId}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Meeting Link:</strong>{" "}
                      {meetingDetails.meetingLink}
                    </Typography>
                    <Typography variant="body1">
                      <strong>Room PIN:</strong> {meetingDetails.roomPIN}
                    </Typography>
                  </DialogContentText>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setShowMeetingDetails(false)}>
                    Close
                  </Button>
                  {meetingDetails.meetingLink && (
                    <Button
                      variant="contained"
                      color="primary"
                      onClick={() =>
                        window.open(meetingDetails.meetingLink, "_blank")
                      }
                    >
                      Join Meeting
                    </Button>
                  )}
                </DialogActions>
              </Dialog>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Attendance Dialog */}
      <Dialog
        open={showAttendanceForm}
        onClose={() => {
          setShowAttendanceForm(false);
          stopCamera();
        }}
        maxWidth="sm"
        fullWidth
        disableBackdropClick
        disableEscapeKeyDown
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="h6">{strings.markAttendance}</Typography>
          <IconButton
            onClick={() => {
              setShowAttendanceForm(false);
              stopCamera();
            }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent>
          {/* Attendance Stats */}
          {attendanceStats && (
            <Box sx={{ mb: 4, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {strings.attendanceStats}
              </Typography>

              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 2,
                      position: "relative",
                      overflow: "hidden",
                      borderLeft: "4px solid",
                      borderColor: "info.main",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h4"
                        align="center"
                        color="info.main"
                        fontWeight="bold"
                      >
                        {attendanceStats.totalVoters || 0}
                      </Typography>
                      <Typography
                        variant="body2"
                        align="center"
                        color="text.secondary"
                      >
                        {strings.totalVoters}
                      </Typography>
                      <Box
                        position="absolute"
                        bottom={5}
                        right={5}
                        sx={{ opacity: 0.1 }}
                      >
                        <PeopleIcon sx={{ fontSize: 40 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 2,
                      position: "relative",
                      overflow: "hidden",
                      borderLeft: "4px solid",
                      borderColor: "primary.main",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h4"
                        align="center"
                        color="primary.main"
                        fontWeight="bold"
                      >
                        {attendanceStats.total}
                      </Typography>
                      <Typography
                        variant="body2"
                        align="center"
                        color="text.secondary"
                      >
                        {strings.totalRegistered}
                      </Typography>
                      <Box
                        position="absolute"
                        bottom={5}
                        right={5}
                        sx={{ opacity: 0.1 }}
                      >
                        <PeopleIcon sx={{ fontSize: 40 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 2,
                      position: "relative",
                      overflow: "hidden",
                      borderLeft: "4px solid",
                      borderColor: "success.main",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h4"
                        align="center"
                        color="success.main"
                        fontWeight="bold"
                      >
                        {attendanceStats.present}
                      </Typography>
                      <Typography
                        variant="body2"
                        align="center"
                        color="text.secondary"
                      >
                        {strings.present}
                      </Typography>
                      <Box
                        position="absolute"
                        bottom={5}
                        right={5}
                        sx={{ opacity: 0.1 }}
                      >
                        <CheckCircleIcon sx={{ fontSize: 40 }} />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Card
                    sx={{
                      height: "100%",
                      boxShadow: 2,
                      position: "relative",
                      overflow: "hidden",
                      borderLeft: "4px solid",
                      borderColor: "warning.main",
                    }}
                  >
                    <CardContent>
                      <Typography
                        variant="h4"
                        align="center"
                        color="warning.main"
                        fontWeight="bold"
                      >
                        {attendanceStats.quorum}
                      </Typography>
                      <Typography
                        variant="body2"
                        align="center"
                        color="text.secondary"
                      >
                        {strings.quorumRequired}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" gutterBottom>
                  {strings.attendanceProgress}:
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={
                    attendanceStats.quorum > 0
                      ? (attendanceStats.present / attendanceStats.quorum) * 100
                      : 0
                  }
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                  color={attendanceStats.quorumMet ? "success" : "primary"}
                />
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="caption" color="text.secondary">
                    {attendanceStats.present} / {attendanceStats.quorum}{" "}
                    {strings.attendeesNeeded}
                  </Typography>
                  <Chip
                    label={
                      attendanceStats.quorumMet
                        ? strings.quorumMet
                        : strings.quorumNotMet
                    }
                    color={attendanceStats.quorumMet ? "success" : "warning"}
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

          {/* Attendance Form */}
          <Box sx={{ mt: 2 }}>
            <Typography variant="h6" gutterBottom>
              {strings.verifyAttendee}
            </Typography>

            {attendanceMessage.text && (
              <Alert
                severity={attendanceMessage.type}
                sx={{ mb: 3 }}
                onClose={() => setAttendanceMessage({ type: "", text: "" })}
              >
                {attendanceMessage.text}
              </Alert>
            )}

            <TextField
              label={strings.voterIdLastFour}
              value={voterIdLastFour}
              onChange={(e) => {
                // Only allow digits and max 4 characters
                const value = e.target.value.replace(/\D/g, "").slice(0, 4);
                setVoterIdLastFour(value);
              }}
              fullWidth
              margin="normal"
              disabled={attendanceLoading}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              helperText={strings.enterLastFourDigits}
            />
            <Box sx={{ mt: 3, mb: 2 }}>
              <Typography variant="subtitle1" gutterBottom>
                {strings.faceVerification}
              </Typography>

              <Paper
                elevation={2}
                sx={{
                  position: "relative",
                  width: "100%",
                  aspectRatio: "4/3",
                  backgroundColor: "grey.100",
                  borderRadius: 2,
                  overflow: "hidden",
                  border: verificationState.faceDetected
                    ? "2px solid #4CAF50"
                    : "2px solid transparent",
                }}
              >
                <Box
                  sx={{ position: "relative", width: "100%", height: "100%" }}
                >
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      transform: "scaleX(-1)",
                      display: cameraActive ? "block" : "none",
                    }}
                  />
                  <canvas
                    ref={canvasRef}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      pointerEvents: "none",
                    }}
                  />

                  {!cameraActive && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                      }}
                    >
                      <CameraAltIcon
                        sx={{ fontSize: 60, color: "text.disabled", mb: 2 }}
                      />
                      <Button
                        variant="contained"
                        onClick={startCamera}
                        disabled={
                          attendanceLoading || voterIdLastFour.length !== 4
                        }
                      >
                        Start Camera
                      </Button>
                    </Box>
                  )}

                  {cameraActive && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 16,
                        left: 16,
                        zIndex: 1,
                      }}
                    >
                      <Stack direction="row" spacing={1}>
                        <VerificationChip
                          label="Blink"
                          verified={verificationState.blink.verified}
                          count={verificationState.blink.count}
                          required={VERIFICATION_THRESHOLDS.blink}
                        />
                        <VerificationChip
                          label="Movement"
                          verified={verificationState.movement.verified}
                          count={verificationState.movement.count}
                          required={VERIFICATION_THRESHOLDS.movement}
                        />
                      </Stack>
                    </Box>
                  )}

                  {activeFeedback && (
                    <Alert
                      severity="success"
                      sx={{
                        position: "absolute",
                        bottom: 16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "auto",
                      }}
                    >
                      {activeFeedback}
                    </Alert>
                  )}

                  {attendanceLoading && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: "rgba(0, 0, 0, 0.6)",
                        color: "white",
                        zIndex: 2,
                      }}
                    >
                      <CircularProgress
                        color="inherit"
                        size={60}
                        sx={{ mb: 2 }}
                      />
                      <Typography variant="body2">
                        {strings.verifyingFace}
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Paper>
            </Box>

            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}
            >
              {cameraActive ? (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={stopCamera}
                    disabled={attendanceLoading}
                  >
                    {strings.stopCamera}
                  </Button>

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={handleSubmitAttendance}
                    disabled={
                      attendanceLoading ||
                      !verificationState.blink.verified ||
                      !verificationState.movement.verified ||
                      voterIdLastFour.length !== 4
                    }
                    startIcon={<HowToRegIcon />}
                  >
                    {strings.verifyAttendance}
                  </Button>
                </>
              ) : (
                <></>
              )}
            </Box>
          </Box>
        </DialogContent>

        <DialogActions>
          <Button
            onClick={() => {
              setShowAttendanceForm(false);
              stopCamera();
            }}
          >
            {strings.close}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Meeting Details Dialog */}
      <Dialog
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: { borderRadius: 2 },
        }}
      >
        <DialogTitle sx={{ bgcolor: "primary.main", color: "white" }}>
          {strings.meetingDetails}
        </DialogTitle>
        <DialogContent sx={{ pt: 3 }}>
          {selectedMeeting && (
            <GramSabhaDetails meetingId={selectedMeeting} user={user} />
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setSelectedMeeting(null)} variant="contained">
            {strings.close}
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

const VerificationChip = ({ label, verified, count, required }) => (
  <Chip
    label={`${label}: ${count}/${required}`}
    color={verified ? "success" : "default"}
    variant={verified ? "filled" : "outlined"}
    icon={verified ? <CheckCircleIcon fontSize="small" /> : undefined}
    sx={{ flex: 1, maxWidth: 150, fontWeight: verified ? 600 : 400 }}
  />
);

export default TodaysMeetingsBanner;
