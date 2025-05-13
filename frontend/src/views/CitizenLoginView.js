// File: frontend/src/views/CitizenLoginView.js (Updated with better camera implementation)
import React, { useState, useRef, useEffect } from "react";
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
  Divider,
  Paper,
  Grid,
  Chip,
  TextField,
} from "@mui/material";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import FaceIcon from "@mui/icons-material/Face";
import PhotoCameraIcon from "@mui/icons-material/PhotoCamera";
import AccountBalanceIcon from "@mui/icons-material/AccountBalance";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import PanchayatSelector from "../components/PanchayatSelector";
import LanguageSwitcher from "../components/LanguageSwitcher";
import { useLanguage } from "../utils/LanguageContext";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

const CitizenLoginView = ({ onLogin }) => {
  const { strings } = useLanguage();
  const [cameraActive, setCameraActive] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const isCameraActiveRef = useRef(isCameraActive);
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState("");
  const [selectedPanchayat, setSelectedPanchayat] = useState("");
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
  const [voterIdLastFour, setVoterIdLastFour] = useState("");
  const [verificationState, setVerificationState] = useState({
    faceDetected: false,
    blink: { verified: false, count: 0 },
    movement: { verified: false, count: 0 },
  });

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMeshRef = useRef(null);
  const cameraRef = useRef(null);
  const streamRef = useRef(null);
  const detectionIntervalRef = useRef(null);
  const isMountedRef = useRef(true);
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
    isCameraActiveRef.current = isCameraActive;
  }, [isCameraActive]);

  useEffect(() => {
    isMountedRef.current = true;
    const initializeModels = async () => {
      try {
        // Initialize FaceMesh
        faceMeshRef.current = new FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
          },
        });

        faceMeshRef.current.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshRef.current.onResults(handleFaceResults);

        // Load face-api.js models
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

    initializeModels();

    return () => {
      isMountedRef.current = false;
      stopCamera(); // Ensures full cleanup
      if (detectionIntervalRef.current) {
        clearInterval(detectionIntervalRef.current);
      }
    };
  }, []);

  const handleFaceResults = (results) => {
    if (
      !isMountedRef.current ||
      !isCameraActiveRef.current ||
      !canvasRef.current ||
      !results.multiFaceLandmarks
    ) {
      setVerificationState((prev) => ({ ...prev, faceDetected: false }));
      return;
    }
    if (
      canvasRef.current.width !== videoRef.current.videoWidth ||
      canvasRef.current.height !== videoRef.current.videoHeight
    ) {
      canvasRef.current.width = videoRef.current.videoWidth;
      canvasRef.current.height = videoRef.current.videoHeight;
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
    setVerificationState((prev) => ({
      ...prev,
      faceDetected: true,
      blink: livelinessChecks.blink
        ? updateCheck(prev.blink, VERIFICATION_THRESHOLDS.blink)
        : prev.blink,
      movement: livelinessChecks.movement
        ? updateCheck(prev.movement, VERIFICATION_THRESHOLDS.movement)
        : prev.movement,
    }));
  };

  const drawFaceOutline = (landmarks) => {
    const canvas = canvasRef.current;
    if (!canvas || !landmarks) return;

    const ctx = canvas.getContext("2d");
    const { width, height } = canvas; // Capture dimensions before use

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(width, 0);
    ctx.scale(-1, 1);

    ctx.strokeStyle = "#42A5F5";
    ctx.lineWidth = 2;

    // Full face oval detection
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

    // Initialize previous landmarks if not set
    if (!state.previousLandmarks) {
      state.previousLandmarks = currentLandmarks;
      return false;
    }

    // Key facial points to track (nose, chin, eye corners)
    const referencePoints = [1, 33, 4, 263, 61, 291, 168, 197];
    let totalMovement = 0;
    let validPoints = 0;

    // Calculate movement for each reference point
    referencePoints.forEach((index) => {
      const current = currentLandmarks[index];
      const previous = state.previousLandmarks[index];

      // Use Euclidean distance for movement calculation
      const movement = Math.hypot(
        current.x - previous.x,
        current.y - previous.y
      );

      // Only consider movements above noise threshold
      if (movement > 0.0008) {
        // Reduced from 0.001
        totalMovement += movement;
        validPoints++;
      }
    });

    // Require at least 5 points to have meaningful movement
    if (validPoints < 5) return false;

    const avgMovement = totalMovement / validPoints;

    // Increased movement threshold (reduced sensitivity)
    const movementDetected = avgMovement > 0.0035; // Increased from 0.0025

    // Update movement history (larger window for more stable detection)
    state.movementHistory.push(movementDetected);
    state.movementHistory = state.movementHistory.slice(-15); // Increased from 10

    state.previousLandmarks = currentLandmarks;

    // Require more consistent movement to register
    return state.movementHistory.filter(Boolean).length >= 8; // Increased from 5
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

  const updateCheck = (check, threshold) => {
    if (check.verified) return check;
    const newCount = check.count + 1;
    if (newCount >= threshold) {
      return { verified: true, count: newCount };
    }
    return { ...check, count: newCount };
  };

  const startCamera = async () => {
    setError("");
    setLoading(true);
    setCameraPermissionDenied(false);

    try {
      if (!selectedPanchayat) {
        setError(strings.selectPanchayat);
        setLoading(false);
        return;
      }

      if (!voterIdLastFour || voterIdLastFour.length !== 4) {
        setError(strings.enterVoterId);
        setLoading(false);
        return;
      }

      if (!modelsLoaded) {
        setError(strings.errorLoadingModels);
        setLoading(false);
        return;
      }
      resetVerification();
      if (!faceMeshRef.current) {
        faceMeshRef.current = new FaceMesh({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
          },
        });

        faceMeshRef.current.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        faceMeshRef.current.onResults(handleFaceResults);
      }

      setIsCameraActive(true);
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (!videoRef.current) {
        throw new Error("Video element not available");
      }

      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }

      // Initialize camera
      cameraRef.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMeshRef.current?.send && isCameraActiveRef.current) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
        },
        facingMode: "user",
        width: 640,
        height: 480,
      });

      await cameraRef.current.start();

      // Set canvas dimensions to match video
      if (canvasRef.current && videoRef.current) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
      }
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
    } finally {
      setLoading(false);
    }
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
      blinkState: "open",
    };

    // Clear canvas if it exists
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
  };

  const stopCamera = () => {
    // Clear any pending detection intervals
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    // Stop the MediaPipe camera
    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (e) {
        console.warn("Error stopping camera:", e);
      }
      cameraRef.current = null;
    }

    // Stop all media tracks
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject;
      const tracks = stream.getTracks();
      tracks.forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    // Reset verification state
    resetVerification();

    // Update UI state
    setIsCameraActive(false);
  };

  const captureImage = async () => {
    if (!videoRef.current || !isCameraActive) {
      setError(strings.cameraNotActive);
      return;
    }

    try {
      setLoading(true);

      // Verify liveliness checks
      if (
        !verificationState.blink.verified ||
        !verificationState.movement.verified
      ) {
        setError(strings.completeLivelinessChecks);
        setLoading(false);
        return;
      }

      // Capture image and get face descriptor
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

      const detections = await faceapi
        .detectSingleFace(
          tempCanvas,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 320,
            scoreThreshold: 0.5,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) {
        setError(strings.faceNotRecognized);
        setLoading(false);
        return;
      }

      const imageDataURL = tempCanvas.toDataURL("image/jpeg");
      setCapturedImage(imageDataURL);
      stopCamera();

      // API call for face authentication
      try {
        const response = await fetch(`${API_URL}/citizens/face-login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            faceDescriptor: Array.from(detections.descriptor),
            panchayatId: selectedPanchayat,
            voterIdLastFour,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessageMap = {
            "Panchayat not found": strings.errorPanchayatNotFound,
            "No registered users found": strings.errorNoRegisteredUsers,
            "Face not recognized": strings.errorFaceNotRecognized,
            "Multiple matches found": strings.errorMultipleMatches,
            "Invalid voter ID": strings.errorInvalidVoterId,
          };
          throw new Error(
            errorMessageMap[data.message] || strings.faceAuthFailed
          );
        }

        if (onLogin) {
          onLogin(data.user);
        }
      } catch (error) {
        console.error("Login error:", error);
        setError(error.message || strings.faceNotRecognized);
        setCapturedImage(null);
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setError(error.message || strings.faceAuthFailed);
      setCapturedImage(null);
    } finally {
      setLoading(false);
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    setError("");
    startCamera();
  };

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
                {cameraPermissionDenied && (
                  <Alert severity="warning" sx={{ mb: 3 }}>
                    {strings.cameraPermissionWarning}
                  </Alert>
                )}

                <Box sx={{ mb: 3 }}>
                  <PanchayatSelector
                    value={selectedPanchayat}
                    onChange={(value) => setSelectedPanchayat(value)}
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
                {/* Face Recognition UI */}
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
                  }}
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
                    <Box
                      sx={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                      }}
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
                        }}
                      />
                      <Box
                        sx={{
                          position: "absolute",
                          bottom: 16,
                          left: "50%",
                          transform: "translateX(-50%)",
                        }}
                      >
                        <Stack direction="row" spacing={1}>
                          <Chip
                            label={`Blinks: ${verificationState.blink.count}/${VERIFICATION_THRESHOLDS.blink}`}
                            color={
                              verificationState.blink.verified
                                ? "success"
                                : "default"
                            }
                            size="small"
                          />
                          <Chip
                            label={`Movements: ${verificationState.movement.count}/${VERIFICATION_THRESHOLDS.movement}`}
                            color={
                              verificationState.movement.verified
                                ? "success"
                                : "default"
                            }
                            size="small"
                          />
                        </Stack>
                      </Box>
                    </Box>
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
                  {capturedImage && (
                    <Button
                      variant="outlined"
                      color="primary"
                      onClick={retakePhoto}
                      disabled={loading}
                      fullWidth
                      size="large"
                    >
                      {strings.retake}
                    </Button>
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

export default CitizenLoginView;
