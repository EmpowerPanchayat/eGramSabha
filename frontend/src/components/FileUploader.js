// File: frontend/src/components/FileUploader.js
import React, { useState, useRef } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    IconButton,
    Alert,
    CircularProgress
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import ImageIcon from '@mui/icons-material/Image';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import { useLanguage } from '../utils/LanguageContext';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const FileUploader = ({ onFilesSelected, onReset }) => {
    const { strings } = useLanguage();
    const [files, setFiles] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileChange = (event) => {
        setError('');
        const selectedFiles = Array.from(event.target.files);

        // Check file size
        const oversizedFiles = selectedFiles.filter(file => file.size > MAX_FILE_SIZE);
        if (oversizedFiles.length > 0) {
            setError(`File(s) too large. Maximum size is 5MB per file.`);
            return;
        }

        setLoading(true);

        // Process files to get previews and base64 data
        const filePromises = selectedFiles.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();

                reader.onload = (e) => {
                    resolve({
                        file: file,
                        name: file.name,
                        type: file.type,
                        size: file.size,
                        base64: e.target.result
                    });
                };

                reader.readAsDataURL(file);
            });
        });

        Promise.all(filePromises)
            .then(processedFiles => {
                setFiles(prev => [...prev, ...processedFiles]);
                onFilesSelected(processedFiles);
            })
            .catch(err => {
                console.error('Error processing files:', err);
                setError('Error processing files.');
            })
            .finally(() => {
                setLoading(false);
                // Clear the file input to allow selecting the same file again
                if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                }
            });
    };

    const handleRemoveFile = (index) => {
        const updatedFiles = [...files];
        updatedFiles.splice(index, 1);
        setFiles(updatedFiles);

        // Notify parent component
        onFilesSelected(updatedFiles);
    };

    const resetFiles = () => {
        setFiles([]);
        setError('');

        // Notify parent component
        if (onReset) {
            onReset();
        }
    };

    // Get appropriate icon based on file type
    const getFileIcon = (fileType) => {
        if (fileType.startsWith('image/')) {
            return <ImageIcon />;
        } else if (fileType === 'application/pdf') {
            return <PictureAsPdfIcon />;
        } else {
            return <InsertDriveFileIcon />;
        }
    };

    // Format file size in KB or MB
    const formatFileSize = (bytes) => {
        if (bytes < 1024) {
            return bytes + ' B';
        } else if (bytes < 1024 * 1024) {
            return (bytes / 1024).toFixed(1) + ' KB';
        } else {
            return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
        }
    };

    return (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
                {strings.addAttachment}
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            <Box sx={{ mb: 2 }}>
                <input
                    type="file"
                    accept="image/*,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    multiple
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                    ref={fileInputRef}
                    disabled={loading}
                />
                <Button
                    variant="outlined"
                    startIcon={<UploadFileIcon />}
                    onClick={() => fileInputRef.current.click()}
                    disabled={loading}
                    fullWidth
                    sx={{ mb: 1 }}
                >
                    {loading ? <CircularProgress size={24} /> : strings.uploadImage}
                </Button>
            </Box>

            {files.length > 0 && (
                <List dense>
                    {files.map((file, index) => (
                        <ListItem
                            key={index}
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={() => handleRemoveFile(index)}>
                                    <DeleteIcon />
                                </IconButton>
                            }
                            sx={{
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                mb: 1
                            }}
                        >
                            <ListItemIcon>
                                {getFileIcon(file.type)}
                            </ListItemIcon>
                            <ListItemText
                                primary={file.name}
                                secondary={formatFileSize(file.size)}
                                primaryTypographyProps={{
                                    noWrap: true,
                                    style: { maxWidth: '180px' }
                                }}
                            />
                        </ListItem>
                    ))}
                </List>
            )}
        </Paper>
    );
};

export default FileUploader;