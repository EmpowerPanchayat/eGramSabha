// File: frontend/src/components/CascadingLocationDropdowns.js (Simple & Clean)
import React, { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Autocomplete,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  InputAdornment,
  Button,
} from "@mui/material";
import {
  LocationOn as LocationOnIcon,
  Public as PublicIcon,
  Business as BusinessIcon,
  Home as HomeIcon,
  Add as AddIcon,
} from "@mui/icons-material";
import {
  fetchStates,
  fetchDistricts,
  fetchBlocks,
  fetchPanchayatsByLocation,
} from "../api";

const CascadingLocationDropdowns = ({
  mode = "select", // 'select' for CitizenLogin, 'create' for PanchayatForm
  onLocationChange,
  initialValues = {},
  disabled = false,
  required = ["state", "district", "block"],
  showCreateOptions = true,
  compact = false,
  variant = "outlined",
  size = "medium",
}) => {
  // State for selected values
  const [selectedLocation, setSelectedLocation] = useState({
    state: initialValues.state || "",
    district: initialValues.district || "",
    block: initialValues.block || "",
    panchayat: initialValues.panchayat || "",
  });

  // State for dropdown options
  const [options, setOptions] = useState({
    states: [],
    districts: [],
    blocks: [],
    panchayats: [],
  });

  // State for loading indicators
  const [loading, setLoading] = useState({
    states: false,
    districts: false,
    blocks: false,
    panchayats: false,
  });

  // Error state
  const [error, setError] = useState("");

  // Search input states
  const [searchInputs, setSearchInputs] = useState({
    state: "",
    district: "",
    block: "",
    panchayat: "",
  });

  // Icons and labels
  const levelIcons = {
    state: <PublicIcon />,
    district: <BusinessIcon />,
    block: <LocationOnIcon />,
    panchayat: <HomeIcon />,
  };

  const levelLabels = {
    state: "State",
    district: "District",
    block: "Block",
    panchayat: "Panchayat",
  };

  // Load states on component mount
  useEffect(() => {
    loadStates();
  }, []);

  // Load states
  const loadStates = async () => {
    try {
      setLoading(prev => ({ ...prev, states: true }));
      setError("");
      
      const states = await fetchStates();
      setOptions(prev => ({ ...prev, states }));
    } catch (error) {
      console.error("Error loading states:", error);
      setError("Failed to load states. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, states: false }));
    }
  };

  // Load districts for selected state
  const loadDistricts = async (state) => {
    if (!state) return;
    
    try {
      setLoading(prev => ({ ...prev, districts: true }));
      const districts = await fetchDistricts(state);
      setOptions(prev => ({
        ...prev,
        districts,
        blocks: [], // Clear dependent dropdowns
        panchayats: [],
      }));
    } catch (error) {
      console.error("Error loading districts:", error);
      setError("Failed to load districts. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, districts: false }));
    }
  };

  // Load blocks for selected state and district
  const loadBlocks = async (state, district) => {
    if (!state || !district) return;
    
    try {
      setLoading(prev => ({ ...prev, blocks: true }));
      const blocks = await fetchBlocks(state, district);
      setOptions(prev => ({
        ...prev,
        blocks,
        panchayats: [], // Clear dependent dropdown
      }));
    } catch (error) {
      console.error("Error loading blocks:", error);
      setError("Failed to load blocks. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, blocks: false }));
    }
  };

  // Load panchayats for selected state, district, and block
  const loadPanchayats = async (state, district, block) => {
    if (!state || !district || !block) return;
    
    try {
      setLoading(prev => ({ ...prev, panchayats: true }));
      const panchayats = await fetchPanchayatsByLocation(state, district, block);
      setOptions(prev => ({ ...prev, panchayats }));
    } catch (error) {
      console.error("Error loading panchayats:", error);
      setError("Failed to load panchayats. Please try again.");
    } finally {
      setLoading(prev => ({ ...prev, panchayats: false }));
    }
  };

  // Handle selection change
  const handleSelectionChange = async (level, value) => {
    const newLocation = { ...selectedLocation, [level]: value || "" };

    // Clear dependent selections when a parent changes
    switch (level) {
      case "state":
        newLocation.district = "";
        newLocation.block = "";
        newLocation.panchayat = "";
        break;
      case "district":
        newLocation.block = "";
        newLocation.panchayat = "";
        break;
      case "block":
        newLocation.panchayat = "";
        break;
    }

    setSelectedLocation(newLocation);

    // Call parent callback
    if (onLocationChange) {
      try {
        const result = onLocationChange(newLocation);
        if (result && typeof result.then === 'function') {
          await result;
        }
      } catch (error) {
        console.error("Error in location change callback:", error);
      }
    }

    // Load dependent data
    switch (level) {
      case "state":
        if (value) {
          loadDistricts(value);
        }
        break;
      case "district":
        if (value && newLocation.state) {
          loadBlocks(newLocation.state, value);
        }
        break;
      case "block":
        if (value && newLocation.state && newLocation.district && mode === "select") {
          loadPanchayats(newLocation.state, newLocation.district, value);
        }
        break;
    }
  };

  // Handle search input change
  const handleSearchInputChange = (level, value) => {
    setSearchInputs(prev => ({ ...prev, [level]: value }));
  };

  // Filter options based on search input
  const getFilteredOptions = (level) => {
    const baseOptions = options[`${level}s`] || [];
    const searchTerm = searchInputs[level].toLowerCase();
    
    if (!searchTerm) return baseOptions;
    
    return baseOptions.filter(option => 
      option.toLowerCase().includes(searchTerm)
    );
  };

  // Generate options with "Create new" option
  const getAutocompleteOptions = (level) => {
    const filteredOptions = getFilteredOptions(level);
    const searchTerm = searchInputs[level].trim();
    
    // Don't show create option for panchayat in create mode
    if (level === "panchayat" && mode === "create") {
      return filteredOptions;
    }
    
    // Add "Create new" option if appropriate
    if (mode === "create" && showCreateOptions && searchTerm && 
        !filteredOptions.some(option => option.toLowerCase() === searchTerm.toLowerCase())) {
      return [...filteredOptions, `Create "${searchTerm}"`];
    }
    
    return filteredOptions;
  };

  // Handle option selection (including "Create new")
  const handleOptionSelect = async (level, value) => {
    if (value && value.startsWith('Create "') && value.endsWith('"')) {
      // Extract the actual value from "Create 'value'" format
      const actualValue = value.slice(8, -1); // Remove 'Create "' and '"'
      await handleSelectionChange(level, actualValue);
    } else {
      await handleSelectionChange(level, value);
    }
  };

  // Check if field is required
  const isFieldRequired = (level) => {
    return required.includes(level);
  };

  // Check if field should be disabled
  const isFieldDisabled = (level) => {
    if (disabled) return true;

    switch (level) {
      case "state":
        return false;
      case "district":
        return !selectedLocation.state;
      case "block":
        return !selectedLocation.state || !selectedLocation.district;
      case "panchayat":
        return !selectedLocation.state || !selectedLocation.district || !selectedLocation.block;
      default:
        return false;
    }
  };

  // Get helper text for fields
  const getHelperText = (level) => {
    if (isFieldDisabled(level) && level !== "state") {
      const prevLevel = ["", "state", "district", "block"][
        ["state", "district", "block", "panchayat"].indexOf(level)
      ];
      return `Select ${levelLabels[prevLevel]} first`;
    }

    if (mode === "create" && level === "panchayat") {
      return "Enter new panchayat name";
    }

    return "";
  };

  // Render individual dropdown
  const renderDropdown = (level) => {
    const isDisabled = isFieldDisabled(level);
    const isRequired = isFieldRequired(level);
    const currentOptions = getAutocompleteOptions(level);
    const isLoading = loading[level];

    return (
      <Autocomplete
        key={level}
        options={currentOptions}
        value={selectedLocation[level] || null}
        onChange={async (event, newValue) => await handleOptionSelect(level, newValue)}
        onInputChange={(event, newInputValue) => handleSearchInputChange(level, newInputValue)}
        inputValue={searchInputs[level]}
        disabled={isDisabled}
        loading={isLoading}
        freeSolo={mode === "create" && level === "panchayat"}
        autoComplete
        autoHighlight
        size={size}
        filterOptions={(options) => options}
        renderInput={(params) => (
          <TextField
            {...params}
            label={`${levelLabels[level]}${isRequired ? " *" : ""}`}
            variant={variant}
            required={isRequired}
            disabled={isDisabled}
            sx={{
              '& .MuiInputBase-root': {
                minWidth: '280px', // Fixed minimum width
              },
              '& .MuiInputBase-input': {
                overflow: 'visible',
                textOverflow: 'ellipsis',
              },
              '& .MuiAutocomplete-input': {
                minWidth: '200px !important',
              }
            }}
            InputProps={{
              ...params.InputProps,
              startAdornment: (
                <InputAdornment position="start">
                  {levelIcons[level]}
                </InputAdornment>
              ),
              endAdornment: (
                <>
                  {isLoading && <CircularProgress color="inherit" size={20} />}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
            helperText={getHelperText(level)}
          />
        )}
        renderOption={(props, option) => {
          const { key, ...otherProps } = props;
          return (
            <Box key={key} component="li" {...otherProps}>
              {option.startsWith && option.startsWith('Create "') ? (
                <Box sx={{ display: "flex", alignItems: "center", color: "primary.main" }}>
                  <AddIcon sx={{ mr: 1, fontSize: 18 }} />
                  <Typography variant="body2" sx={{ fontStyle: "italic" }}>
                    {option}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2">{option}</Typography>
              )}
            </Box>
          );
        }}
      />
    );
  };

  // Show loading screen only for initial load
  if (loading.states && options.states.length === 0) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", p: 3 }}>
        <CircularProgress size={30} />
        <Typography variant="body2" sx={{ ml: 2 }}>
          Loading location data...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: "100%" }}>
      {/* Error display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Dropdowns Grid - Better responsive layout */}
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={mode === "select" ? 3 : 4}>
          {renderDropdown("state")}
        </Grid>
        <Grid item xs={12} sm={6} md={mode === "select" ? 3 : 4}>
          {renderDropdown("district")}
        </Grid>
        <Grid item xs={12} sm={6} md={mode === "select" ? 3 : 4}>
          {renderDropdown("block")}
        </Grid>
        {/* Only show panchayat dropdown in select mode */}
        {mode === "select" && (
          <Grid item xs={12} sm={6} md={3}>
            {renderDropdown("panchayat")}
          </Grid>
        )}
      </Grid>

      {/* Current Selection Summary */}
      {(selectedLocation.state || selectedLocation.district || selectedLocation.block || 
        (mode === "select" && selectedLocation.panchayat)) && (
        <Box sx={{ mt: 2, p: 2, bgcolor: "grey.50", borderRadius: 1 }}>
          <Typography variant="caption" color="text.secondary" gutterBottom>
            Current Selection:
          </Typography>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
            {selectedLocation.state && (
              <Chip size="small" label={`State: ${selectedLocation.state}`} color="primary" variant="outlined" />
            )}
            {selectedLocation.district && (
              <Chip size="small" label={`District: ${selectedLocation.district}`} color="primary" variant="outlined" />
            )}
            {selectedLocation.block && (
              <Chip size="small" label={`Block: ${selectedLocation.block}`} color="primary" variant="outlined" />
            )}
            {mode === "select" && selectedLocation.panchayat && (
              <Chip size="small" label={`Panchayat: ${selectedLocation.panchayat}`} color="primary" variant="outlined" />
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default CascadingLocationDropdowns;