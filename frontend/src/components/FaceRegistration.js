// File: frontend/src/components/FaceRegistration.js (Updated to include panchayatId)
import React, { useState, useRef, useEffect } from 'react';
import * as faceapi from 'face-api.js';
import { registerFace } from '../api';
import {
  Box,
  Button,
  Paper,
  Typography,
  Alert,
  AlertTitle,
  Stack,
  Grid,
  Chip,
  Divider
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import SwitchCameraIcon from '@mui/icons-material/SwitchCamera';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import StopCircleIcon from '@mui/icons-material/StopCircle';

const FaceRegistration = ({ user, modelsLoaded, onUserUpdate, setMessage, setLoading }) => {
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameras, setCameras] = useState([]);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [facingMode, setFacingMode] = useState('user'); // 'user' for front camera, 'environment' for back camera
  const videoRef = useRef();
  const canvasRef = useRef();

  // Get available cameras when component mounts
  useEffect(() => {
    const getCameras = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
          console.log("enumerateDevices() not supported.");
          return;
        }

        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);

        if (videoDevices.length > 0) {
          console.log('Available cameras:', videoDevices);
        }
      } catch (error) {
        console.error('Error getting cameras:', error);
      }
    };

    getCameras();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start camera with specified facing mode
  const startCamera = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please select a member first.' });
      return;
    }

    if (!modelsLoaded) {
      setMessage({ type: 'error', text: 'Facial recognition models are not loaded yet.' });
      return;
    }

    try {
      // First, make sure any previous streams are stopped
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: facingMode
        }
      };

      // If specific camera ID is selected and available
      if (currentCamera && cameras.length > 0) {
        constraints.video.deviceId = { exact: currentCamera };
      }

      console.log('Using camera constraints:', constraints);

      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      // Set stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;

        // Make sure the video is fully loaded and playing before setting up detection
        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch(e => {
            console.error('Error playing video:', e);
            setMessage({ type: 'error', text: 'Error starting video: ' + e.message });
          });
        };

        // When video is playing, set up face detection
        videoRef.current.onplaying = () => {
          setIsCameraActive(true);
          console.log('Video is now playing, setting up face detection');

          const canvas = canvasRef.current;
          if (!canvas) {
            console.error('Canvas reference is not available');
            return;
          }

          const displaySize = {
            width: videoRef.current.videoWidth,
            height: videoRef.current.videoHeight
          };

          console.log('Display size:', displaySize);

          // Match dimensions
          faceapi.matchDimensions(canvas, displaySize);

          // Set up detection interval
          const detectionInterval = setInterval(async () => {
            if (!videoRef.current || videoRef.current.paused || videoRef.current.ended || !canvasRef.current) {
              clearInterval(detectionInterval);
              return;
            }

            try {
              // Make sure video is ready for processing
              if (videoRef.current.readyState === 4) {
                const detections = await faceapi.detectSingleFace(
                  videoRef.current,
                  new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 })
                ).withFaceLandmarks().withFaceDescriptor();

                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);

                if (detections) {
                  const resizedDetections = faceapi.resizeResults(detections, displaySize);
                  faceapi.draw.drawDetections(canvas, resizedDetections);
                  faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);
                }
              }
            } catch (error) {
              console.error('Error in face detection:', error);
              clearInterval(detectionInterval);
              setMessage({ type: 'error', text: 'Face detection error: ' + error.message });
            }
          }, 100);

          // Clean up the interval when component unmounts
          return () => clearInterval(detectionInterval);
        };
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setMessage({ type: 'error', text: 'Error accessing camera: ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  // Switch camera
  const switchCamera = () => {
    if (cameras.length <= 1) {
      setMessage({ type: 'error', text: 'No additional cameras available.' });
      return;
    }

    // Toggle between front and back camera
    const newFacingMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacingMode);

    // If camera is active, restart it with new facing mode
    if (isCameraActive) {
      stopCamera();
      setTimeout(() => {
        startCamera();
      }, 300); // Small delay to ensure previous camera is fully stopped
    }
  };

  // Stop camera
  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  };

  // Register face
  const handleRegisterFace = async () => {
    if (!user) {
      setMessage({ type: 'error', text: 'Please select a member first.' });
      return;
    }

    if (!videoRef.current || !videoRef.current.srcObject) {
      setMessage({ type: 'error', text: 'Please start the camera first.' });
      return;
    }

    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      // Make sure video is ready for processing
      if (videoRef.current.readyState !== 4) {
        throw new Error('Video feed is not ready yet. Please wait a moment and try again.');
      }

      console.log('Attempting face detection for registration');

      const detections = await faceapi.detectSingleFace(
        videoRef.current,
        new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.6 })
      ).withFaceLandmarks().withFaceDescriptor();

      if (!detections) {
        setMessage({ type: 'error', text: 'No face detected. Please make sure your face is clearly visible.' });
        setLoading(false);
        return;
      }

      console.log('Face detected, creating descriptor');
      const faceDescriptor = Array.from(detections.descriptor);

      // Capture face image
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const faceImage = canvas.toDataURL('image/jpeg');

      console.log('Face image data length:', faceImage.length); // Check that it's not empty
      console.log('Sending face data to server for voter ID:', user.voterIdNumber);
      console.log('Using panchayatId:', user.panchayatId);

      console.log('Sending face descriptor to server');
      const response = await registerFace(
        user.voterIdNumber,
        faceDescriptor,
        faceImage,
        user.panchayatId  // Added panchayatId parameter
      );

      console.log('Server response:', response);
      setMessage({ type: 'success', text: response.message });
      stopCamera();

      // Update user
      onUserUpdate({ ...user, isRegistered: true });
    } catch (error) {
      console.error('Error registering face:', error);
      setMessage({
        type: 'error',
        text: error.message || 'Error registering face'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper elevation={2} sx={{ p: 3 }}>
      <Typography variant="h6" gutterBottom>
        Face Registration
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>Instructions for Good Photo Capture</AlertTitle>
        <ol>
          <li>Ensure proper lighting—avoid shadows and overly bright areas.</li>
          <li>Keep your face fully visible, looking straight at the camera with a neutral expression.</li>
          <li>Remove hats, sunglasses, or face coverings for clear recognition.</li>
          <li>Use a plain, light-colored background without patterns or distractions.</li>
        </ol>
      </Alert>

      <Box
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '4/3', // Add this instead of fixed height
          backgroundColor: 'grey.200',
          borderRadius: 1,
          overflow: 'hidden',
          mb: 3,
          display: 'flex',  // Add this
          justifyContent: 'center',  // Add this 
          alignItems: 'center'  // Add this
        }}
      >
        <Box
          component="video"
          ref={videoRef}
          autoPlay
          muted
          sx={{
            width: '100%',
            height: '100%',
            objectFit: 'contain' // Change from 'cover' to 'contain'
          }}
        />
        <Box
          component="canvas"
          ref={canvasRef}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%'
          }}
        />
      </Box>

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        justifyContent="center"
        sx={{ mb: 3 }}
      >
        {!isCameraActive ? (
          <Button
            variant="contained"
            size="large"
            startIcon={<PhotoCameraIcon />}
            onClick={startCamera}
            fullWidth
          >
            Start Camera
          </Button>
        ) : (
          <>
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={<HowToRegIcon />}
              onClick={handleRegisterFace}
              fullWidth
            >
              Register Face
            </Button>

            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<StopCircleIcon />}
              onClick={stopCamera}
              fullWidth
            >
              Stop Camera
            </Button>

            {cameras.length > 1 && (
              <Button
                variant="outlined"
                color="primary"
                size="large"
                startIcon={<SwitchCameraIcon />}
                onClick={switchCamera}
                fullWidth
              >
                Switch Camera
              </Button>
            )}
          </>
        )}
      </Stack>

      {cameras.length > 0 && (
        <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
          <Typography variant="body2" color="text.secondary">
            Camera: {facingMode === 'user' ? 'Front-facing' : 'Back-facing'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Available cameras: {cameras.length}
          </Typography>
        </Paper>
      )}
    </Paper>
  );
};

export default FaceRegistration;