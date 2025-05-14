// File: frontend/src/components/FaceRegistration.js (Updated to include panchayatId)
import React, { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { registerFace } from "../api";
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  AlertTitle,
  Stack,
  CircularProgress,
  Chip,
} from "@mui/material";
import {
  PhotoCamera as CameraIcon,
  SwitchCamera as SwitchCameraIcon,
  HowToReg as RegisterIcon,
  Stop as StopIcon,
  Warning as WarningIcon,
  VideocamOff as CameraOffIcon,
  CheckCircle as CheckCircleIcon,
  DirectionsRun as MotionIcon,
} from "@mui/icons-material";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

const FaceRegistration = ({
  user,
  modelsLoaded,
  onUserUpdate,
  setMessage,
  setLoading,
}) => {
  const [cameraState, setCameraState] = useState("inactive");
  const [facingMode, setFacingMode] = useState("user");
  const [verificationState, setVerificationState] = useState({
    faceDetected: false,
    blink: { verified: false, count: 0 },
    movement: { verified: false, count: 0 },
  });
  const [activeFeedback, setActiveFeedback] = useState(null);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const faceMesh = useRef(null);
  const camera = useRef(null);
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
    const initialize = async () => {
      await initializeFaceMesh();
    };

    initialize();
    return () => {
      stopCamera();
      faceMesh.current = null;
    };
  }, []);

  const initializeFaceMesh = async () => {
    try {
      faceMesh.current = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4/${file}`;
        },
      });

      faceMesh.current.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.current.onResults(handleFaceResults);
    } catch (error) {
      console.error("FaceMesh initialization error:", error);
      setMessage({
        type: "error",
        text: "Face detection model failed to load. Please refresh the page.",
      });
    }
  };

  const handleFaceResults = (results) => {
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

    const livelinessChecks = {
      blink: detectBlink(faceLandmarks),
      movement: detectMacroMovement(faceLandmarks),
    };

    updateVerificationState(livelinessChecks);
    setVerificationState((prev) => ({ ...prev, faceDetected: true }));
  };

  const drawFaceOutline = (landmarks) => {
    if (!canvasRef.current || !landmarks) return;

    const ctx = canvasRef.current.getContext("2d");
    const { width, height } = canvasRef.current;

    ctx.save();
    if (facingMode === "user") {
      ctx.translate(width, 0);
      ctx.scale(-1, 1);
    }

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

    const avgMovement = totalMovement / validPoints;
    const movementDetected = avgMovement > 0.0025;

    state.movementHistory.push(movementDetected);
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
    if (!user || !modelsLoaded) {
      setMessage({
        type: "error",
        text: !user ? "Select a member first" : "Models not loaded",
      });
      return;
    }

    try {
      setCameraState("starting");
      setLoading(true);
      resetVerification();

      if (!faceMesh.current) await initializeFaceMesh();

      camera.current = new Camera(videoRef.current, {
        onFrame: async () => {
          if (faceMesh.current?.send) {
            await faceMesh.current.send({ image: videoRef.current });
          }
        },
        facingMode,
        width: 1280,
        height: 720,
      });

      await camera.current.start();
      setCameraState("active");
    } catch (error) {
      console.error("Camera error:", error);
      setCameraState("error");
      setMessage({
        type: "error",
        text: "Camera initialization failed. Please check permissions.",
      });
    } finally {
      setLoading(false);
    }
  };

  const stopCamera = () => {
    if (camera.current) {
      camera.current.stop();
      camera.current = null;
    }
    setCameraState("inactive");
    resetVerification();
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === "user" ? "environment" : "user"));
    stopCamera();
    setTimeout(startCamera, 300);
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

  const handleRegisterFace = async () => {
    if (!user || cameraState !== "active" || !verificationState.faceDetected) {
      setMessage({ type: "error", text: "Invalid registration conditions" });
      return;
    }

    const passedChecks = Object.values(verificationState)
      .filter((val) => typeof val === "object")
      .filter((check) => check.verified).length;

    if (passedChecks < 2) {
      setMessage({ type: "error", text: "Complete both verification checks" });
      return;
    }

    setLoading(true);
    setMessage({ type: "", text: "" });

    try {
      // Make sure video is ready for processing
      if (videoRef.current.readyState !== 4) {
        throw new Error(
          "Video feed is not ready yet. Please wait a moment and try again."
        );
      }

      console.log("Attempting face detection for registration");
      const detections = await faceapi
        .detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({
            inputSize: 416,
            scoreThreshold: 0.6,
          })
        )
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (!detections) throw new Error("Face lost during registration");

      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(videoRef.current, 0, 0);
      const faceImage = canvas.toDataURL("image/jpeg", 0.8);

      const response = await registerFace(
        user.voterIdNumber,
        Array.from(detections.descriptor),
        faceImage,
        user.panchayatId
      );

      setMessage({ type: "success", text: response.message });
      stopCamera();
      onUserUpdate({ ...user, isRegistered: true });
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Registration failed",
      });
    } finally {
      setLoading(false);
    }
  };

  const passedVerificationCount = Object.values(verificationState)
    .filter((val) => typeof val === "object")
    .filter((check) => check.verified).length;

  return (
    <Paper elevation={3} sx={{ p: 3, borderRadius: 2 }}>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
        Face Registration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Registration Instructions</AlertTitle>
        <ul style={{ margin: 0, paddingLeft: 20 }}>
          <li>Face the camera directly in good lighting</li>
          <li>Blink naturally 4 times</li>
          <li>Clearly move your head 5 times</li>
          <li>Maintain a neutral expression</li>
        </ul>
      </Alert>

      <Box
        sx={{
          position: "relative",
          width: "100%",
          aspectRatio: "4/3",
          bgcolor: "grey.100",
          borderRadius: 1,
          overflow: "hidden",
          mb: 3,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        {cameraState === "inactive" && (
          <Box textAlign="center">
            <CameraOffIcon
              sx={{ fontSize: 60, color: "text.disabled", mb: 1 }}
            />
            <Typography color="text.disabled" variant="body1">
              Camera Inactive
            </Typography>
          </Box>
        )}

        {cameraState === "starting" && (
          <Box textAlign="center">
            <CircularProgress size={60} thickness={4} />
            <Typography color="text.secondary" sx={{ mt: 2 }}>
              Initializing Camera...
            </Typography>
          </Box>
        )}

        {cameraState === "error" && (
          <Box textAlign="center">
            <WarningIcon sx={{ fontSize: 60, color: "error.main", mb: 1 }} />
            <Typography color="error.main" variant="body1">
              Camera Error
            </Typography>
          </Box>
        )}

        <Box
          component="video"
          ref={videoRef}
          autoPlay
          muted
          playsInline
          sx={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: facingMode === "user" ? "scaleX(-1)" : "none",
            display: cameraState === "active" ? "block" : "none",
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
            display: cameraState === "active" ? "block" : "none",
          }}
        />
      </Box>

      {cameraState === "active" && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 500 }}>
            Liveliness Verification (Need 2 checks)
          </Typography>

          <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
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

          {activeFeedback && (
            <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
              {activeFeedback}
            </Alert>
          )}

          {passedVerificationCount < 2 && verificationState.faceDetected && (
            <Alert severity="warning" icon={<MotionIcon />} sx={{ mb: 2 }}>
              {passedVerificationCount > 0
                ? `Complete ${2 - passedVerificationCount} more checks`
                : "Perform natural movements and blinks"}
            </Alert>
          )}
        </Box>
      )}

      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
        {cameraState === "inactive" || cameraState === "error" ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<CameraIcon />}
            onClick={startCamera}
            fullWidth
            sx={{ py: 1.5 }}
          >
            {cameraState === "error" ? "Try Again" : "Start Camera"}
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<RegisterIcon />}
              onClick={handleRegisterFace}
              disabled={passedVerificationCount < 2}
              fullWidth
              sx={{ py: 1.5 }}
            >
              Register Face
            </Button>
            <Button
              variant="outlined"
              color="secondary"
              size="large"
              startIcon={<StopIcon />}
              onClick={stopCamera}
              fullWidth
              sx={{ py: 1.5 }}
            >
              Stop Camera
            </Button>
          </>
        )}
      </Stack>
    </Paper>
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

export default FaceRegistration;
