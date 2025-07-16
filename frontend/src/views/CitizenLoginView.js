import React, { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
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
  Collapse,
  Divider,
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
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocationOn as LocationOnIcon,
  Tag as TagIcon,
  Error as ErrorIcon,
} from "@mui/icons-material";
import LanguageSwitcher from "../components/LanguageSwitcher";
import CascadingLocationDropdowns from "../components/CascadingLocationDropdowns";
import { useLanguage } from "../utils/LanguageContext";
import {
  fetchPanchayatByLgdCode,
  fetchPanchayatByLocation,
  validateLocationPath,
  getErrorMessage,
} from "../api";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";

const CitizenLoginView = ({ onLogin }) => {
  const { strings } = useLanguage();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { "*": urlPath, state, district, block, panchayat } = useParams(); // Capture both wildcard path and direct params

  // Login method states
  const [loginMethod, setLoginMethod] = useState("loading"); // 'loading', 'lgd', 'location', 'manual', 'error'
  const [selectedPanchayat, setSelectedPanchayat] = useState(null);
  const [urlError, setUrlError] = useState("");
  const [showManualSelection, setShowManualSelection] = useState(false);

  // Face recognition states
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [capturedImage, setCapturedImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [error, setError] = useState("");
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

  // Platform config and thresholds state
  const [platformConfig, setPlatformConfig] = useState({
    liveliness: true,
    blink_count: 4,
    movement_count: 5,
  });
  const [thresholds, setThresholds] = useState({
    blink: 4,
    movement: 5,
  });
  const thresholdsRef = useRef(thresholds);

  // Keep thresholdsRef in sync
  useEffect(() => {
    thresholdsRef.current = thresholds;
  }, [thresholds]);

  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000/api";

  // Process URL parameters and determine login method
  useEffect(() => {
    processUrlAndSetLoginMethod();
  }, [searchParams, urlPath, state, district, block, panchayat]);

  // Process URL to determine login method
  const processUrlAndSetLoginMethod = async () => {
    setLoginMethod("loading");
    setUrlError("");
    setSelectedPanchayat(null);

    try {
      // Check for LGD code in query parameters
      const lgdCode = searchParams.get("lgdCode");
      if (lgdCode) {
        await handleLgdCodeLogin(lgdCode);
        return;
      }

      // Check for direct path parameters (/:state/:district/:block/:panchayat)
      if (state && district && block && panchayat) {
        await handleLocationPathLogin(`${state}/${district}/${block}/${panchayat}`);
        return;
      }

      // Check for location path (wildcard from /citizen-login/*)
      if (urlPath) {
        await handleLocationPathLogin(urlPath);
        return;
      }

      // Default to manual selection
      setLoginMethod("manual");
    } catch (error) {
      console.error("Error processing URL:", error);
      setUrlError(getErrorMessage("locationError"));
      setLoginMethod("error");
    }
  };

  // Handle LGD code login
  const handleLgdCodeLogin = async (lgdCode) => {
    try {
      const panchayat = await fetchPanchayatByLgdCode(lgdCode);
      setSelectedPanchayat(panchayat);
      setLoginMethod("lgd");
    } catch (error) {
      console.error("LGD code error:", error);
      setUrlError(getErrorMessage(error.message || "lgdCodeNotFound"));
      setLoginMethod("error");
    }
  };

  // Handle location path login
  const handleLocationPathLogin = async (path) => {
    try {
      // Parse the path segments
      const pathSegments = path.split("/").filter(Boolean);

      // Validate path format
      const validation = await validateLocationPath(pathSegments);
      if (!validation.isValid) {
        setUrlError(getErrorMessage(validation.error));
        setLoginMethod("error");
        return;
      }

      // If validation passes, try to fetch panchayat
      const [state, district, block, panchayatName] = pathSegments;
      const panchayat = await fetchPanchayatByLocation(
        state,
        district,
        block,
        panchayatName
      );
      setSelectedPanchayat(panchayat);
      setLoginMethod("location");
    } catch (error) {
      console.error("Location path error:", error);
      setUrlError(getErrorMessage(error.message || "locationNotFound"));
      setLoginMethod("error");
    }
  };

  // Handle manual panchayat selection
  const handleManualLocationChange = async (location) => {
    if (
      location.state &&
      location.district &&
      location.block &&
      location.panchayat
    ) {
      try {
        // Fetch the actual panchayat from the database
        const panchayat = await fetchPanchayatByLocation(
          location.state,
          location.district,
          location.block,
          location.panchayat
        );
        setSelectedPanchayat(panchayat);
      } catch (error) {
        console.error("Error fetching panchayat for manual selection:", error);
        setError("Failed to fetch panchayat details. Please try again.");
        setSelectedPanchayat(null);
      }
    } else {
      setSelectedPanchayat(null);
    }
  };

  // Switch to manual selection
  const switchToManualSelection = () => {
    setLoginMethod("manual");
    setShowManualSelection(true);
    setUrlError("");
    // Clear URL parameters
    navigate("/citizen-login", { replace: true });
  };

  // Fetch platform config
  const fetchPlatformConfig = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/platform-configurations/camera`);
      const cameraSettings = await res.json();

      setPlatformConfig({
        liveliness: cameraSettings?.value?.liveliness?.citizenLogin ?? true,
        blink_count: cameraSettings?.value?.blink_count?.citizenLogin ?? 4,
        movement_count:
          cameraSettings?.value?.movement_count?.citizenLogin ?? 5,
      });
      setThresholds({
        blink: cameraSettings?.value?.blink_count?.citizenLogin ?? 4,
        movement: cameraSettings?.value?.movement_count?.citizenLogin ?? 5,
      });
    } catch (err) {
      setPlatformConfig({
        liveliness: true,
        blink_count: 4,
        movement_count: 5,
      });
      setThresholds({
        blink: 4,
        movement: 5,
      });
    }
  }, [API_URL]);

  // Refs for face recognition
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
        ? updateCheck(prev.blink, thresholdsRef.current.blink, "Blink verified")
        : prev.blink,
      movement: movement
        ? updateCheck(
            prev.movement,
            thresholdsRef.current.movement,
            "Movement verified"
          )
        : prev.movement,
    }));
  }, []);

  const handleFaceResults = useCallback(
    (results) => {
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
      await fetchPlatformConfig();

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
        await initializeFaceMesh();
      }
      setIsCameraActive(true);
    } catch (error) {
      console.error("Camera startup error:", error);
      setIsCameraActive(false);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [
    selectedPanchayat,
    voterIdLastFour,
    modelsLoaded,
    strings,
    fetchPlatformConfig,
  ]);

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
          faceMesh.current = null;
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
        platformConfig.liveliness &&
        (!verificationState.blink.verified ||
          !verificationState.movement.verified)
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

      // Use the existing auth API
      try {
        const initResponse = await fetch(
          `${API_URL}/auth/citizen/face-login/init`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              voterIdLastFour: voterIdLastFour,
              panchayatId: selectedPanchayat._id,
            }),
          }
        );

        const initData = await initResponse.json();

        if (!initResponse.ok) {
          const errorMessageMap = {
            "Panchayat not found": strings.errorPanchayatNotFound,
            "No registered users found": strings.errorNoRegisteredUsers,
            "Face not recognized": strings.errorFaceNotRecognized,
            "Multiple matches found": strings.errorMultipleMatches,
            "Invalid voter ID": strings.errorInvalidVoterId,
          };
          throw new Error(
            errorMessageMap[initData.message] ||
              initData.message ||
              strings.faceAuthFailed
          );
        }

        let verifyBody;

        if (initData.data.userId && initData.data.securityToken) {
          verifyBody = {
            userId: initData.data.userId,
            securityToken: initData.data.securityToken,
            faceDescriptor: Array.from(detections.descriptor),
          };
        } else if (
          initData.data.potentialUserIds &&
          initData.data.userSecurityTokens
        ) {
          verifyBody = {
            potentialUserIds: initData.data.potentialUserIds,
            userSecurityTokens: initData.data.userSecurityTokens,
            faceDescriptor: Array.from(detections.descriptor),
          };
        } else {
          throw new Error("Invalid response from server");
        }

        const verifyResponse = await fetch(
          `${API_URL}/auth/citizen/face-login/verify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(verifyBody),
          }
        );

        const verifyData = await verifyResponse.json();

        if (!verifyResponse.ok) {
          const errorMessageMap = {
            "Face verification failed": strings.errorFaceNotRecognized,
            "Multiple potential matches found": strings.errorMultipleMatches,
          };
          throw new Error(
            errorMessageMap[verifyData.message] ||
              verifyData.message ||
              strings.faceAuthFailed
          );
        }

        if (onLogin && verifyData.data && verifyData.data.user) {
          if (verifyData.data.token && verifyData.data.refreshToken) {
            onLogin(
              verifyData.data.user,
              verifyData.data.token,
              verifyData.data.refreshToken
            );
          } else {
            onLogin(verifyData.data.user);
          }
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
    platformConfig.liveliness,
  ]);

  const retakePhoto = useCallback(() => {
    setCapturedImage(null);
    setError("");
    startCamera();
  }, [startCamera]);

  // Render different UI based on login method
  const renderLoginMethodContent = () => {
    switch (loginMethod) {
      case "loading":
        return (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              p: 4,
            }}
          >
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ ml: 2 }}>
              Processing login method...
            </Typography>
          </Box>
        );

      case "error":
        return (
          <Alert
            severity="error"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={switchToManualSelection}
                startIcon={<LocationOnIcon />}
              >
                Select Manually
              </Button>
            }
          >
            <Typography variant="body2">
              <strong>Login Error:</strong> {urlError}
            </Typography>
          </Alert>
        );

      case "lgd":
      case "location":
        return (
          <Alert
            severity="success"
            sx={{ mb: 3 }}
            action={
              <Button
                color="inherit"
                size="small"
                onClick={switchToManualSelection}
                startIcon={<LocationOnIcon />}
              >
                Change Location
              </Button>
            }
          >
            <Typography variant="body2">
              <strong>Panchayat Found:</strong> {selectedPanchayat?.name}
              <br />
              <small>
                {selectedPanchayat?.state} → {selectedPanchayat?.district} →{" "}
                {selectedPanchayat?.block}
                {selectedPanchayat?.lgdCode &&
                  ` (LGD: ${selectedPanchayat.lgdCode})`}
              </small>
            </Typography>
          </Alert>
        );

      case "manual":
        return (
          <Box sx={{ mb: 3 }}>
            <Typography
              variant="h6"
              gutterBottom
              sx={{ display: "flex", alignItems: "center", gap: 1 }}
            >
              <LocationOnIcon color="primary" />
              Select Your Panchayat
            </Typography>
            <CascadingLocationDropdowns
              mode="select"
              onLocationChange={handleManualLocationChange}
              required={["state", "district", "block", "panchayat"]}
              showCreateOptions={false}
              compact={true}
              variant="outlined"
              size="medium"
            />
          </Box>
        );

      default:
        return null;
    }
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

                {/* Login Method Content */}
                {renderLoginMethodContent()}

                {/* Voter ID Input */}
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

                {/* Camera Section */}
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
                        {selectedPanchayat
                          ? "Ready to start camera"
                          : strings.selectPanchayatFirst}
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

                      {isCameraActive && platformConfig.liveliness && (
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

                {/* Camera Info */}
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

                {/* Action Buttons */}
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
                          platformConfig.liveliness
                            ? !verificationState.blink.verified ||
                              !verificationState.movement.verified
                            : false
                        }
                        size="large"
                        sx={{ flex: 2 }}
                      >
                        {strings.takePhoto}
                      </Button>
                    </>
                  )}
                </Box>

                {/* URL Helper Section */}
                <Divider sx={{ my: 3 }} />
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    gutterBottom
                  >
                    Quick Access Methods:
                  </Typography>
                  <Stack
                    direction="row"
                    spacing={1}
                    justifyContent="center"
                    flexWrap="wrap"
                  >
                    <Chip
                      icon={<TagIcon />}
                      label="Use LGD Code: ?lgdCode=123456"
                      size="small"
                      variant="outlined"
                    />
                    <Chip
                      icon={<LocationOnIcon />}
                      label="Use Path: /State/District/Block/Panchayat"
                      size="small"
                      variant="outlined"
                    />
                  </Stack>
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
