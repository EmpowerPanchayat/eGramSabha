import React, { useState, useRef, useEffect } from 'react';
import { IconButton, Box, CircularProgress, Tooltip } from '@mui/material';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import PauseIcon from '@mui/icons-material/Pause';
import MicIcon from '@mui/icons-material/Mic';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

const AudioPlayer = ({ audioUrl, authToken }) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const audioRef = useRef(null);

    useEffect(() => {
        // Cleanup function to stop audio when component unmounts
        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current = null;
            }
        };
    }, []);

    const handlePlayPause = async (e) => {
        // Stop event propagation to prevent row click
        e.stopPropagation();

        if (!audioRef.current) {
            setLoading(true);
            try {
                const response = await fetch(audioUrl, {
                    headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : undefined
                });
                if (!response.ok) throw new Error('Failed to fetch audio');
                const data = await response.json();

                if (!data.success || !data.attachment) {
                    throw new Error('Invalid audio data');
                }

                audioRef.current = new Audio(data.attachment.attachment);
                audioRef.current.onended = () => setIsPlaying(false);
                audioRef.current.play();
                setIsPlaying(true);
            } catch (err) {
                console.error('Audio playback error:', err);
                setError(err.message);
            } finally {
                setLoading(false);
            }
        } else {
            if (isPlaying) {
                audioRef.current.pause();
            } else {
                audioRef.current.play();
            }
            setIsPlaying(!isPlaying);
        }
    };

    if (loading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    minWidth: 32
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <CircularProgress size={24} />
            </Box>
        );
    }

    if (error) {
        return (
            <Tooltip title={`Error: ${error}`}>
                <Box
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        cursor: 'default'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <ErrorOutlineIcon color="error" fontSize="small" />
                </Box>
            </Tooltip>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1
            }}
            onClick={(e) => e.stopPropagation()}
        >
            <IconButton
                size="small"
                onClick={handlePlayPause}
                color="primary"
            >
                {isPlaying ? <PauseIcon /> : <PlayArrowIcon />}
            </IconButton>
        </Box>
    );
};

export default AudioPlayer;