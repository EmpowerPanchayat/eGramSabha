import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Box, Typography, Paper, Tooltip, Slider, IconButton, Stack } from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  OpenWith as MoveIcon,
  Refresh as ResetIcon
} from '@mui/icons-material';
import { useLanguage } from '../utils/LanguageContext';

const LetterheadPreview = ({
  imageUrl,
  letterheadType = 'header',
  margins = { top: 1.5, bottom: 0.5, left: 0.5, right: 0.5 },
  imageTransform = { scale: 1, x: 0, y: 0 },
  onMarginsChange,
  onImageTransformChange,
  size = 'large',
  interactive = false
}) => {
  const { strings } = useLanguage();
  const containerRef = useRef(null);
  const headerRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [containerRect, setContainerRect] = useState(null);
  const [isPanningImage, setIsPanningImage] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  // A4 dimensions in inches: 8.27 x 11.69
  const sizes = {
    small: { width: 280, height: 396 },
    medium: { width: 380, height: 537 },
    large: { width: 480, height: 679 }
  };
  const { width: previewWidth, height: previewHeight } = sizes[size] || sizes.large;

  // Conversion factors
  const pxPerInchX = previewWidth / 8.27;
  const pxPerInchY = previewHeight / 11.69;

  // Convert margins to pixels
  const marginTopPx = margins.top * pxPerInchY;
  const marginBottomPx = margins.bottom * pxPerInchY;
  const marginLeftPx = margins.left * pxPerInchX;
  const marginRightPx = margins.right * pxPerInchX;

  // Update container rect
  useEffect(() => {
    const updateRect = () => {
      if (containerRef.current) {
        setContainerRect(containerRef.current.getBoundingClientRect());
      }
    };
    updateRect();
    window.addEventListener('resize', updateRect);
    return () => window.removeEventListener('resize', updateRect);
  }, []);

  // Handle margin dragging
  const handleMouseMove = useCallback((e) => {
    if (!containerRect) return;

    if (isPanningImage && onImageTransformChange) {
      const dx = e.clientX - panStart.x;
      const dy = e.clientY - panStart.y;
      onImageTransformChange({
        ...imageTransform,
        x: imageTransform.x + dx,
        y: imageTransform.y + dy
      });
      setPanStart({ x: e.clientX, y: e.clientY });
      return;
    }

    if (!dragging || !onMarginsChange) return;

    const x = e.clientX - containerRect.left;
    const y = e.clientY - containerRect.top;
    let newMargins = { ...margins };

    switch (dragging) {
      case 'top':
        const topInches = Math.max(0.5, Math.min(4, y / pxPerInchY));
        newMargins.top = Math.round(topInches * 10) / 10;
        break;
      case 'bottom':
        const bottomInches = Math.max(0.25, Math.min(2, (previewHeight - y) / pxPerInchY));
        newMargins.bottom = Math.round(bottomInches * 10) / 10;
        break;
      case 'left':
        const leftInches = Math.max(0.25, Math.min(1.5, x / pxPerInchX));
        newMargins.left = Math.round(leftInches * 10) / 10;
        break;
      case 'right':
        const rightInches = Math.max(0.25, Math.min(1.5, (previewWidth - x) / pxPerInchX));
        newMargins.right = Math.round(rightInches * 10) / 10;
        break;
      default:
        break;
    }
    onMarginsChange(newMargins);
  }, [dragging, containerRect, margins, onMarginsChange, pxPerInchX, pxPerInchY, previewWidth, previewHeight, isPanningImage, panStart, imageTransform, onImageTransformChange, letterheadType]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsPanningImage(false);
  }, []);

  useEffect(() => {
    if (dragging || isPanningImage) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, isPanningImage, handleMouseMove, handleMouseUp]);

  // Handle image pan start
  const handleImageMouseDown = (e) => {
    if (!interactive || !imageUrl) return;
    e.preventDefault();
    setIsPanningImage(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  // Handle zoom
  const handleZoom = (delta) => {
    if (!onImageTransformChange) return;
    const newScale = Math.max(0.5, Math.min(3, imageTransform.scale + delta));
    onImageTransformChange({ ...imageTransform, scale: newScale });
  };

  // Reset transform
  const handleReset = () => {
    if (onImageTransformChange) {
      onImageTransformChange({ scale: 1, x: 0, y: 0 });
    }
  };

  // Position labels for better clarity
  const positionLabels = {
    top: strings.topMargin || 'Top Margin',
    bottom: strings.bottomMargin || 'Bottom Margin',
    left: strings.leftMargin || 'Left Margin',
    right: strings.rightMargin || 'Right Margin'
  };

  // Draggable handle component
  const DraggableHandle = ({ position, value }) => {
    const isHorizontal = position === 'top' || position === 'bottom';

    const colors = {
      top: { normal: '#1976d2', active: '#1565c0', label: 'Top' },
      bottom: { normal: '#ed6c02', active: '#e65100', label: 'Bottom' },
      left: { normal: '#2e7d32', active: '#1b5e20', label: 'Left' },
      right: { normal: '#0288d1', active: '#01579b', label: 'Right' }
    };

    const handleStyle = {
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      cursor: isHorizontal ? 'ns-resize' : 'ew-resize',
      zIndex: 10,
      userSelect: 'none',
      transition: 'all 0.2s',
      '&:hover': {
        transform: isHorizontal
          ? (position === 'top' ? 'translateX(-50%) scale(1.05)' : 'translateX(-50%) scale(1.05)')
          : 'translateY(-50%) scale(1.05)',
        boxShadow: '0 4px 8px rgba(0,0,0,0.3)'
      },
      ...(position === 'top' && {
        top: marginTopPx - 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 80,
        height: 24,
        borderRadius: '4px',
        backgroundColor: dragging === 'top' ? colors.top.active : colors.top.normal,
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }),
      ...(position === 'bottom' && {
        bottom: marginBottomPx - 12,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 80,
        height: 24,
        borderRadius: '4px',
        backgroundColor: dragging === 'bottom' ? colors.bottom.active : colors.bottom.normal,
        color: 'white',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }),
      ...(position === 'left' && {
        left: marginLeftPx - 12,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 24,
        height: 70,
        borderRadius: '4px',
        backgroundColor: dragging === 'left' ? colors.left.active : colors.left.normal,
        color: 'white',
        writingMode: 'vertical-rl',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }),
      ...(position === 'right' && {
        right: marginRightPx - 12,
        top: '50%',
        transform: 'translateY(-50%)',
        width: 24,
        height: 70,
        borderRadius: '4px',
        backgroundColor: dragging === 'right' ? colors.right.active : colors.right.normal,
        color: 'white',
        writingMode: 'vertical-rl',
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
      }),
    };

    const tooltipContent = `${positionLabels[position]}: ${value} inches\nDrag to adjust`;

    return (
      <Tooltip
        title={
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="caption" sx={{ display: 'block', fontWeight: 'bold' }}>
              {positionLabels[position]}
            </Typography>
            <Typography variant="caption" sx={{ display: 'block' }}>
              {value} inches
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', opacity: 0.8, fontSize: '0.65rem' }}>
              {strings.dragToAdjust || 'Drag to adjust'}
            </Typography>
          </Box>
        }
        arrow
        placement={isHorizontal ? (position === 'top' ? 'top' : 'bottom') : (position === 'left' ? 'left' : 'right')}
      >
        <Box
          sx={handleStyle}
          onMouseDown={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (containerRef.current) {
              setContainerRect(containerRef.current.getBoundingClientRect());
            }
            setDragging(position);
          }}
        >
          <Typography sx={{ fontSize: 10, fontWeight: 'bold' }}>
            {value}"
          </Typography>
        </Box>
      </Tooltip>
    );
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {/* Image controls for both header and background modes */}
      {interactive && imageUrl && (
        <Paper sx={{ mb: 1, px: 2, py: 0.5, display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Zoom Out">
            <IconButton size="small" onClick={() => handleZoom(-0.1)}>
              <ZoomOutIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Slider
            value={imageTransform.scale}
            min={0.5}
            max={3}
            step={0.1}
            onChange={(e, val) => onImageTransformChange?.({ ...imageTransform, scale: val })}
            sx={{ width: 100 }}
            size="small"
          />
          <Tooltip title="Zoom In">
            <IconButton size="small" onClick={() => handleZoom(0.1)}>
              <ZoomInIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Box sx={{ width: 1, height: 20, bgcolor: 'divider', mx: 1 }} />
          <Tooltip title="Drag image to pan">
            <MoveIcon fontSize="small" color="action" />
          </Tooltip>
          <Typography variant="caption" color="text.secondary" sx={{ mx: 1 }}>
            {Math.round(imageTransform.scale * 100)}%
          </Typography>
          <Tooltip title="Reset">
            <IconButton size="small" onClick={handleReset}>
              <ResetIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Paper>
      )}

      <Paper
        ref={containerRef}
        elevation={3}
        sx={{
          width: previewWidth,
          height: previewHeight,
          border: '1px solid #ccc',
          position: 'relative',
          overflow: 'hidden',
          bgcolor: 'white',
          cursor: letterheadType === 'background' && interactive && imageUrl ? 'move' : 'default'
        }}
        onMouseDown={letterheadType === 'background' ? handleImageMouseDown : undefined}
      >
        {/* Background image with transform controls */}
        {letterheadType === 'background' && imageUrl && (
          <Box
            component="img"
            src={imageUrl}
            alt="Letterhead Background"
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${100 * imageTransform.scale}%`,
              height: `${100 * imageTransform.scale}%`,
              minWidth: '100%',
              minHeight: '100%',
              objectFit: 'cover',
              transform: `translate(${imageTransform.x}px, ${imageTransform.y}px)`,
              transformOrigin: 'top left',
              pointerEvents: 'none',
              zIndex: 0
            }}
          />
        )}

        {/* Header image with transform controls */}
        {letterheadType === 'header' && (
          <Box
            ref={headerRef}
            sx={{
              width: '100%',
              height: marginTopPx,
              overflow: 'hidden',
              position: 'relative',
              cursor: interactive && imageUrl ? 'move' : 'default',
              bgcolor: imageUrl ? 'transparent' : 'rgba(0,0,0,0.03)',
              borderBottom: '1px dashed #ccc'
            }}
            onMouseDown={handleImageMouseDown}
          >
            {imageUrl ? (
              <Box
                component="img"
                src={imageUrl}
                alt="Letterhead Header"
                sx={{
                  position: 'absolute',
                  width: `${100 * imageTransform.scale}%`,
                  height: 'auto',
                  minHeight: '100%',
                  objectFit: 'cover',
                  transform: `translate(${imageTransform.x}px, ${imageTransform.y}px)`,
                  transformOrigin: 'center center',
                  pointerEvents: 'none'
                }}
              />
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                <Typography variant="caption" color="text.disabled">
                  {strings.uploadHeaderImage || 'Upload header image'}
                </Typography>
              </Box>
            )}
          </Box>
        )}

        {/* Background mode placeholder */}
        {letterheadType === 'background' && !imageUrl && (
          <Box
            sx={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center',
              color: 'text.disabled'
            }}
          >
            <Typography variant="caption">
              {strings.uploadBackgroundImage || 'Upload background image'}
            </Typography>
          </Box>
        )}

        {/* Content area */}
        <Box
          sx={{
            position: 'absolute',
            top: marginTopPx,
            left: marginLeftPx,
            right: marginRightPx,
            bottom: marginBottomPx,
            border: '1px dashed rgba(25, 118, 210, 0.5)',
            backgroundColor: letterheadType === 'background' ? 'rgba(255, 255, 255, 0.85)' : 'rgba(25, 118, 210, 0.02)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            p: 0.5,
            zIndex: 1
          }}
        >
          <Typography sx={{ fontSize: 8, fontWeight: 'bold', textAlign: 'center', mb: 0.5 }}>
            {strings.gramSabhaAgendaNotice || 'Gram Sabha Meeting - Agenda Notice'}
          </Typography>
          <Box sx={{ fontSize: 6, color: 'text.secondary', lineHeight: 1.4 }}>
            <Typography sx={{ fontSize: 6, display: 'block' }}>Date: 20/01/2026</Typography>
            <Typography sx={{ fontSize: 6, display: 'block' }}>Time: 10:00 AM</Typography>
            <Typography sx={{ fontSize: 6, display: 'block' }}>Location: Panchayat Bhawan</Typography>
          </Box>
          <Box sx={{ mt: 0.5 }}>
            <Typography sx={{ fontSize: 6, fontWeight: 'bold' }}>Agenda:</Typography>
            {[1, 2, 3].map((item) => (
              <Typography key={item} sx={{ fontSize: 5, color: 'text.secondary', pl: 0.5 }}>
                {item}. Sample agenda item...
              </Typography>
            ))}
          </Box>
        </Box>

        {/* Draggable handles */}
        {interactive && onMarginsChange && (
          <>
            <DraggableHandle position="top" value={margins.top.toFixed(1)} />
            <DraggableHandle position="bottom" value={margins.bottom.toFixed(1)} />
            <DraggableHandle position="left" value={margins.left.toFixed(1)} />
            <DraggableHandle position="right" value={margins.right.toFixed(1)} />
          </>
        )}

        {/* A4 label */}
        <Box
          sx={{
            position: 'absolute',
            top: 4,
            right: 4,
            fontSize: 9,
            color: 'text.disabled',
            bgcolor: 'rgba(255,255,255,0.9)',
            px: 0.5,
            borderRadius: 0.5
          }}
        >
          A4
        </Box>
      </Paper>

      {/* Margin values legend */}
      {interactive && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mb: 1 }}>
            {strings.currentMarginsInches || 'Current Margins (inches)'}
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            <Tooltip title={strings.topMarginDesc || "Space between letterhead and content"}>
              <Typography variant="caption" sx={{ px: 1.5, py: 0.5, bgcolor: '#1976d2', color: 'white', borderRadius: 1, fontWeight: 'medium', cursor: 'help' }}>
                {strings.top || 'Top'}: {margins.top.toFixed(1)} in
              </Typography>
            </Tooltip>
            <Tooltip title={strings.bottomMarginDesc || "Space at the bottom of the page"}>
              <Typography variant="caption" sx={{ px: 1.5, py: 0.5, bgcolor: '#ed6c02', color: 'white', borderRadius: 1, fontWeight: 'medium', cursor: 'help' }}>
                {strings.bottom || 'Bottom'}: {margins.bottom.toFixed(1)} in
              </Typography>
            </Tooltip>
            <Tooltip title={strings.leftMarginDesc || "Space on the left side"}>
              <Typography variant="caption" sx={{ px: 1.5, py: 0.5, bgcolor: '#2e7d32', color: 'white', borderRadius: 1, fontWeight: 'medium', cursor: 'help' }}>
                {strings.left || 'Left'}: {margins.left.toFixed(1)} in
              </Typography>
            </Tooltip>
            <Tooltip title={strings.rightMarginDesc || "Space on the right side"}>
              <Typography variant="caption" sx={{ px: 1.5, py: 0.5, bgcolor: '#0288d1', color: 'white', borderRadius: 1, fontWeight: 'medium', cursor: 'help' }}>
                {strings.right || 'Right'}: {margins.right.toFixed(1)} in
              </Typography>
            </Tooltip>
          </Stack>
        </Box>
      )}
    </Box>
  );
};

export default LetterheadPreview;
