import React, { useState, useRef, useEffect, useCallback } from "react";
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
  Slider,
  IconButton,
  Tooltip,
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
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
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
  // State declarations
  const [cameraState, setCameraState] = useState("inactive");
  const [cameras, setCameras] = useState([]);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [cameraPosition, setCameraPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [selectedCameraIndex, setSelectedCameraIndex] = useState(0);
  const [verificationState, setVerificationState] = useState({
    faceDetected: false,
    blink: { verified: false, count: 0 },
    movement: { verified: false, count: 0 },
  });
  const [activeFeedback, setActiveFeedback] = useState(null);
  const [sliderReady, setSliderReady] = useState(false);

  // Refs
  const faceMeshId = useRef(0);
  const faceMeshReady = useRef(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const sliderContainerRef = useRef(null);
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

  // Initialize component
  useEffect(() => {
    const initialize = async () => {
      await initializeFaceMesh();
      await checkCameraDevices();
    };

    initialize();
    return () => {
      stopCamera();
      faceMesh.current = null;
    };
  }, []);

  // Delay slider initialization
  useEffect(() => {
    if (cameraState === "active" && zoomLevel > 1) {
      const timer = setTimeout(() => setSliderReady(true), 100);
      return () => clearTimeout(timer);
    } else {
      setSliderReady(false);
    }
  }, [cameraState, zoomLevel]);

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
            categorized.user = { device, facingMode };
          } else if (
            (facingMode === "environment" || facingMode === "back") &&
            !categorized.environment
          ) {
            categorized.environment = { device, facingMode };
          }

          track.stop();
          if (categorized.user && categorized.environment) break;
        } catch (err) {
          console.warn("Error checking facingMode for device:", device.label);
        }
      }

      const filtered = [categorized.user, categorized.environment]
        .filter(Boolean)
        .map((cam) => ({
          device: cam.device,
          facingMode: cam.facingMode,
        }));
      setCameras(filtered);
      setSelectedCameraIndex(0);
    } catch (err) {
      console.error("Failed to enumerate cameras:", err);
      setMessage({ type: "error", text: "Camera access issue. Please retry." });
    }
  };

  const initializeFaceMesh = async () => {
    try {
      faceMeshReady.current = false;

      if (faceMesh.current?.close) {
        try {
          await faceMesh.current.close();
        } catch (e) {
          console.warn("FaceMesh already closed or deleted", e);
        }
      }

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
      faceMeshReady.current = true;
      faceMeshId.current += 1;
    } catch (error) {
      console.error("FaceMesh init error:", error);
      faceMeshReady.current = false;
    }
  };

  const getVideoTransform = useCallback(() => {
    const transforms = [];

    try {
      const stream = videoRef.current?.srcObject;
      const track = stream?.getVideoTracks?.()[0];
      const mode = track?.getSettings?.().facingMode;
      if (mode === "user") transforms.push("scaleX(-1)");
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
  }, []);

  const drawFaceOutline = useCallback(
    (landmarks) => {
      if (!canvasRef.current || !landmarks) return;
      const ctx = canvasRef.current.getContext("2d");
      const { width, height } = canvasRef.current;

      ctx.save();
      const stream = videoRef.current?.srcObject;
      const track = stream?.getVideoTracks?.()[0];
      const mode = track?.getSettings?.().facingMode;
      if (mode === "user") {
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

  // Camera controls
  const startCamera = useCallback(async () => {
    if (!user || !modelsLoaded || cameras.length === 0) {
      setMessage({
        type: "error",
        text: !user
          ? "Select a member first"
          : "Models not loaded or no camera found",
      });
      return;
    }

    try {
      setCameraState("starting");
      setLoading(true);
      resetVerification();

      await initializeFaceMesh(); // Always reinitialize on new stream

      const selectedCamera = cameras[selectedCameraIndex];
      const deviceId = selectedCamera.device.deviceId; // Access from metadata

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });

      videoRef.current.srcObject = stream;
      await videoRef.current.play();

      // Instead of using MediaPipe's Camera
      const processFrame = (id) => {
        const loop = async () => {
          try {
            if (
              faceMeshReady.current &&
              faceMesh.current?.send &&
              faceMeshId.current === id &&
              videoRef.current &&
              videoRef.current.readyState >= 2 &&
              videoRef.current.videoWidth > 0
            ) {
              await faceMesh.current.send({ image: videoRef.current });
            }
            if (
              faceMeshReady.current &&
              faceMesh.current &&
              faceMesh.current.send &&
              videoRef.current?.videoWidth > 0 &&
              videoRef.current?.videoHeight > 0
            ) {
              await faceMesh.current.send({ image: videoRef.current });
            }
          } catch (e) {
            console.error("FaceMesh send error:", e);
          }

          if (faceMeshId.current === id) {
            requestAnimationFrame(loop);
          }
        };

        loop();
      };

      const id = faceMeshId.current;
      requestAnimationFrame(() => processFrame(id));
      setCameraState("active");
    } catch (error) {
      console.error("startCamera error:", error);
      setCameraState("error");
      setMessage({
        type: "error",
        text: "Camera failed to start. Check permissions and availability.",
      });
    } finally {
      setLoading(false);
    }
  }, [user, modelsLoaded, cameras, selectedCameraIndex]);

  const stopCamera = useCallback(() => {
    // Stop all tracks
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }

    // Prevent send() from firing
    faceMeshReady.current = false;

    // Cleanup FaceMesh instance if it exists
    if (faceMesh.current?.close) {
      faceMesh.current
        .close()
        .catch((err) => console.warn("FaceMesh close error", err));
    }

    setCameraState("inactive");
    resetVerification();
    resetCameraView();
  }, []);

  const switchCamera = useCallback(() => {
    if (cameras.length <= 1) {
      setMessage({ type: "error", text: "Only one camera detected." });
      return;
    }

    const newIndex = (selectedCameraIndex + 1) % cameras.length;
    const selectedCamera = cameras[newIndex];

    // Update facing mode from stored metadata
    setSelectedCameraIndex(newIndex);

    stopCamera();
    setTimeout(() => startCamera(), 300);
    return newIndex;
  }, [cameras, selectedCameraIndex, startCamera, stopCamera]);

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

  // Zoom and pan controls
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

      try {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();

        const x = Math.max(
          0,
          Math.min(1, (e.clientX - rect.left) / rect.width)
        );
        const y = Math.max(
          0,
          Math.min(1, (e.clientY - rect.top) / rect.height)
        );

        const maxOffset = (zoomLevel - 1) / (2 * zoomLevel);
        setCameraPosition({
          x: Math.max(-maxOffset, Math.min(maxOffset, x - 0.5)),
          y: Math.max(-maxOffset, Math.min(maxOffset, y - 0.5)),
        });
      } catch (error) {
        console.error("Panning error:", error);
      }
    },
    [isDragging, zoomLevel]
  );

  const handlePanEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Face registration
  const handleRegisterFace = useCallback(async () => {
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

      const faceImage = canvas.toDataURL("image/jpeg", 0.8);

      const detectionOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 320,
        scoreThreshold: 0.6,
      });

      const detections = await Promise.race([
        faceapi
          .detectSingleFace(videoRef.current, detectionOptions)
          .withFaceLandmarks()
          .withFaceDescriptor(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Face detection timeout")), 3000)
        ),
      ]);

      if (!detections) throw new Error("Face lost during registration");

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
  }, [
    user,
    cameraState,
    verificationState,
    zoomLevel,
    cameraPosition,
    stopCamera,
    onUserUpdate,
  ]);

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
        ref={containerRef}
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
          cursor:
            zoomLevel > 1 ? (isDragging ? "grabbing" : "grab") : "default",
        }}
        onMouseDown={handlePanStart}
        onMouseMove={handlePanMove}
        onMouseUp={handlePanEnd}
        onMouseLeave={handlePanEnd}
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
            transform: getVideoTransform(),
            transformOrigin: "center center",
            display: cameraState === "active" ? "block" : "none",
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
            display: cameraState === "active" ? "block" : "none",
          }}
        />

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
          </>
        )}
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

      {cameras.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: "grey.50", mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            {videoRef.current?.srcObject?.getVideoTracks?.()[0]?.getSettings?.()
              .facingMode === "user"
              ? "Front-facing"
              : "Back-facing"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Available Cameras: {cameras.length}
          </Typography>
        </Paper>
      )}
    </Paper>
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

export default FaceRegistration;
