import React, { useState, useRef, useEffect, useCallback } from "react";
import * as faceapi from "face-api.js";
import {
  Box,
  Typography,
  Button,
  Container,
  Alert,
  CircularProgress,
  Card,
  Stack,
  CardContent,
  Paper,
  Grid,
  Chip,
  TextField,
  Slider,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  CameraAlt as CameraAltIcon,
  Face as FaceIcon,
  CheckCircle as CheckCircleIcon,
  PhotoCamera as PhotoCameraIcon,
  AccountBalance as AccountBalanceIcon,
  AccountCircle as AccountCircleIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  SwitchCamera as SwitchCameraIcon,
} from "@mui/icons-material";
import PanchayatSelector from "../components/PanchayatSelector";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useLanguage } from "../utils/LanguageContext";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

const CitizenLoginView = ({ onLogin }) => {
  const { strings } = useLanguage();
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selectedPanchayat, setSelectedPanchayat] = useState("");
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [voterIdLastFour, setVoterIdLastFour] = useState("");
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [sliderReady, setSliderReady] = useState(false);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [activeFeedback, setActiveFeedback] = useState(null);

  const [verificationState, setVerificationState] = useState({
    faceDetected: false,
    blink: { verified: false, count: 0 },
    movement: { verified: false, count: 0 },
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sliderContainerRef = useRef(null);
  const faceMesh = useRef(null);
  const camera = useRef(null);
  const isMountedRef = useRef(true);
  const faceMeshId = useRef(0);
  const detectionState = useRef({
    previousLandmarks: null,
    movementHistory: [],
    baselineEAR: null,
    blinkStartTime: null,
  });

  const VERIFICATION_THRESHOLDS = {
    blink: 4,
    movement: 5,
  };

  useEffect(() => {
    isMountedRef.current = true;
    const initialize = async () => {
      await initializeFaceMesh();
      await checkCameraDevices();
    };
    initialize();
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []);

  useEffect(() => {
    if (isCameraActive && zoomLevel > 1) {
      const timer = setTimeout(() => setSliderReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setSliderReady(false);
    }
  }, [isCameraActive, zoomLevel]);

  useEffect(() => {
    const initializeCamera = async () => {
      if (!isCameraActive || !videoRef.current) return;

      try {
        const deviceId = cameras[selectedCameraIndex]?.deviceId;
        if (!deviceId) throw new Error("No camera device found");

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: deviceId } },
        });

        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        // Initialize FaceMesh and processing
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

        const processFrame = (id) => {
          const loop = async () => {
            try {
              if (videoRef.current && videoRef.current.readyState >= 2) {
                await faceMesh.current.send({ image: videoRef.current });
              }
            } catch (e) {
              console.error("FaceMesh send error:", e);
            }

            if (id === faceMeshId.current) {
              requestAnimationFrame(loop);
            }
          };
          loop();
        };

        faceMeshId.current++;
        processFrame(faceMeshId.current);
      } catch (error) {
        console.error("Error accessing camera:", error);
        setIsCameraActive(false);
        if (
          error.name === "NotAllowedError" ||
          error.name === "PermissionDeniedError"
        ) {
          setCameraPermissionDenied(true);
          setError(strings.cameraAccessDenied);
        } else {
          setError(`${strings.cameraError}: ${error.message}`);
        }
      }
    };

    initializeCamera();
  }, [isCameraActive, cameras, selectedCameraIndex, strings]);

  const checkCameraDevices = async () => {
    try {
      const tempStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      tempStream.getTracks().forEach((t) => t.stop());

      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === "videoinput");

      const categorized = { user: null, environment: null };

      for (const device of videoDevices) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: device.deviceId } },
          });
          const track = stream.getVideoTracks()[0];
          const facingMode = track.getSettings().facingMode;

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
      setError("Camera access issue. Please retry.");
    }
  };

  const initializeFaceMesh = async () => {
    try {
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

      const MODEL_URL =
        "https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);

      setModelsLoaded(true);
    } catch (error) {
      console.error("Model initialization error:", error);
      setError(strings.errorLoadingModels);
    }
  };

  const getVideoTransform = useCallback(() => {
    const transforms = [];

    try {
      const stream = videoRef.current?.srcObject;
      const track = stream?.getVideoTracks?.()[0];
      const facingMode = track?.getSettings?.().facingMode;

      const isFront = facingMode === "user";
      if (isFront) transforms.push("scaleX(-1)");
    } catch (e) {
      console.warn("Unable to determine facing mode, skipping mirror.");
    }

    if (zoomLevel > 1) {
      transforms.push(`scale(${zoomLevel})`);
      transforms.push(
        `translate(${cameraPosition.x * 100}%, ${cameraPosition.y * 100}%)`
      );
    }

    return transforms.join(" ");
  }, [zoomLevel, cameraPosition]);

  const handleFaceResults = useCallback((results) => {
    if (
      !isMountedRef.current ||
      !canvasRef.current ||
      !results.multiFaceLandmarks
    ) {
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

    const livelinessChecks = {
      blink: detectBlink(faceLandmarks),
      movement: detectMacroMovement(faceLandmarks),
    };

    updateVerificationState(livelinessChecks);
    setVerificationState((prev) => ({ ...prev, faceDetected: true }));
  }, []);

  const drawFaceOutline = useCallback(
    (landmarks) => {
      if (!canvasRef.current || !landmarks) return;
      const ctx = canvasRef.current.getContext("2d");
      const { width, height } = canvasRef.current;

      ctx.save();

      try {
        const stream = videoRef.current?.srcObject;
        const track = stream?.getVideoTracks?.()[0];
        const facingMode = track?.getSettings?.().facingMode;
        if (facingMode === "user") {
          ctx.translate(width, 0);
          ctx.scale(-1, 1);
        }
      } catch (e) {
        console.warn("Error determining facing mode for drawing");
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
    [zoomLevel, cameraPosition]
  );

  const detectBlink = useCallback((landmarks) => {
    const leftEyeIndices = [33, 160, 158, 133, 153, 144];
    const rightEyeIndices = [362, 385, 387, 263, 373, 380];
    const now = Date.now();

    const calculateEAR = (eye) => {
      const A = Math.hypot(eye[1].x - eye[5].x, eye[1].y - eye[5].y);
      const B = Math.hypot(eye[2].x - eye[4].x, eye[2].y - eye[4].y);
      const C = Math.hypot(eye[0].x - eye[3].x, eye[0].y - eye[3].y);
      return (A + B) / (2 * C);
    };

    const leftEAR = calculateEAR(leftEyeIndices.map((i) => landmarks[i]));
    const rightEAR = calculateEAR(rightEyeIndices.map((i) => landmarks[i]));
    const avgEAR = (leftEAR + rightEAR) / 2;

    if (!detectionState.current.baselineEAR) {
      detectionState.current.baselineEAR = avgEAR * 1.2;
      return false;
    }

    const earThreshold = detectionState.current.baselineEAR * 0.5;
    const isBlinking = avgEAR < earThreshold;

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
    const avgMovement = totalMovement / validPoints;
    const movementDetected = avgMovement > 0.0025;

    state.movementHistory.push(movementDetected);
    state.movementHistory = state.movementHistory.slice(-10);
    state.previousLandmarks = currentLandmarks;

    return state.movementHistory.filter(Boolean).length >= 5;
  }, []);

  const updateVerificationState = useCallback(({ blink, movement }) => {
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
  }, []);

  const updateCheck = useCallback((check, threshold, message) => {
    if (check.verified) return check;
    const newCount = check.count + 1;
    if (newCount >= threshold) {
      showTemporaryFeedback(message);
      return { verified: true, count: newCount };
    }
    return { ...check, count: newCount };
  }, []);

  const showTemporaryFeedback = useCallback((message) => {
    setActiveFeedback(message);
    setTimeout(() => setActiveFeedback(null), 2000);
  }, []);

  const startCamera = useCallback(async () => {
    setError("");
    setLoading(true);
    setCameraPermissionDenied(false);

    try {
      if (
        !selectedPanchayat ||
        !voterIdLastFour ||
        voterIdLastFour.length !== 4
      ) {
        setError(strings.selectPanchayat);
        setLoading(false);
        return;
      }

      if (!modelsLoaded) {
        setError(strings.errorLoadingModels);
        setLoading(false);
        return;
      }

      resetVerification();
      resetCameraView();
      if (!faceMesh.current || typeof faceMesh.current.send !== "function") {
        await initializeFaceMesh(); // ✅ Safe re-initialization
      }
      setIsCameraActive(true); // This triggers the useEffect
    } catch (error) {
      console.error("Camera startup error:", error);
      setIsCameraActive(false);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [selectedPanchayat, voterIdLastFour, modelsLoaded, strings]);

  const stopCamera = useCallback(() => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    if (faceMesh.current?.close) {
      faceMesh.current
        .close()
        .catch((err) => console.warn("FaceMesh close error", err))
        .finally(() => {
          faceMesh.current = null; // ✅ Explicitly remove reference
        });
    }

    setIsCameraActive(false);
    resetVerification();
  }, []);

  const switchCamera = useCallback(() => {
    if (cameras.length <= 1) {
      setError(strings.noAdditionalCameras);
      return;
    }
    const newIndex = (selectedCameraIndex + 1) % cameras.length;
    setSelectedCameraIndex(newIndex);
    stopCamera();
    setTimeout(startCamera, 300);
  }, [
    cameras.length,
    startCamera,
    stopCamera,
    selectedCameraIndex,
    strings.noAdditionalCameras,
  ]);

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

  const captureImage = useCallback(async () => {
    if (!videoRef.current || !isCameraActive) {
      setError(strings.cameraNotActive);
      return;
    }

    try {
      setLoading(true);

      if (
        !verificationState.blink.verified ||
        !verificationState.movement.verified
      ) {
        setError(strings.completeLivelinessChecks);
        setLoading(false);
        return;
      }

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
      setCapturedImage(imageDataURL);
      stopCamera();

      const detections = await faceapi
        .detectSingleFace(
          canvas,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        throw new Error(strings.faceNotRecognized);
      }

      const response = await fetch(`${API_URL}/citizens/face-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          faceDescriptor: Array.from(detections.descriptor),
          panchayatId: selectedPanchayat,
          voterIdLastFour,
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || strings.faceAuthFailed);
      if (onLogin) onLogin(data.user);
    } catch (error) {
      console.error("Authentication error:", error);
      setError(error.message || strings.faceAuthFailed);
      setCapturedImage(null);
    } finally {
      setLoading(false);
    }
  }, [
    isCameraActive,
    verificationState,
    zoomLevel,
    cameraPosition,
    selectedPanchayat,
    voterIdLastFour,
    strings,
    API_URL,
    onLogin,
    stopCamera,
  ]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError("");
    startCamera();
  }, [startCamera]);

  const passedVerificationCount = Object.values(verificationState)
    .filter((val) => typeof val === "object")
    .filter((check) => check.verified).length;

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Grid container spacing={3} justifyContent="center">
        <Grid item xs={12} sm={10} md={8}>
          <Card elevation={3}>
            <CardContent sx={{ p: 0 }}>
              <Box
                sx={{
                  p: 3,
                  backgroundColor: "primary.main",
                  color: "white",
                  borderTopLeftRadius: 8,
                  borderTopRightRadius: 8,
                  textAlign: "center",
                  position: "relative",
                }}
              >
                <Box sx={{ position: "absolute", top: 8, right: 8 }}>
                  <LanguageSwitcher />
                </Box>
                <Typography variant="h5" component="h1" gutterBottom>
                  {strings.citizenLogin}
                </Typography>
                <Typography variant="subtitle2">
                  {strings.loginWithFace}
                </Typography>
              </Box>

              <Box sx={{ p: 3 }}>
                {error && (
                  <Alert severity="error" sx={{ mb: 3 }}>
                    {error}
                  </Alert>
                )}
                {activeFeedback && (
                  <Alert
                    severity="success"
                    icon={<CheckCircleIcon />}
                    sx={{ mb: 3 }}
                  >
                    {activeFeedback}
                  </Alert>
                )}
                {cameraPermissionDenied && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    {strings.cameraPermissionWarning}
                  </Alert>
                )}

                <Box sx={{ mb: 3 }}>
                  <PanchayatSelector
                    value={selectedPanchayat}
                    onChange={setSelectedPanchayat}
                    showAllOption={false}
                    label={strings.selectPanchayat}
                    fullWidth
                    required
                    InputProps={{
                      startAdornment: (
                        <AccountBalanceIcon
                          sx={{ mr: 1, color: "text.secondary" }}
                        />
                      ),
                    }}
                  />
                </Box>

                <Box sx={{ mb: 3 }}>
                  <TextField
                    fullWidth
                    label={strings.voterIdLastFour}
                    value={voterIdLastFour}
                    onChange={(e) => {
                      const value = e.target.value
                        .replace(/\D/g, "")
                        .slice(0, 4);
                      setVoterIdLastFour(value);
                    }}
                    required
                    error={
                      voterIdLastFour.length > 0 && voterIdLastFour.length !== 4
                    }
                    helperText={
                      voterIdLastFour.length > 0 && voterIdLastFour.length !== 4
                        ? strings.exactlyFourDigits
                        : ""
                    }
                    InputProps={{
                      startAdornment: (
                        <AccountCircleIcon
                          sx={{ mr: 1, color: "text.secondary" }}
                        />
                      ),
                    }}
                  />
                </Box>

                <Paper
                  elevation={2}
                  sx={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "4/3",
                    backgroundColor: "grey.100",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    borderRadius: 2,
                    overflow: "hidden",
                    mb: 3,
                    border: verificationState.faceDetected
                      ? "2px solid #4CAF50"
                      : "2px solid transparent",
                    cursor:
                      zoomLevel > 1
                        ? isDragging
                          ? "grabbing"
                          : "grab"
                        : "default",
                  }}
                  ref={containerRef}
                  onMouseDown={handlePanStart}
                  onMouseMove={handlePanMove}
                  onMouseUp={handlePanEnd}
                  onMouseLeave={handlePanEnd}
                >
                  {!isCameraActive && !capturedImage && (
                    <Box
                      sx={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        color: "text.secondary",
                        p: 3,
                        textAlign: "center",
                      }}
                    >
                      <FaceIcon
                        sx={{ fontSize: 80, mb: 2, color: "primary.main" }}
                      />
                      <Typography variant="body1" gutterBottom>
                        {strings.positionFace}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {strings.selectPanchayatFirst}
                      </Typography>
                    </Box>
                  )}

                  {isCameraActive && (
                    <>
                      <Box
                        component="video"
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                          transform: getVideoTransform(),
                          transformOrigin: "center center",
                          transition: "transform 0.2s ease",
                        }}
                      />
                      <Box
                        component="canvas"
                        ref={canvasRef}
                        sx={{
                          position: "absolute",
                          top: 0,
                          left: 0,
                          width: "100%",
                          height: "100%",
                          pointerEvents: "none",
                        }}
                      />

                      <Box
                        sx={{
                          position: "absolute",
                          top: 8,
                          right: 8,
                          display: "flex",
                          flexDirection: "column",
                          gap: 1,
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
                          }}
                        >
                          <Slider
                            value={zoomLevel}
                            min={1}
                            max={2}
                            step={0.1}
                            onChange={handleSliderChange}
                            componentsProps={{
                              thumb: {
                                onMouseDown: (e) => e.stopPropagation(),
                              },
                            }}
                            sx={{
                              color: "white",
                              "& .MuiSlider-thumb": {
                                width: 16,
                                height: 16,
                                "&:focus, &:hover, &.Mui-active": {
                                  boxShadow: "none",
                                },
                              },
                            }}
                          />
                        </Box>
                      )}

                      <Box
                        sx={{
                          position: "absolute",
                          bottom: sliderReady ? 48 : 8,
                          left: "50%",
                          transform: "translateX(-50%)",
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
                    </>
                  )}

                  {capturedImage && (
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <Box
                        component="img"
                        src={capturedImage}
                        alt="Captured face"
                        sx={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    </Box>
                  )}

                  {loading && (
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
                      }}
                    >
                      <CircularProgress
                        color="inherit"
                        size={60}
                        sx={{ mb: 2 }}
                      />
                      <Typography variant="body2">
                        {isCameraActive
                          ? strings.startingCamera
                          : strings.processing}
                      </Typography>
                    </Box>
                  )}
                </Paper>

                {cameras.length > 0 && (
                  <Paper
                    variant="outlined"
                    sx={{ p: 2, bgcolor: "grey.50", mt: 2 }}
                  >
                    <Typography variant="body2" color="text.secondary">
                      Current Camera:{" "}
                      {videoRef.current?.srcObject
                        ?.getVideoTracks?.()[0]
                        ?.getSettings?.().facingMode === "user"
                        ? "Front-facing"
                        : "Back-facing"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Available Cameras: {cameras.length}
                    </Typography>
                  </Paper>
                )}

                <Box sx={{ display: "flex", justifyContent: "center", gap: 2 }}>
                  {!isCameraActive && !capturedImage ? (
                    <Button
                      variant="contained"
                      color="primary"
                      startIcon={<CameraAltIcon />}
                      onClick={startCamera}
                      disabled={
                        !selectedPanchayat ||
                        !voterIdLastFour ||
                        voterIdLastFour.length !== 4
                      }
                      fullWidth
                      size="large"
                      sx={{ py: 1.5 }}
                    >
                      {strings.startCamera}
                    </Button>
                  ) : capturedImage ? (
                    <Button
                      variant="outlined"
                      onClick={retakePhoto}
                      fullWidth
                      size="large"
                    >
                      {strings.retake}
                    </Button>
                  ) : (
                    <>
                      <Button
                        variant="outlined"
                        color="error"
                        onClick={stopCamera}
                        disabled={loading}
                        size="large"
                        sx={{ flex: 1 }}
                      >
                        {strings.cancel}
                      </Button>
                      <Button
                        variant="contained"
                        color="success"
                        startIcon={<PhotoCameraIcon />}
                        onClick={captureImage}
                        disabled={
                          !verificationState.blink.verified ||
                          !verificationState.movement.verified
                        }
                        size="large"
                        sx={{ flex: 2 }}
                      >
                        {strings.takePhoto}
                      </Button>
                    </>
                  )}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

const VerificationChip = ({ label, verified, count, required }) => (
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
);

export default CitizenLoginView;
