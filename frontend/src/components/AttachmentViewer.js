// frontend/src/components/AttachmentViewer.js
import React, { useState, useEffect } from 'react';
import {
    Box,
    Button,
    Typography,
    CircularProgress,
    Alert
} from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';
import FileOpenIcon from '@mui/icons-material/FileOpen';
import tokenManager from '../utils/tokenManager';

const AttachmentViewer = ({ attachmentUrl, filename, mimeType }) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [attachmentData, setAttachmentData] = useState(null);

      // Helper to get Authorization header for issues endpoints
    const getAuthHeaders = () => {
        const token = tokenManager.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    };
    

    useEffect(() => {
        const fetchAttachment = async () => {
            if (!attachmentUrl) return;

            setLoading(true);
            setError(null);

            try {
              // Add Authorization header if token exists
              const headers = {
                "Content-Type": "application/json",
                ...getAuthHeaders(),
              };
              const response = await fetch(attachmentUrl, {
                method: "GET",
                headers: headers,
              });

              if (!response.ok) {
                throw new Error("Failed to fetch attachment");
              }

              const data = await response.json();

              if (data.success && data.attachment) {
                setAttachmentData(data.attachment);
              } else {
                throw new Error("Invalid attachment data");
              }
            } catch (error) {
                console.error('Error fetching attachment:', error);
                setError(error.message || 'Error loading attachment');
            } finally {
                setLoading(false);
            }
        };

        fetchAttachment();
    }, [attachmentUrl]);

    // Function to download attachment
    const handleDownload = () => {
        if (!attachmentData || !attachmentData.attachment) return;

        // Create a link element
        const link = document.createElement('a');
        link.href = attachmentData.attachment;
        link.download = attachmentData.filename || filename || 'download';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                <CircularProgress size={40} />
            </Box>
        );
    }

    if (error) {
        return (
            <Alert severity="error" sx={{ mb: 2 }}>
                {error}
            </Alert>
        );
    }

    if (!attachmentData) {
        return null;
    }

    // Determine content type
    const contentType = attachmentData.mimeType || mimeType;
    const dataUrl = attachmentData.attachment;

    return (
        <Box sx={{ width: '100%', mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="subtitle2">
                    {attachmentData.filename || filename || 'Attachment'}
                </Typography>
                <Button
                    variant="outlined"
                    size="small"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                >
                    Download
                </Button>
            </Box>

            {contentType && contentType.startsWith('image/') ? (
                <Box
                    component="img"
                    src={dataUrl}
                    alt={filename || 'Image attachment'}
                    sx={{
                        maxWidth: '100%',
                        maxHeight: '400px',
                        objectFit: 'contain',
                        borderRadius: 1,
                        border: '1px solid #eee'
                    }}
                />
            ) : contentType && contentType.startsWith('audio/') ? (
                <Box
                    component="audio"
                    controls
                    src={dataUrl}
                    sx={{ width: '100%' }}
                />
            ) : contentType && contentType.startsWith('video/') ? (
                <Box
                    component="video"
                    controls
                    src={dataUrl}
                    sx={{ width: '100%', maxHeight: '400px' }}
                />
            ) : (
                <Button
                    variant="outlined"
                    fullWidth
                    startIcon={<FileOpenIcon />}
                    onClick={handleDownload}
                    sx={{ py: 2 }}
                >
                    Open File
                </Button>
            )}
        </Box>
    );
};

export default AttachmentViewer;