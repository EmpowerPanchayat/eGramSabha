import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useJoin } from "@jiomeet/core-template-web";
import { JMClient } from "@jiomeet/core-sdk-web";
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
  Slider,
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
  Tooltip,
  Checkbox
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
  SwitchCamera as SwitchCameraIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
} from "@mui/icons-material";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import StopIcon from "@mui/icons-material/Stop";
import {
  fetchActiveMeetings,
  updateGramSabhaStatus,
  startJioMeetRecording,
} from "../../api/gram-sabha";
import { useLanguage } from "../../utils/LanguageContext";
import GramSabhaDetails from "./GramSabhaDetails";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import * as faceapi from "face-api.js";
import STATUS_KEY_VALUE_MAP from "../../constants/issueStatus";
import { fetchIssueSummary, updateAgendaSummary } from '../../api/summary';
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import MeetingSlider from "../MeetingSlider";
import infra from "../../constants/infra";

const TodaysMeetingsBanner = ({ panchayatId, user }) => {
  const { language, strings } = useLanguage();
  const [activeMeetings, setActiveMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [attendanceStats, setAttendanceStats] = useState(null);
  const [showAttendanceForm, setShowAttendanceForm] = useState(false);
  const [voterIdLastFour, setVoterIdLastFour] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [loadingModels, setLoadingModels] = useState(false);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [showMeetingDetails, setShowMeetingDetails] = useState(false);
  const [meetingDetails, setMeetingDetails] = useState(null);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  let [meeting, setMeeting] = useState({});
  const [attendanceMessage, setAttendanceMessage] = useState({
    type: "",
    text: "",
  });
  const [platformConfig, setPlatformConfig] = useState({
    liveliness: true,
    blink_count: 2,
    movement_count: 5,
  });
  const [thresholds, setThresholds] = useState({
    blink: 2,
    movement: 5,
  });
  const thresholdsRef = useRef(thresholds);

  // Camera and face detection state
  const [cameraState, setCameraState] = useState("inactive");
  const [facingMode, setFacingMode] = useState("user");
  const [cameras, setCameras] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [sliderReady, setSliderReady] = useState(false);
  const { joinMeeting, publishLocalPeerConfig, isCallStarted } = useJoin();
  // Liveliness verification state
  const [verificationState, setVerificationState] = useState({
    faceDetected: false,
    blink: { verified: false, count: 0 },
    movement: { verified: false, count: 0 },
  });
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [showAgendaDialog, setShowAgendaDialog] = useState(false);
  const [allAgendaItems, setAllAgendaItems] = useState([]);
  const [selectedAgendaItems, setSelectedAgendaItems] = useState([]);
  const [loadingAgenda, setLoadingAgenda] = useState(false);
  const [confirmAgendaSubmitOpen, setConfirmAgendaSubmitOpen] = useState(false);
  const [currentMeetingIndex, setCurrentMeetingIndex] = useState(0);
  const [dragStartX, setDragStartX] = useState(0);
  const [dragCurrentX, setDragCurrentX] = useState(0);
  const [isDraggingBanner, setIsDraggingBanner] = useState(false);

  const faceMeshId = useRef(0);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sliderContainerRef = useRef(null);
  const faceMesh = useRef(null);
  const detectionState = useRef({
    previousLandmarks: null,
    movementHistory: [],
    baselineEAR: null,
    blinkStartTime: null,
  });
  const jmClient = new JMClient();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
  const INFRA = process.env.REACT_APP_INFRA || infra.jio;

  // Memoized thresholds for checks
  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  // Delay slider initialization
  useEffect(() => {
    if (cameraState === "active" && zoomLevel > 1) {
      const timer = setTimeout(() => setSliderReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setSliderReady(false);
    }
  }, [cameraState, zoomLevel]);

  // Initialize face detection models and camera devices
  useEffect(() => {
    const initializeFaceDetection = async () => {
      try {
        setLoadingModels(true);

        const MODEL_URL =
          "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);

        faceMesh.current = new FaceMesh({
          locateFile: (file) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`,
        });

        faceMesh.current.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMesh.current.onResults(handleFaceResults);
        setModelsLoaded(true);
      } catch (error) {
        console.error("FaceMesh initialization error:", error);
        setAttendanceMessage({
          type: "error",
          text: "Face detection failed to initialize",
        });
      } finally {
        setLoadingModels(false);
      }
    };

    initializeFaceDetection();
    checkCameraDevices();
    return () => stopCamera();
    // eslint-disable-next-line
  }, []);

  // Camera device management
  const checkCameraDevices = useCallback(async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      tempStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      if (videoDevices.length === 0) {
        throw new Error("No video input devices found");
      }

      const categorized = { user: null, environment: null };

      for (const device of videoDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: device.deviceId } },
          });
          const track = stream.getVideoTracks()[0];
          const facingMode = track.getSettings().facingMode || "user";

          if (facingMode === "user" && !categorized.user) {
            categorized.user = device;
          } else if (
            (facingMode === "environment" || facingMode === "back") &&
            !categorized.environment
          ) {
            categorized.environment = device;
          }

          track.stop();
          if (categorized.user && categorized.environment) break;
        } catch (err) {
          console.warn("Error checking facingMode for device:", device.label);
        }
      }

      const filtered = [categorized.user, categorized.environment].filter(
        Boolean
      );
      setCameras(filtered);
      setSelectedCameraIndex(0);
    } catch (err) {
      console.error("Failed to enumerate cameras:", err);
      setAttendanceMessage({
        type: "error",
        text: "Camera access issue. Please retry.",
      });
    }
  }, []);

  // Video transform
  const getVideoTransform = useCallback(() => {
    const transforms = [];
    const stream = videoRef.current?.srcObject;
    const track = stream?.getVideoTracks?.()[0];
    const facingMode = track?.getSettings?.().facingMode;

    if (facingMode === "user") transforms.push("scaleX(-1)");
    if (zoomLevel > 1) {
      transforms.push(`scale(${zoomLevel})`);
      transforms.push(
        `translate(${cameraPosition.x * 100}%, ${cameraPosition.y * 100}%)`
      );
    }
    return transforms.join(" ");
  }, [zoomLevel, cameraPosition]);

  // Face detection handlers
  const drawFaceOutline = useCallback(
    (landmarks) => {
      if (!canvasRef.current || !landmarks) return;

      const ctx = canvasRef.current.getContext("2d");
      const { width, height } = canvasRef.current;

      ctx.save();
      if (facingMode === "user") {
        ctx.translate(width, 0);
        ctx.scale(-1, 1);
      }

      if (zoomLevel > 1) {
        ctx.translate(width * 0.5, height * 0.5);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(
          -width * 0.5 + cameraPosition.x * width,
          -height * 0.5 + cameraPosition.y * height
        );
      }

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
    },
    [facingMode, zoomLevel, cameraPosition]
  );

  const detectBlink = useCallback((landmarks) => {
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
  }, []);

  const detectMacroMovement = useCallback((currentLandmarks) => {
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
  }, []);

  const showTemporaryFeedback = useCallback((message) => {
    setActiveFeedback(message);
    setTimeout(() => setActiveFeedback(null), 2000);
  }, []);

  const updateCheck = useCallback(
    (check, threshold, message) => {
      if (check.verified) return check;
      const newCount = check.count + 1;
      if (newCount >= threshold) {
        if (platformConfig.liveliness) {
          showTemporaryFeedback(message);
        }
        return { verified: true, count: newCount };
      }
      return { ...check, count: newCount };
    },
    [platformConfig.liveliness, showTemporaryFeedback]
  );

  const updateVerificationState = useCallback(
    ({ blink, movement }) => {
      setVerificationState((prev) => ({
        ...prev,
        blink: blink
          ? updateCheck(
              prev.blink,
              thresholdsRef.current.blink,
              "Blink verified"
            )
          : prev.blink,
        movement: movement
          ? updateCheck(
              prev.movement,
              thresholdsRef.current.movement,
              "Movement verified"
            )
          : prev.movement,
      }));
    },
    [updateCheck]
  );

  const handleFaceResults = useCallback(
    (results) => {
      if (!canvasRef.current || !results.multiFaceLandmarks) {
        setVerificationState((prev) => ({ ...prev, faceDetected: false }));
        return;
      }

      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

      const faceLandmarks = results.multiFaceLandmarks[0];
      if (!faceLandmarks || faceLandmarks.length < 468) {
        setVerificationState((prev) => ({ ...prev, faceDetected: false }));
        return;
      }

      drawFaceOutline(faceLandmarks);

      // If liveliness is false, auto-verify both checks and skip notifications
      if (!platformConfig.liveliness) {
        setVerificationState((prev) => ({
          ...prev,
          faceDetected: true,
          blink: { verified: true, count: thresholdsRef.current.blink },
          movement: { verified: true, count: thresholdsRef.current.movement },
        }));
        return;
      }

      const livelinessChecks = {
        blink: detectBlink(faceLandmarks),
        movement: detectMacroMovement(faceLandmarks),
      };

      updateVerificationState(livelinessChecks);
      setVerificationState((prev) => ({ ...prev, faceDetected: true }));
    },
    [
      drawFaceOutline,
      detectBlink,
      detectMacroMovement,
      platformConfig.liveliness,
      updateVerificationState,
    ]
  );

  const resetVerification = useCallback(() => {
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
  }, []);

  const resetCameraView = useCallback(() => {
    setZoomLevel(1);
    setCameraPosition({ x: 0, y: 0 });
  }, []);

  // Camera controls
  const startCamera = useCallback(async () => {
    if (!user || !modelsLoaded || cameras.length === 0) {
      setAttendanceMessage({
        type: "error",
        text: !user
          ? "Select a member first"
          : "Models not loaded or no camera found",
      });
      return;
    }

    try {
      setCameraState("starting");
      resetVerification();

      const deviceId = cameras[selectedCameraIndex]?.deviceId;
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: false,
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      const processFrame = (id) => {
        const loop = async () => {
          try {
            if (faceMesh.current?.send && videoRef.current?.readyState >= 2) {
              await faceMesh.current.send({ image: videoRef.current });
            }
          } catch (e) {
            console.error("FaceMesh send error:", e);
          }
          if (faceMeshId.current === id) requestAnimationFrame(loop);
        };
        loop();
      };

      const id = faceMeshId.current;
      processFrame(id);
      setCameraState("active");
    } catch (error) {
      console.error("startCamera error:", error);
      setCameraState("error");
      setAttendanceMessage({
        type: "error",
        text: "Camera failed to start. Check permissions.",
      });
    }
  }, [user, modelsLoaded, cameras, selectedCameraIndex, resetVerification]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraState("inactive");
    resetVerification();
    resetCameraView();
  }, [resetVerification, resetCameraView]);

  const switchCamera = useCallback(() => {
    if (cameras.length <= 1) {
      setAttendanceMessage({
        type: "error",
        text: "Only one camera detected.",
      });
      return;
    }
    const newIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(newIndex);
    stopCamera();
    setTimeout(startCamera, 300);
  }, [cameras, selectedCameraIndex, stopCamera, startCamera]);

  const handleZoom = useCallback((direction) => {
    const step = 0.1;
    setZoomLevel((prev) => {
      const newZoom =
        direction === "in"
          ? Math.min(prev + step, 2)
          : Math.max(prev - step, 1);
      return newZoom;
    });
  }, []);

  const handleSliderChange = useCallback((event, newValue) => {
    if (!sliderContainerRef.current) return;
    setZoomLevel(newValue);
  }, []);

  const handlePanStart = useCallback(
    (e) => {
      if (zoomLevel <= 1 || !containerRef.current) return;
      setIsDragging(true);
    },
    [zoomLevel]
  );

  const handlePanMove = useCallback(
    (e) => {
      if (!isDragging || zoomLevel <= 1 || !containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

      const maxOffset = (zoomLevel - 1) / (2 * zoomLevel);
      setCameraPosition({
        x: Math.max(-maxOffset, Math.min(maxOffset, x - 0.5)),
        y: Math.max(-maxOffset, Math.min(maxOffset, y - 0.5)),
      });
    },
    [isDragging, zoomLevel]
  );

  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Load today's meetings
  useEffect(() => {
    if (panchayatId) {
      loadTodaysMeetings();
    }
    // eslint-disable-next-line
  }, [panchayatId]);

  const loadTodaysMeetings = useCallback(async () => {
    if (!panchayatId) return;

    try {
      setLoading(true);
      setError("");

      const data = await fetchActiveMeetings(panchayatId);
      // Filter out meetings with status "CONCLUDED"
      const activeMeetings = data.filter(
        (meeting) => meeting.status !== "CONCLUDED"
      );
      setActiveMeetings(activeMeetings);
    } catch (error) {
      console.error("Error loading meetings:", error);
      setError(error.message || "Failed to load today's meetings");
    } finally {
      setLoading(false);
    }
  }, [panchayatId]);

  useEffect(() => {
    const loadAttendance = async () => {
        await loadAttendanceStats();
    };
    loadAttendance();
  }, [activeMeetings]);

  const loadAttendanceStats = useCallback(
    async () => {
      try {
        const allAttendanceStats = {};
        activeMeetings.forEach((meeting) => {
        if (meeting.attendanceStats) {
          const data = meeting.attendanceStats;
          allAttendanceStats[meeting._id] = {
          total: data.totalRegistered || 0,
          totalVoters: data.totalVoters || 0,
          present: data.present || 0,
          quorum: data.quorumRequired || 0,
          quorumMet: (data.present || 0) >= (data.quorumRequired || 0),
        };
      }
    });

    setAttendanceStats(allAttendanceStats);
      } catch (error) {
        console.error("Error loading attendance stats:", error);
        setAttendanceStats({});
      }
    },
    [API_URL, activeMeetings]
  );

  const handleStartRecording = useCallback(
    async (gramSabhaId, jiomeetId, meetingLink, roomPIN, hostToken) => {
      try {
        await updateGramSabhaStatus(gramSabhaId, "IN_PROGRESS");
        await loadTodaysMeetings();
      } catch (_) {
        setSnackbarMessage("Failed to start meeting. Please try again.");
        setSnackbarOpen(true);
        return;
      }
      setMeetingDetails({
        jiomeetId,
        meetingLink,
        roomPIN,
        hostToken,
        gramSabhaId,
      });
      setShowMeetingDetails(true);
    },
    [loadTodaysMeetings, activeMeetings]
  );

  const copyToClipboard = useCallback(() => {
    const detailsText = `Meeting ID: ${meetingDetails.jiomeetId}
  Meeting Link: ${meetingDetails.meetingLink}
  Room PIN: ${meetingDetails.roomPIN}`;

    navigator.clipboard
      .writeText(detailsText)
      .then(() => {
        setSnackbarMessage("Meeting details copied to clipboard");
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error("Failed to copy: ", err);
      });
  }, [meetingDetails]);

  const handleEndMeeting = useCallback(async () => {
    if (!meetingDetails?.gramSabhaId) return;
    try {
      setLoadingAgenda(true);
      const res = await fetch(`${API_URL}/gram-sabha/${meetingDetails.gramSabhaId}`);
      const agenda = (await res.json()).agenda || [];
      setAllAgendaItems(agenda || []);
      setSelectedAgendaItems(agenda || []);
      setShowAgendaDialog(true);
    } catch (_) {
      setSnackbarMessage("Failed to load agenda items.");
      setSnackbarOpen(true);
    } finally {
      setLoadingAgenda(false);
    }
  }, [meetingDetails]);

  const executeAgendaSubmit = async () => {
    try {
      const selectedIds = new Set(selectedAgendaItems.map((item) => item._id));
      const itemsToResummarize = [];

      await Promise.all(
        allAgendaItems.map(async (item) => {
          const isSelected = selectedIds.has(item._id);
          const newStatus = isSelected
            ? STATUS_KEY_VALUE_MAP["statusDiscussedInGramSabha"]
            : STATUS_KEY_VALUE_MAP["statusReported"];

          if (!isSelected) {
            const agendaItemToResummarize = {
            ...item,
            linkedIssues: item.linkedIssues?.map(issue => issue._id),
            };
            itemsToResummarize.push(agendaItemToResummarize);
          }

          if (item.linkedIssues && item.linkedIssues.length > 0) {
            await fetch(`${API_URL}/issues/update-status`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
              body: JSON.stringify({
                issueIds: item.linkedIssues,
                status: newStatus,
              }),
            });
          }
        })
      );

    // Re-add deselected agenda items to the summary without overwriting others
    if (itemsToResummarize.length > 0) {
      const existingSummary = await fetchIssueSummary(panchayatId);
      const existingAgendaItems = existingSummary?.summary?.agendaItems || [];

      // Merge and deduplicate using a Map
      const agendaMap = new Map();
      for (const item of existingAgendaItems) {
        agendaMap.set(item._id, item);
      }
      for (const item of itemsToResummarize) {
        agendaMap.set(item._id, item);
      }

      const mergedAgendaItems = Array.from(agendaMap.values());
      await updateAgendaSummary(panchayatId, mergedAgendaItems);
    }

      await updateGramSabhaStatus(meetingDetails.gramSabhaId, "CONCLUDED");
      await loadTodaysMeetings();
      setShowAgendaDialog(false);
      setShowMeetingDetails(false);
      setConfirmAgendaSubmitOpen(false);
    } catch (err) {
      console.error("Error updating agenda/issue status:", err);
      setSnackbarMessage("Failed to submit agenda updates.");
      setSnackbarOpen(true);
      setConfirmAgendaSubmitOpen(false);
    }
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

  // Fetch only settings.camera for config before opening attendance dialog
  const fetchPlatformConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/platform-configurations/camera`);
      const cameraSettings = await res.json();
      setPlatformConfig({
        liveliness: cameraSettings?.value?.liveliness?.attendance ?? true,
        blink_count: cameraSettings?.value?.blink_count?.attendance ?? 2,
        movement_count: cameraSettings?.value?.movement_count?.attendance ?? 5,
      });
      setThresholds({
        blink: cameraSettings?.value?.blink_count?.attendance ?? 2,
        movement: cameraSettings?.value?.movement_count?.attendance ?? 5,
      });
    } catch (err) {
      setPlatformConfig({
        liveliness: true,
        blink_count: 2,
        movement_count: 5,
      });
      setThresholds({
        blink: 2,
        movement: 5,
      });
    }
  }, [API_URL]);

  // --- MODIFIED handleMarkAttendance ---
  const handleMarkAttendance = useCallback(
    async (meetingId) => {
      setMeeting(activeMeetings.find((m) => m._id === meetingId));
      await fetchPlatformConfig();
      setVoterIdLastFour("");
      setAttendanceMessage({ type: "", text: "" });
      await loadAttendanceStats();
      setShowAttendanceForm(true);
    },
    [fetchPlatformConfig, loadAttendanceStats, activeMeetings]
  );

  const handleJoinMeeting = async (meetingDetails) => {
    try {
      const hostUser = {
        displayName: "SDKHostUser",
        role: "host",
        token: meetingDetails.hostToken,
      };

      // Step 1: Join as host using SDK
      const meetingData = {
        meetingId: meetingDetails.jiomeetId,
        meetingPin: meetingDetails.roomPIN,
        userDisplayName: hostUser.displayName,
        config: {
          userRole: hostUser.role,
          token: hostUser.token,
        },
      };

      const meetingUrl = await jmClient.joinMeeting(meetingData);

      // Step 2: Start recording
      await jmClient.startRecording();
      console.log("Recording started");

      // Step 3: Poll every 2s for other participants (max wait 30s)
      let attempts = 0;
      const maxAttempts = 15;
      const checkInterval = 2000;

      const intervalId = setInterval(async () => {
        try {
          const remotePeers = jmClient.remotePeers;

          console.log("Participants in meeting:", remotePeers);

          if (remotePeers.length > 0) {
            clearInterval(intervalId);

            // Step 4: Leave the meeting once someone else joins
            await jmClient.leaveMeeting();
          } else if (++attempts >= maxAttempts) {
            clearInterval(intervalId);
            console.warn("Timeout: No participant joined within 30 seconds.");
          }
        } catch (pollErr) {
          clearInterval(intervalId);
          console.error("Error checking participants:", pollErr);
        }
      }, checkInterval);
    } catch (error) {
      console.error("Error during meeting flow:", error);
      alert(
        "Meeting failed. Reason: " + (error.message || "Unknown error occurred")
      );
    }
    window.open(meetingDetails.meetingLink, "_blank");
    const result = await startJioMeetRecording(
      meetingDetails.jiomeetId,
      meetingDetails.roomPIN
    );
    if (!result.success) {
      throw new Error(result.message || "Recording start failed");
    }

    const historyId = result?.data?.historyId;
    console.log("Recording started. History ID:", historyId);
  };

  const handleSubmitAttendance = useCallback(async (meeting) => {
    if (!voterIdLastFour || voterIdLastFour.length !== 4) {
      setAttendanceMessage({
        type: "error",
        text: "Please enter the last 4 digits of the Voter ID.",
      });
      return;
    }

    // Only require checks if liveliness is true
    if (
      platformConfig.liveliness &&
      (!verificationState.blink.verified ||
        !verificationState.movement.verified)
    ) {
      setAttendanceMessage({
        type: "error",
        text: "Complete both verification checks (blink and movement)",
      });
      return;
    }

    try {
      setAttendanceLoading(true);

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
        throw new Error("Face not recognized clearly");
      }

      const faceDescriptor = Array.from(detections.descriptor);

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");

      if (zoomLevel > 1) {
        ctx.translate(canvas.width * 0.5, canvas.height * 0.5);
        ctx.scale(zoomLevel, zoomLevel);
        ctx.translate(
          -canvas.width * 0.5 + cameraPosition.x * canvas.width,
          -canvas.height * 0.5 + cameraPosition.y * canvas.height
        );
      }
      ctx.drawImage(videoRef.current, 0, 0);

      const imageDataURL = canvas.toDataURL("image/jpeg");

      const response = await fetch(
        `${API_URL}/gram-sabha/${meeting._id}/mark-attendance`,
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

      setAttendanceMessage({
        type: "success",
        text: "Attendance marked successfully!",
      });

      await loadAttendanceStats();
      setVoterIdLastFour("");
      stopCamera();

      if (
        attendanceStats[meeting._id]?.present + 1 >= attendanceStats[meeting._id]?.quorum &&
        !attendanceStats[meeting._id]?.quorumMet
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
  }, [
    voterIdLastFour,
    platformConfig.liveliness,
    verificationState,
    zoomLevel,
    cameraPosition,
    API_URL,
    activeMeetings,
    panchayatId,
    attendanceStats,
    loadAttendanceStats,
    stopCamera,
    loadTodaysMeetings,
  ]);

  if (loading && activeMeetings.length === 0) {
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

  if (activeMeetings.length === 0) {
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

  meeting = activeMeetings[currentMeetingIndex];

  return (
    <Box sx={{ mb: 3, width: "100%", display: "flex", flexDirection: "column" }}>
        <CardHeader
          sx={{
            bgcolor: "primary.main",
            color: "white",
            py: 1,
          }}
          title={
            <Typography variant="h3" color="white">
              {strings.activeMeetings}
            </Typography>
          }
          disableTypography
        />

      {/* Render all banners side by side, but only show one at a time */}
      <MeetingSlider
        meetings={activeMeetings}
        onMarkAttendance={handleMarkAttendance}
        onShowMeetingDetails={handleStartRecording}
        isStarting={isStarting}
        attendanceStats={attendanceStats}
        setCurrentMeetingIndex={setCurrentMeetingIndex}
      />

      {/* Meeting Details Dialog */}
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
              {INFRA && INFRA.toUpperCase() === infra.jio && (
              <>
                <Typography variant="body1">
                  <strong>Meeting ID:</strong> {meetingDetails.jiomeetId}
                </Typography>
                <Typography variant="body1">
                  <strong>Room PIN:</strong> {meetingDetails.roomPIN}
                </Typography>
              </>
              )}
              <Typography variant="body1">
                <strong>Meeting Link:</strong> {meetingDetails.meetingLink}
              </Typography>
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowMeetingDetails(false)}>Close</Button>
            <Button variant="outlined" color="error" onClick={handleEndMeeting}>
              End Meeting
            </Button>
              {meetingDetails?.meetingLink && (
                INFRA.toUpperCase() === infra.jio ? (
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleJoinMeeting(meetingDetails)}
                  >
                    Join Meeting
                  </Button>
                ) : (
                  <Button
                    variant="contained"
                    color="primary"
                    component="a"
                    href={meetingDetails.meetingLink}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Join Meeting
                  </Button>
                )
              )}
          </DialogActions>
        </Dialog>
      )}

      {meeting && showAttendanceForm && (
      <Dialog
        open={showAttendanceForm}
        onClose={() => {
          setShowAttendanceForm(false);
          stopCamera();
        }}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <Typography variant="body1">{strings.markAttendance}</Typography>
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
          {attendanceStats[meeting._id] && (
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
                        {attendanceStats[meeting._id]?.totalVoters || 0}
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
                        {attendanceStats[meeting._id]?.total}
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
                        {attendanceStats[meeting._id]?.present}
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
                        {attendanceStats[meeting._id]?.quorum}
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
                    attendanceStats[meeting._id]?.quorum > 0
                      ? Math.min(
                          (attendanceStats[meeting._id]?.present / attendanceStats[meeting._id]?.quorum) *
                            100,
                          100
                        )
                      : 0
                  }
                  sx={{ height: 8, borderRadius: 4, mb: 1 }}
                  color={attendanceStats[meeting._id]?.quorumMet ? "success" : "primary"}
                />
                <Box
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                >
                  <Typography variant="caption" color="text.secondary">
                    {attendanceStats[meeting._id]?.present} {strings.attendeesPresent} (
                    {strings.quorumIs} {attendanceStats[meeting._id]?.quorum})
                  </Typography>
                  <Chip
                    label={
                      attendanceStats[meeting._id]?.quorumMet
                        ? strings.quorumMet
                        : strings.quorumNotMet
                    }
                    color={attendanceStats[meeting._id]?.quorumMet ? "success" : "warning"}
                    size="small"
                  />
                </Box>
              </Box>
            </Box>
          )}

          <Divider sx={{ my: 3 }} />

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
                  ref={containerRef}
                  sx={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                    cursor:
                      zoomLevel > 1
                        ? isDragging
                          ? "grabbing"
                          : "grab"
                        : "default",
                  }}
                  onMouseDown={handlePanStart}
                  onMouseMove={handlePanMove}
                  onMouseUp={handlePanEnd}
                  onMouseLeave={handlePanEnd}
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
                      transform: getVideoTransform(),
                      transformOrigin: "center center",
                      display: cameraState === "active" ? "block" : "none",
                      transition: "transform 0.2s ease",
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

                  {cameraState !== "active" && (
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
                      {cameraState === "active" && (
                        <Box
                          sx={{
                            position: "absolute",
                            bottom: 8,
                            left: 8,
                            right: 8,
                            textAlign: "center",
                            bgcolor: "rgba(255, 255, 255, 0.7)",
                            borderRadius: 1,
                            p: 0.5,
                          }}
                        >
                          <Typography variant="body2" color="text.secondary">
                            {`Using: ${
                              facingMode === "user"
                                ? "Front-facing"
                                : "Back-facing"
                            } camera (${cameras.length} available)`}
                          </Typography>
                        </Box>
                      )}

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

                  {cameraState === "active" && (
                    <>
                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
                          zIndex: 1,
                        }}
                      >
                        {cameras.length > 1 && (
                          <Tooltip title="Switch Camera">
                            <IconButton
                              color="primary"
                              onClick={switchCamera}
                              sx={{
                                bgcolor: "background.paper",
                                "&:hover": { bgcolor: "action.hover" },
                              }}
                            >
                              <SwitchCameraIcon />
                            </IconButton>
                          </Tooltip>
                        )}

                        <Tooltip title="Zoom In">
                          <IconButton
                            color="primary"
                            onClick={() => handleZoom("in")}
                            disabled={zoomLevel >= 2}
                            sx={{
                              bgcolor: "background.paper",
                              "&:hover": { bgcolor: "action.hover" },
                            }}
                          >
                            <ZoomInIcon />
                          </IconButton>
                        </Tooltip>

                        <Tooltip title="Zoom Out">
                          <IconButton
                            color="primary"
                            onClick={() => handleZoom("out")}
                            disabled={zoomLevel <= 1}
                            sx={{
                              bgcolor: "background.paper",
                              "&:hover": { bgcolor: "action.hover" },
                            }}
                          >
                            <ZoomOutIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>

                      {sliderReady && (
                        <Box
                          ref={sliderContainerRef}
                          sx={{
                            position: "absolute",
                            bottom: 8,
                            left: 8,
                            right: 8,
                            px: 2,
                            zIndex: 1,
                          }}
                        >
                          <Slider
                            value={zoomLevel}
                            min={1}
                            max={2}
                            step={0.1}
                            onChange={handleSliderChange}
                            sx={{
                              color: "white",
                              "& .MuiSlider-thumb": {
                                width: 16,
                                height: 16,
                              },
                            }}
                          />
                        </Box>
                      )}
                    </>
                  )}

                  {cameraState === "active" && platformConfig.liveliness && (
                    <Box
                      sx={{
                        position: "absolute",
                        top: 8,
                        left: 8,
                        zIndex: 1,
                      }}
                    >
                      <Stack direction="row" spacing={1}>
                        <VerificationChip
                          label="Blink"
                          verified={verificationState.blink.verified}
                          count={verificationState.blink.count}
                          required={thresholds.blink}
                        />
                        <VerificationChip
                          label="Movement"
                          verified={verificationState.movement.verified}
                          count={verificationState.movement.count}
                          required={thresholds.movement}
                        />
                      </Stack>
                    </Box>
                  )}

                  {activeFeedback && platformConfig.liveliness && (
                    <Alert
                      severity="success"
                      sx={{
                        position: "absolute",
                        bottom: 16,
                        left: "50%",
                        transform: "translateX(-50%)",
                        width: "auto",
                        zIndex: 1,
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
            {cameras.length > 0 && (
              <Paper
                variant="outlined"
                sx={{ p: 2, bgcolor: "grey.50", mt: 2 }}
              >
                <Typography variant="body2" color="text.secondary">
                  Current Camera:{" "}
                  {selectedCameraIndex === 0 ? "Front-facing" : "Back-facing"}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Available Cameras: {cameras.length}
                </Typography>
              </Paper>
            )}
            <Box
              sx={{ display: "flex", justifyContent: "space-between", mt: 3 }}
            >
              {cameraState === "active" && (
                <>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={stopCamera}
                    disabled={attendanceLoading}
                    startIcon={<StopIcon />}
                  >
                    Stop Camera
                  </Button>

                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => handleSubmitAttendance(meeting)}
                    disabled={
                      attendanceLoading ||
                      voterIdLastFour.length !== 4 ||
                      (platformConfig.liveliness &&
                        (!verificationState.blink.verified ||
                          !verificationState.movement.verified))
                    }
                    startIcon={<HowToRegIcon />}
                  >
                    {strings.verifyAttendance}
                  </Button>
                </>
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
      )}

      {/* Meeting Details Dialog */}
      <Dialog
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        maxWidth="md"
        fullWidth
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

      <Dialog open={showAgendaDialog} onClose={() => setShowAgendaDialog(false)} maxWidth="md" fullWidth>
      <DialogTitle>{strings.agenda || "Agenda Items"}</DialogTitle>
      <DialogContent>
        {loadingAgenda ? (
          <Box display="flex" justifyContent="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              {strings.selectAgendaDiscussed}
            </Typography>
            <Paper variant="outlined" sx={{ p: 2 }}>
              {allAgendaItems.map((item, index) => {
                const isSelected = selectedAgendaItems.some((s) => s._id === item._id);
                return (
                  <Box
                    key={item._id || index}
                    sx={{
                      p: 2,
                      mb: 1,
                      border: "1px solid #e0e0e0",
                      borderRadius: 1,
                      backgroundColor: isSelected ? "#e3f2fd" : "#fafafa",
                      cursor: "pointer",
                      "&:hover": {
                        backgroundColor: isSelected ? "#bbdefb" : "#f5f5f5",
                      },
                    }}
                    onClick={() => {
                      setSelectedAgendaItems((prev) =>
                        isSelected
                          ? prev.filter((s) => s._id !== item._id)
                          : [...prev, item]
                      );
                    }}
                  >
                    <Box display="flex" alignItems="flex-start">
                      <Checkbox checked={isSelected} sx={{ mt: 0 }} />
                      <Box sx={{ ml: 1, flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {getMultilingualText(item, "title") || `Agenda Item ${index + 1}`}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {getMultilingualText(item, "description") || strings.noDescription}
                        </Typography>
                        {item.linkedIssues?.length > 0 && (
                          <Typography variant="caption" color="primary" sx={{ mt: 0.5, display: "block" }}>
                            📋 {item.linkedIssues.length} linked issue{item.linkedIssues.length !== 1 ? "s" : ""}
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
                <Typography variant="body2" color="success.main" fontWeight="medium">
                  ✅ {selectedAgendaItems.length} item
                  {selectedAgendaItems.length !== 1 ? "s" : ""} selected
                </Typography>
              </Box>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => setShowAgendaDialog(false)}>{strings.close}</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setConfirmAgendaSubmitOpen(true)}
          disabled={loadingAgenda}
        >
          {strings.submit}
        </Button>
      </DialogActions>
    </Dialog>

      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />

      <Dialog
        open={confirmAgendaSubmitOpen}
        onClose={() => setConfirmAgendaSubmitOpen(false)}
      >
        <DialogTitle>{strings.confirmSubmission}</DialogTitle>
        <DialogContent>
          <Typography>
            {strings.agendaDiscussedConfirmation}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmAgendaSubmitOpen(false)}>
            {strings.cancel}
          </Button>
          <Button
            onClick={executeAgendaSubmit}
            color="primary"
            variant="contained"
          >
            {strings.yesSubmit}
          </Button>
        </DialogActions>
      </Dialog>
      <style>
        {`
        @keyframes slideInLeft {
          from { transform: translateX(100%); opacity: 0.3; }
          to { transform: translateX(0); opacity: 1; }
        }

        @keyframes slideInRight {
          from { transform: translateX(-100%); opacity: 0.3; }
          to { transform: translateX(0); opacity: 1; }
        }
        `}
      </style>
    </Box>
  );
};

const VerificationChip = React.memo(({ label, verified, count, required }) => (
  <Chip
    label={`${label}: ${count}/${required}`}
    color={verified ? "success" : "default"}
    variant={verified ? "filled" : "outlined"}
    icon={verified ? <CheckCircleIcon fontSize="small" /> : undefined}
    sx={{
      flex: 1,
      maxWidth: 150,
      fontWeight: verified ? 600 : 400,
      backgroundColor: !verified ? "rgba(255, 255, 255, 0.3)" : undefined,
      borderColor: !verified ? "rgba(255, 255, 255, 0.3)" : undefined,
    }}
  />
));

export default TodaysMeetingsBanner;
