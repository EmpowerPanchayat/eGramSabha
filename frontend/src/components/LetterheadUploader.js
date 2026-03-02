import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Typography,
  Button,
  FormControl,
  FormControlLabel,
  RadioGroup,
  Radio,
  Alert,
  CircularProgress,
  Paper,
  Stack,
  Chip,
  Divider,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Card,
  CardContent,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  Image as ImageIcon,
  CheckCircle as CheckCircleIcon,
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
  ArrowForward as ArrowForwardIcon,
  Refresh as RefreshIcon,
  ViewHeadline as HeaderIcon,
  Wallpaper as BackgroundIcon,
  Info as InfoIcon,
  Settings as SettingsIcon,
  Preview as PreviewIcon,
  Edit as EditIcon
} from '@mui/icons-material';
import { useLanguage } from '../utils/LanguageContext';
import LetterheadPreview from './LetterheadPreview';

// Margin presets for quick selection
const MARGIN_PRESETS = {
  default: { top: 1.5, bottom: 0.5, left: 0.5, right: 0.5 },
  compact: { top: 1.0, bottom: 0.3, left: 0.3, right: 0.3 },
  spacious: { top: 2.0, bottom: 0.75, left: 0.75, right: 0.75 },
  standard: { top: 1.5, bottom: 0.5, left: 0.75, right: 0.75 }
};

