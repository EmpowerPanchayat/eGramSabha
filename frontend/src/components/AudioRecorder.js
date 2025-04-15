// File: frontend/src/components/AudioRecorder.js
import React, { useState, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    Alert,
    CircularProgress,
    Paper
} from '@mui/material';
import MicIcon from '@mui/icons-material/Mic';
import StopIcon from '@mui/icons-material/Stop';
import DeleteIcon from '@mui/icons-material/Delete';
import { useLanguage } from '../utils/LanguageContext';

const AudioRecorder = ({ onAudioRecorded, onReset }) => {
    const { strings } = useLanguage();
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState('');
    const [audioBlob, setAudioBlob] = useState(null);
    const [recordingTime, setRecordingTime] = useState(0);
    const [error, setError] = useState('');
    const [processing, setProcessing] = useState(false);

    const mediaRecorderRef = useRef(null);
    const streamRef = useRef(null);
    const chunksRef = useRef([]);
    const timerRef = useRef(null);

    const startRecording = async () => {
        setError('');
        setProcessing(true);

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;

            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/wav' });
                const audioUrl = URL.createObjectURL(audioBlob);
                setAudioURL(audioUrl);
                setAudioBlob(audioBlob);

                // Clear timer
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                }

                // Notify parent component
                onAudioRecorded(audioBlob);

                // Stop all tracks
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            };

            // Start recording
            mediaRecorderRef.current.start();
            setIsRecording(true);
            setRecordingTime(0);

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('Error accessing microphone:', error);
            setError(strings.errorAudioAccess);
        } finally {
            setProcessing(false);
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const resetRecording = () => {
        if (audioURL) {
            URL.revokeObjectURL(audioURL);
        }

        setAudioURL('');
        setAudioBlob(null);
        setRecordingTime(0);
        setError('');

        // Notify parent component
        if (onReset) {
            onReset();
        }
    };

    // Format recording time as MM:SS
    const formatTime = (seconds) => {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
                {strings.captureAudio}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                {!isRecording && !audioURL && (
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<MicIcon />}
                        onClick={startRecording}
                        disabled={processing}
                    >
                        {processing ? (
                            <CircularProgress size={24} color="inherit" />
                        ) : (
                            strings.startRecording
                        )}
                    </Button>
                )}

                {isRecording && (
                    <>
                        <Box sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            p: 1,
                            borderRadius: '50%',
                            bgcolor: 'error.main',
                            color: 'white',
                            animation: 'pulse 1.5s infinite',
                            mr: 2,
                            width: 16,
                            height: 16,
                            '@keyframes pulse': {
                                '0%': {
                                    opacity: 0.7,
                                    transform: 'scale(0.9)',
                                },
                                '50%': {
                                    opacity: 1,
                                    transform: 'scale(1.1)',
                                },
                                '100%': {
                                    opacity: 0.7,
                                    transform: 'scale(0.9)',
                                },
                            },
                        }}>
                        </Box>
                        <Typography variant="body1" sx={{ mr: 2 }}>
                            {formatTime(recordingTime)}
                        </Typography>
                        <Button
                            variant="contained"
                            color="error"
                            startIcon={<StopIcon />}
                            onClick={stopRecording}
                        >
                            {strings.stopRecording}
                        </Button>
                    </>
                )}

                {audioURL && (
                    <Box sx={{ width: '100%' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <audio controls src={audioURL} style={{ width: '100%' }} />
                            <Button
                                variant="outlined"
                                color="error"
                                startIcon={<DeleteIcon />}
                                onClick={resetRecording}
                                sx={{ ml: 1 }}
                            >
                                {strings.delete}
                            </Button>
                        </Box>
                        <Typography variant="caption" color="success.main">
                            {strings.audioRecorded}
                        </Typography>
                    </Box>
                )}
            </Box>
        </Paper>
    );
};

export default AudioRecorder;