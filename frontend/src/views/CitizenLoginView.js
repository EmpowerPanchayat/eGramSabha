// File: frontend/src/views/CitizenLoginView.js (Updated with better camera implementation)
import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import {
    Box,
    Typography,
    Button,
    Container,
    Alert,
    CircularProgress,
    Card,
    CardContent,
    Divider,
    Paper,
    Grid,
    Chip,
    TextField
} from '@mui/material';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import FaceIcon from '@mui/icons-material/Face';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import PanchayatSelector from '../components/PanchayatSelector';
import LanguageSwitcher from '../components/LanguageSwitcher';
import { useLanguage } from '../utils/LanguageContext';

const CitizenLoginView = ({ onLogin }) => {
    const { strings } = useLanguage();
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [error, setError] = useState('');
    const [selectedPanchayat, setSelectedPanchayat] = useState('');
    const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);
    const [faceDetected, setFaceDetected] = useState(false);
    const [voterIdLastFour, setVoterIdLastFour] = useState('');

    const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const streamRef = useRef(null);
    const detectionIntervalRef = useRef(null);
    const isMountedRef = useRef(true);

    // Set mounted state
    useEffect(() => {
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            // Cleanup on unmount
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
            if (detectionIntervalRef.current) {
                clearInterval(detectionIntervalRef.current);
            }
        };
    }, []);

    // Load face-api models
    useEffect(() => {
        const loadModels = async () => {
            try {
                // Use a CDN for models
                const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model';

                await Promise.all([
                    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                    faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                    faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
                ]);

                if (isMountedRef.current) {
                    setModelsLoaded(true);
                    console.log('Face-api models loaded successfully from CDN');
                }
            } catch (error) {
                console.error('Error loading models:', error);
                if (isMountedRef.current) {
                    setError('Error loading facial recognition models. Please refresh the page.');
                }
            }
        };

        loadModels();
    }, []);

    // Run face detection when camera is active
    useEffect(() => {
        if (isCameraActive && videoRef.current && canvasRef.current && modelsLoaded) {
            startFaceDetection();
        } else {
            stopFaceDetection();
        }
        
        return () => {
            stopFaceDetection();
        };
    }, [isCameraActive, modelsLoaded]);

    const startFaceDetection = () => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
        }

        if (!videoRef.current || !canvasRef.current || !modelsLoaded) {
            return;
        }

        // Setup canvas positioning and sizing
        const videoEl = videoRef.current;
        const canvasEl = canvasRef.current;
        
        // Position canvas over video
        canvasEl.style.position = 'absolute';
        canvasEl.style.top = '0';
        canvasEl.style.left = '0';
        canvasEl.width = videoEl.offsetWidth;
        canvasEl.height = videoEl.offsetHeight;

        // Run detection at regular intervals
        detectionIntervalRef.current = setInterval(async () => {
            if (!videoRef.current || !canvasRef.current || !isCameraActive) {
                return;
            }

            try {
                const detections = await faceapi.detectSingleFace(
                    videoRef.current,
                    new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
                ).withFaceLandmarks();

                // Clear previous drawings
                const context = canvasRef.current.getContext('2d');
                context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

                if (detections) {
                    // Face detected
                    setFaceDetected(true);
                    
                    // Draw the detections
                    const displaySize = { 
                        width: videoRef.current.offsetWidth, 
                        height: videoRef.current.offsetHeight 
                    };
                    
                    const resizedDetections = faceapi.resizeResults(detections, displaySize);
                    
                    // Draw face outline
                    context.beginPath();
                    context.lineWidth = 3;
                    context.strokeStyle = '#4CAF50';
                    
                    // Draw face box
                    const { _box: box } = resizedDetections.detection;
                    context.rect(box._x, box._y, box._width, box._height);
                    context.stroke();
                    
                    // Optional: Draw landmarks
                    if (resizedDetections.landmarks) {
                        context.fillStyle = '#4CAF50';
                        const landmarks = resizedDetections.landmarks.positions;
                        for (let i = 0; i < landmarks.length; i++) {
                            const { _x, _y } = landmarks[i];
                            context.beginPath();
                            context.arc(_x, _y, 2, 0, 2 * Math.PI);
                            context.fill();
                        }
                    }
                } else {
                    // No face detected
                    setFaceDetected(false);
                }
            } catch (error) {
                console.error('Face detection error:', error);
            }
        }, 100); // Run detection every 100ms
    };

    const stopFaceDetection = () => {
        if (detectionIntervalRef.current) {
            clearInterval(detectionIntervalRef.current);
            detectionIntervalRef.current = null;
        }
        setFaceDetected(false);
        
        // Clear canvas if it exists
        if (canvasRef.current) {
            const context = canvasRef.current.getContext('2d');
            context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    };

    const startCamera = async () => {
        setError('');
        setLoading(true);
        setCameraPermissionDenied(false);

        try {
            if (!selectedPanchayat) {
                setError(strings.selectPanchayat);
                setLoading(false);
                return;
            }

            if (!modelsLoaded) {
                setError(strings.errorLoadingModels);
                setLoading(false);
                return;
            }

            // Stop any existing stream
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }

            // Set camera active first to ensure DOM elements are rendered
            setIsCameraActive(true);

            // Short timeout to ensure DOM is updated before accessing video element
            await new Promise(resolve => setTimeout(resolve, 100));

            // Verify the video element exists
            if (!videoRef.current) {
                throw new Error('Video element not available after activation');
            }

            const constraints = {
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                },
                audio: false
            };

            console.log('Requesting camera access with constraints:', constraints);

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            
            if (!isMountedRef.current) return; // Component was unmounted during async operation
            
            if (!stream.active || stream.getTracks().length === 0) {
                throw new Error('Camera stream is not active or has no tracks');
            }

            streamRef.current = stream;

            // Connect stream to video element
            videoRef.current.srcObject = stream;
            videoRef.current.muted = true;
            videoRef.current.playsInline = true;
            
            // Play video element
            await videoRef.current.play();
            console.log('Video playback started successfully');
                
        } catch (error) {
            console.error('Error accessing camera:', error);
            setIsCameraActive(false);

            // Set more specific error messages
            if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
                setCameraPermissionDenied(true);
                setError(strings.cameraAccessDenied);
            } else if (error.name === 'NotFoundError') {
                setError(strings.noCameraFound);
            } else if (error.name === 'NotReadableError') {
                setError(strings.cameraInUse);
            } else if (error.name === 'OverconstrainedError') {
                setError(strings.cameraConstraints);
            } else if (error.name === 'AbortError') {
                setError(strings.cameraAborted);
            } else {
                setError(`${strings.cameraError}: ${error.message}`);
            }
        } finally {
            if (isMountedRef.current) {
                setLoading(false);
            }
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }

        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }

        stopFaceDetection();
        setIsCameraActive(false);
    };

    const captureImage = async () => {
        if (!videoRef.current || !isCameraActive) {
            setError(strings.cameraNotActive);
            return;
        }

        if (!voterIdLastFour || voterIdLastFour.length !== 4) {
            setError(strings.enterVoterId);
            return;
        }

        try {
            setLoading(true);

            // Check if face is detected
            if (!faceDetected) {
                setError(strings.noFaceInFrame);
                setLoading(false);
                return;
            }

            // Detect face before capturing
            const detections = await faceapi.detectSingleFace(
                videoRef.current,
                new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
            ).withFaceLandmarks().withFaceDescriptor();

            if (!detections) {
                setError(strings.faceNotRecognized);
                setLoading(false);
                return;
            }

            // Create a temporary canvas for the image capture
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = videoRef.current.videoWidth;
            tempCanvas.height = videoRef.current.videoHeight;
            const ctx = tempCanvas.getContext('2d');
            ctx.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);

            // Get the face descriptor
            const faceDescriptor = Array.from(detections.descriptor);

            // Convert canvas to data URL
            const imageDataURL = tempCanvas.toDataURL('image/jpeg');
            setCapturedImage(imageDataURL);

            // Stop camera after capturing image
            stopCamera();

            // Call API for face login
            try {
                const response = await fetch(`${API_URL}/citizens/face-login`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        faceDescriptor,
                        panchayatId: selectedPanchayat,
                        voterIdLastFour
                    })
                });

                const data = await response.json();

                if (!response.ok) {
                    // Map backend error messages to translation keys
                    const errorMessageMap = {
                        'Valid face descriptor is required for authentication': strings.errorValidFaceDescriptor,
                        'Last 4 digits of voter ID are required': strings.errorVoterIdRequired,
                        'Panchayat not found': strings.errorPanchayatNotFound,
                        'No registered users found with matching voter ID': strings.errorNoRegisteredUsers,
                        'Multiple potential matches found. Please try again or contact administrator.': strings.errorMultipleMatches,
                        'Face not recognized. Please try again or contact administrator.': strings.errorFaceNotRecognized,
                        'User registration incomplete. Please contact administrator.': strings.errorUserRegistrationIncomplete,
                        'User not found': strings.errorUserNotFound,
                        'Error fetching citizen profile': strings.errorFetchingProfile,
                        'Error during face authentication': strings.errorFaceAuthentication
                    };

                    const translatedMessage = errorMessageMap[data.message] || strings.faceAuthFailed;
                    throw new Error(translatedMessage);
                }

                // Successful login
                if (onLogin) {
                    onLogin(data.user);
                }
            } catch (error) {
                console.error('Login error:', error);
                setError(error.message || strings.faceNotRecognized);
                setCapturedImage(null);
            }
        } catch (error) {
            console.error('Error capturing image:', error);
            setError(error.message || strings.errorCapturingImage);
        } finally {
            setLoading(false);
        }
    };

    const retakePhoto = () => {
        setCapturedImage(null);
        setError('');
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
                                    backgroundColor: 'primary.main', 
                                    color: 'white',
                                    borderTopLeftRadius: 8,
                                    borderTopRightRadius: 8,
                                    textAlign: 'center',
                                    position: 'relative'
                                }}
                            >
                                <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
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
                                            startAdornment: <AccountBalanceIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                        }}
                                    />
                                </Box>

                                <Box sx={{ mb: 3 }}>
                                    <TextField
                                        fullWidth
                                        label={strings.voterIdLastFour}
                                        value={voterIdLastFour}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                            setVoterIdLastFour(value);
                                        }}
                                        required
                                        error={voterIdLastFour.length > 0 && voterIdLastFour.length !== 4}
                                        helperText={voterIdLastFour.length > 0 && voterIdLastFour.length !== 4 ? strings.exactlyFourDigits : ""}
                                        InputProps={{
                                            startAdornment: <AccountCircleIcon sx={{ mr: 1, color: 'text.secondary' }} />
                                        }}
                                    />
                                </Box>

                                {/* Face Recognition UI */}
                                <Paper 
                                    elevation={2}
                                    sx={{
                                        position: 'relative',
                                        width: '100%',
                                        aspectRatio: '4/3',
                                        backgroundColor: 'grey.100',
                                        display: 'flex',
                                        justifyContent: 'center',
                                        alignItems: 'center',
                                        borderRadius: 2,
                                        overflow: 'hidden',
                                        mb: 3,
                                        border: faceDetected ? '2px solid #4CAF50' : '2px solid transparent'
                                    }}
                                >
                                    {!isCameraActive && !capturedImage && (
                                        <Box sx={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            alignItems: 'center',
                                            color: 'text.secondary',
                                            p: 3,
                                            textAlign: 'center'
                                        }}>
                                            <FaceIcon sx={{ fontSize: 80, mb: 2, color: 'primary.main' }} />
                                            <Typography variant="body1" gutterBottom>
                                                {strings.positionFace}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                {strings.selectPanchayatFirst}
                                            </Typography>
                                        </Box>
                                    )}

                                    {isCameraActive && (
                                        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                                            <video
                                                ref={videoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            <canvas
                                                ref={canvasRef}
                                                style={{
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    width: '100%',
                                                    height: '100%'
                                                }}
                                            />
                                            
                                            <Chip
                                                label={faceDetected ? strings.faceDetected : strings.noFaceDetected}
                                                color={faceDetected ? "success" : "default"}
                                                icon={<FaceIcon />}
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 16,
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    opacity: 0.9
                                                }}
                                            />
                                        </Box>
                                    )}

                                    {capturedImage && (
                                        <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
                                            <Box
                                                component="img"
                                                src={capturedImage}
                                                alt="Captured face"
                                                sx={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover'
                                                }}
                                            />
                                            <Chip
                                                label={strings.imageCaptured}
                                                color="primary"
                                                sx={{
                                                    position: 'absolute',
                                                    bottom: 16,
                                                    left: '50%',
                                                    transform: 'translateX(-50%)',
                                                    opacity: 0.9
                                                }}
                                            />
                                        </Box>
                                    )}

                                    {loading && (
                                        <Box sx={{
                                            position: 'absolute',
                                            top: 0,
                                            left: 0,
                                            right: 0,
                                            bottom: 0,
                                            display: 'flex',
                                            flexDirection: 'column',
                                            justifyContent: 'center',
                                            alignItems: 'center',
                                            backgroundColor: 'rgba(0, 0, 0, 0.6)',
                                            color: 'white'
                                        }}>
                                            <CircularProgress color="inherit" size={60} sx={{ mb: 2 }} />
                                            <Typography variant="body2">
                                                {isCameraActive ? strings.startingCamera : strings.processing}
                                            </Typography>
                                        </Box>
                                    )}
                                </Paper>

                                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2 }}>
                                    {!isCameraActive && !capturedImage && (
                                        <Button
                                            variant="contained"
                                            color="primary"
                                            startIcon={<CameraAltIcon />}
                                            onClick={startCamera}
                                            disabled={loading || !selectedPanchayat}
                                            fullWidth
                                            size="large"
                                            sx={{ py: 1.5 }}
                                        >
                                            {strings.startCamera}
                                        </Button>
                                    )}

                                    {isCameraActive && !capturedImage && (
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
                                                disabled={loading || !faceDetected}
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