const LetterheadUploader = ({
  panchayatId,
  initialConfig,
  onUploadComplete,
  onConfigChange,
  onDelete,
  disabled = false
}) => {
  const { strings } = useLanguage();
  const fileInputRef = useRef(null);

  // Helper function to get translated preset labels
  const getPresetLabel = (key) => {
    const labels = {
      default: strings.presetDefault || 'Default',
      compact: strings.presetCompact || 'Compact',
      spacious: strings.presetSpacious || 'Spacious',
      standard: strings.presetStandardA4 || 'Standard A4'
    };
    return labels[key] || key;
  };
  const isInitialMount = useRef(true);

  // Stepper state
  const [activeStep, setActiveStep] = useState(0);

  const [letterheadType, setLetterheadType] = useState(initialConfig?.letterheadType || 'header');
  const [margins, setMargins] = useState(initialConfig?.margins || MARGIN_PRESETS.default);
  const [imageTransform, setImageTransform] = useState(initialConfig?.imageTransform || {
    scale: 1,
    x: 0,
    y: 0
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('default');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Load existing letterhead preview URL if available
  useEffect(() => {
    if (initialConfig?.letterheadImageId && panchayatId) {
      const token = localStorage.getItem('token');
      fetch(`${API_URL}/panchayats/${panchayatId}/letterhead/base64`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.base64) {
            setPreviewUrl(data.data.base64);
            // Only set activeStep to 1 on initial mount, not after saves
            // After saves, we want to stay on step 2 (Review) to show the final preview
            if (isInitialMount.current) {
              setActiveStep(1);
              isInitialMount.current = false;
            }
          }
        })
        .catch(err => console.warn('Could not load letterhead preview:', err));
    }
  }, [initialConfig?.letterheadImageId, panchayatId, API_URL]);

  // Update local state when initialConfig changes
  useEffect(() => {
    if (initialConfig) {
      setLetterheadType(initialConfig.letterheadType || 'header');
      setMargins(initialConfig.margins || MARGIN_PRESETS.default);
      setImageTransform(initialConfig.imageTransform || { scale: 1, x: 0, y: 0 });
    }
  }, [initialConfig]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!['image/png', 'image/jpeg'].includes(file.type)) {
      setError(strings.onlyPngJpegAllowed || 'Only PNG and JPEG images are allowed');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setError(strings.fileTooLarge || 'File size must be less than 2MB');
      return;
    }

    setSelectedFile(file);
    setError('');
    // Reset transform when new file is selected
    setImageTransform({ scale: 1, x: 0, y: 0 });

    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target.result);
      // Automatically move to step 2 after selecting file
      setActiveStep(1);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile || !panchayatId) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('letterheadType', letterheadType);
      formData.append('margins', JSON.stringify(margins));
      formData.append('imageTransform', JSON.stringify(imageTransform));

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/panchayats/${panchayatId}/letterhead`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to upload letterhead');
      }

      setSuccess(strings.letterheadUploaded || 'Letterhead uploaded and activated successfully!');
      setSelectedFile(null);
      // Mark as no longer initial mount so the useEffect won't reset step
      isInitialMount.current = false;
      setActiveStep(2); // Move to final step

      if (onUploadComplete) {
        onUploadComplete(data.data.letterheadConfig);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfigUpdate = async () => {
    if (!panchayatId || !initialConfig?.letterheadImageId) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/panchayats/${panchayatId}/letterhead/config`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ letterheadType, margins, imageTransform })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update configuration');
      }

      setSuccess(strings.letterheadConfigUpdated || 'Letterhead settings saved successfully!');
      // Mark as no longer initial mount so the useEffect won't reset step
      isInitialMount.current = false;
      setActiveStep(2); // Move to final step

      if (onConfigChange) {
        onConfigChange(data.data.letterheadConfig);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!panchayatId || !initialConfig?.letterheadImageId) return;

    if (!window.confirm(strings.confirmDeleteLetterhead || 'Are you sure you want to delete the letterhead? This will remove it from all official documents.')) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/panchayats/${panchayatId}/letterhead`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete letterhead');
      }

      setSuccess(strings.letterheadDeleted || 'Letterhead deleted successfully');
      setPreviewUrl(null);
      setSelectedFile(null);
      setImageTransform({ scale: 1, x: 0, y: 0 });
      setActiveStep(0); // Reset to first step

      if (onDelete) {
        onDelete();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarginsChange = (newMargins) => {
    setMargins(newMargins);
    setSelectedPreset('custom');
  };

  const handleImageTransformChange = (newTransform) => {
    setImageTransform(newTransform);
  };

  const handlePresetSelect = (presetKey) => {
    setSelectedPreset(presetKey);
    const preset = MARGIN_PRESETS[presetKey];
    setMargins({ top: preset.top, bottom: preset.bottom, left: preset.left, right: preset.right });
  };

  const handleResetToDefaults = () => {
    setMargins(MARGIN_PRESETS.default);
    setImageTransform({ scale: 1, x: 0, y: 0 });
    setSelectedPreset('default');
  };

  const hasExistingLetterhead = !!initialConfig?.letterheadImageId;
  const hasChanges = selectedFile ||
    letterheadType !== (initialConfig?.letterheadType || 'header') ||
    JSON.stringify(margins) !== JSON.stringify(initialConfig?.margins || MARGIN_PRESETS.default) ||
    JSON.stringify(imageTransform) !== JSON.stringify(initialConfig?.imageTransform || { scale: 1, x: 0, y: 0 });

  // Step definitions
  const steps = [
    {
      label: strings.step1Upload || 'Upload Image',
      description: strings.step1Desc || 'Select letterhead image and choose display mode'
    },
    {
      label: strings.step2Adjust || 'Adjust Settings',
      description: strings.step2Desc || 'Configure margins and position'
    },
    {
      label: strings.step3Review || 'Review & Apply',
      description: strings.step3Desc || 'Preview and save your letterhead'
    }
  ];

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Status Banner */}
      {hasExistingLetterhead && (
        <Paper
          sx={{
            p: 2,
            mb: 3,
            bgcolor: 'success.50',
            border: '1px solid',
            borderColor: 'success.200',
            borderRadius: 2
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CheckCircleIcon sx={{ color: 'success.main', mr: 1.5 }} />
              <Box>
                <Typography variant="subtitle1" fontWeight="bold" color="success.dark">
                  {strings.letterheadActive || 'Letterhead Active'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {strings.letterheadActiveDesc || 'Your letterhead is being used on official documents'}
                </Typography>
              </Box>
            </Box>
            <Chip
              label={letterheadType === 'header' ? (strings.headerOnly || 'Header Only') : (strings.fullBackground || 'Full Background')}
              color="success"
              size="small"
              variant="outlined"
            />
          </Stack>
        </Paper>
      )}

      {/* Stepper */}
      <Stepper activeStep={activeStep} orientation="vertical" sx={{ mb: 3 }}>
        {/* Step 1: Upload */}
        <Step>
          <StepLabel
            optional={
              <Typography variant="caption" color="text.secondary">
                {steps[0].description}
              </Typography>
            }
          >
            <Typography fontWeight="medium">{steps[0].label}</Typography>
          </StepLabel>
          <StepContent>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                {/* File Upload Section */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <UploadIcon sx={{ mr: 1, fontSize: 20 }} />
                    {strings.selectImage || 'Select Image'}
                  </Typography>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    disabled={disabled || loading}
                  />
                  <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 1 }}>
                    <Button
                      variant="contained"
                      startIcon={<UploadIcon />}
                      onClick={() => fileInputRef.current?.click()}
                      disabled={disabled || loading}
                    >
                      {strings.chooseFile || 'Choose File'}
                    </Button>
                    {selectedFile && (
                      <Chip
                        icon={<ImageIcon />}
                        label={selectedFile.name.length > 20 ? selectedFile.name.substring(0, 20) + '...' : selectedFile.name}
                        color="primary"
                        onDelete={() => {
                          setSelectedFile(null);
                          setPreviewUrl(null);
                        }}
                      />
                    )}
                    {hasExistingLetterhead && !selectedFile && (
                      <Chip
                        icon={<CheckCircleIcon />}
                        label={strings.currentImage || 'Current image loaded'}
                        color="success"
                        variant="outlined"
                      />
                    )}
                  </Stack>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                    {strings.fileRequirements || 'PNG or JPEG, max 2MB. Recommended: 2480 x 500px for header, 2480 x 3508px (A4) for full background.'}
                  </Typography>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Letterhead Type Selection */}
                <Box>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    <SettingsIcon sx={{ mr: 1, fontSize: 20 }} />
                    {strings.displayMode || 'Display Mode'}
                  </Typography>
                  <FormControl component="fieldset" disabled={disabled || loading}>
                    <RadioGroup
                      value={letterheadType}
                      onChange={(e) => setLetterheadType(e.target.value)}
                    >
                      <Paper variant="outlined" sx={{ p: 2, mb: 1, cursor: 'pointer' }} onClick={() => !disabled && setLetterheadType('header')}>
                        <FormControlLabel
                          value="header"
                          control={<Radio />}
                          label={
                            <Box sx={{ ml: 1 }}>
                              <Typography variant="body1" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
                                <HeaderIcon sx={{ mr: 1, color: 'primary.main' }} />
                                {strings.headerOnly || 'Header Only'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {strings.headerOnlyDesc || 'Image appears at the top of the document. Best for logos and headers.'}
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                      <Paper variant="outlined" sx={{ p: 2, cursor: 'pointer' }} onClick={() => !disabled && setLetterheadType('background')}>
                        <FormControlLabel
                          value="background"
                          control={<Radio />}
                          label={
                            <Box sx={{ ml: 1 }}>
                              <Typography variant="body1" fontWeight="medium" sx={{ display: 'flex', alignItems: 'center' }}>
                                <BackgroundIcon sx={{ mr: 1, color: 'secondary.main' }} />
                                {strings.fullPageBackground || 'Full Page Background'}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {strings.fullPageBackgroundDesc || 'Image covers the entire page. Content appears over a semi-transparent overlay.'}
                              </Typography>
                            </Box>
                          }
                        />
                      </Paper>
                    </RadioGroup>
                  </FormControl>
                </Box>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={1}>
              <Button
                variant="contained"
                onClick={() => setActiveStep(1)}
                disabled={!previewUrl}
                endIcon={<ArrowForwardIcon />}
              >
                {strings.continue || 'Continue'}
              </Button>
            </Stack>
          </StepContent>
        </Step>

        {/* Step 2: Adjust */}
        <Step>
          <StepLabel
            optional={
              <Typography variant="caption" color="text.secondary">
                {steps[1].description}
              </Typography>
            }
          >
            <Typography fontWeight="medium">{steps[1].label}</Typography>
          </StepLabel>
          <StepContent>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                {/* Margin Presets */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                    {strings.marginPresets || 'Quick Margin Presets'}
                    <Tooltip title={strings.marginPresetsTooltip || "Select a preset or drag the handles in the preview to customize margins"}>
                      <InfoIcon sx={{ ml: 0.5, fontSize: 16, color: 'text.disabled' }} />
                    </Tooltip>
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {Object.entries(MARGIN_PRESETS).map(([key]) => (
                      <Chip
                        key={key}
                        label={getPresetLabel(key)}
                        onClick={() => handlePresetSelect(key)}
                        color={selectedPreset === key ? 'primary' : 'default'}
                        variant={selectedPreset === key ? 'filled' : 'outlined'}
                        sx={{ fontWeight: selectedPreset === key ? 'bold' : 'normal' }}
                      />
                    ))}
                    {selectedPreset === 'custom' && (
                      <Chip
                        label={strings.custom || 'Custom'}
                        color="secondary"
                        variant="filled"
                      />
                    )}
                  </Stack>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Preview with Interactive Controls */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center' }}>
                    <PreviewIcon sx={{ mr: 1, fontSize: 20 }} />
                    {strings.interactivePreview || 'Interactive Preview'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, alignSelf: 'flex-start' }}>
                    {strings.previewInstructions || 'Drag the colored handles to adjust margins. Drag the image to reposition it. Use zoom controls to resize.'}
                  </Typography>

                  <LetterheadPreview
                    imageUrl={previewUrl}
                    letterheadType={letterheadType}
                    margins={margins}
                    imageTransform={imageTransform}
                    onMarginsChange={!disabled ? handleMarginsChange : undefined}
                    onImageTransformChange={!disabled ? handleImageTransformChange : undefined}
                    size="large"
                    interactive={!disabled}
                  />
                </Box>

                {/* Current Margin Values */}
                <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                    {strings.currentMargins || 'Current Margins (in inches)'}:
                  </Typography>
                  <Stack direction="row" spacing={2} flexWrap="wrap">
                    <Typography variant="body2">
                      <strong>{strings.top || 'Top'}:</strong> {margins.top.toFixed(2)}"
                    </Typography>
                    <Typography variant="body2">
                      <strong>{strings.bottom || 'Bottom'}:</strong> {margins.bottom.toFixed(2)}"
                    </Typography>
                    <Typography variant="body2">
                      <strong>{strings.left || 'Left'}:</strong> {margins.left.toFixed(2)}"
                    </Typography>
                    <Typography variant="body2">
                      <strong>{strings.right || 'Right'}:</strong> {margins.right.toFixed(2)}"
                    </Typography>
                  </Stack>
                </Box>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={1}>
              <Button
                onClick={() => setActiveStep(0)}
                startIcon={<ArrowBackIcon />}
              >
                {strings.back || 'Back'}
              </Button>
              <Button
                variant="outlined"
                onClick={handleResetToDefaults}
                startIcon={<RefreshIcon />}
              >
                {strings.resetDefaults || 'Reset to Defaults'}
              </Button>
              <Button
                variant="contained"
                onClick={() => setActiveStep(2)}
                endIcon={<ArrowForwardIcon />}
              >
                {strings.continue || 'Continue'}
              </Button>
            </Stack>
          </StepContent>
        </Step>

        {/* Step 3: Review & Apply */}
        <Step>
          <StepLabel
            optional={
              <Typography variant="caption" color="text.secondary">
                {steps[2].description}
              </Typography>
            }
          >
            <Typography fontWeight="medium">{steps[2].label}</Typography>
          </StepLabel>
          <StepContent>
            <Card variant="outlined" sx={{ mb: 2 }}>
              <CardContent>
                {/* Final Preview */}
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <Typography variant="subtitle2" gutterBottom sx={{ alignSelf: 'flex-start' }}>
                    {strings.finalPreview || 'Final Preview'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2, alignSelf: 'flex-start' }}>
                    {strings.finalPreviewDesc || 'This is how your letterhead will appear on official documents.'}
                  </Typography>

                  <LetterheadPreview
                    imageUrl={previewUrl}
                    letterheadType={letterheadType}
                    margins={margins}
                    imageTransform={imageTransform}
                    size="large"
                    interactive={false}
                  />
                </Box>

                {/* Summary */}
                <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    {strings.settingsSummary || 'Settings Summary'}
                  </Typography>
                  <Stack spacing={1}>
                    <Typography variant="body2">
                      <strong>{strings.displayMode || 'Display Mode'}:</strong> {letterheadType === 'header' ? (strings.headerOnly || 'Header Only') : (strings.fullPageBackground || 'Full Page Background')}
                    </Typography>
                    <Typography variant="body2">
                      <strong>{strings.margins || 'Margins'}:</strong> {strings.top || 'Top'} {margins.top}", {strings.bottom || 'Bottom'} {margins.bottom}", {strings.left || 'Left'} {margins.left}", {strings.right || 'Right'} {margins.right}"
                    </Typography>
                    <Typography variant="body2">
                      <strong>{strings.imageZoom || 'Image Zoom'}:</strong> {Math.round(imageTransform.scale * 100)}%
                    </Typography>
                  </Stack>
                </Box>
              </CardContent>
            </Card>

            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                onClick={() => setActiveStep(1)}
                startIcon={<ArrowBackIcon />}
              >
                {strings.back || 'Back'}
              </Button>

              {selectedFile ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleUpload}
                  disabled={disabled || loading}
                  startIcon={loading ? <CircularProgress size={18} /> : <SaveIcon />}
                >
                  {strings.uploadAndActivate || 'Upload & Activate'}
                </Button>
              ) : hasExistingLetterhead && hasChanges ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleConfigUpdate}
                  disabled={disabled || loading}
                  startIcon={loading ? <CircularProgress size={18} /> : <SaveIcon />}
                >
                  {strings.saveChanges || 'Save Changes'}
                </Button>
              ) : null}

              {hasExistingLetterhead && (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={handleDelete}
                  disabled={disabled || loading}
                  startIcon={<DeleteIcon />}
                >
                  {strings.deleteLetterhead || 'Delete Letterhead'}
                </Button>
              )}
            </Stack>
          </StepContent>
        </Step>
      </Stepper>

      {/* Quick Edit Mode - Show when letterhead exists and user is not in stepper flow */}
      {hasExistingLetterhead && activeStep === 2 && !hasChanges && (
        <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary" gutterBottom>
            {strings.letterheadConfigured || 'Your letterhead is configured and active.'}
          </Typography>
          <Stack direction="row" spacing={2} justifyContent="center" sx={{ mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={() => setActiveStep(0)}
            >
              {strings.uploadNew || 'Upload New Image'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<SettingsIcon />}
              onClick={() => setActiveStep(1)}
            >
              {strings.adjustSettings || 'Adjust Settings'}
            </Button>
          </Stack>
        </Paper>
      )}
    </Box>
  );
};

export default LetterheadUploader;
