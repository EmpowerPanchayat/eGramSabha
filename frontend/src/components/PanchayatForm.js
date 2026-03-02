import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Grid,
  Typography,
  IconButton,
  InputAdornment,
  Box,
  Divider,
  CircularProgress,
  Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import PublicIcon from "@mui/icons-material/Public";
import GroupsIcon from "@mui/icons-material/Groups";
import TagIcon from "@mui/icons-material/Tag";
import ImageIcon from "@mui/icons-material/Image";
import WardManager from "./WardManager";
import CascadingLocationDropdowns from "./CascadingLocationDropdowns";
import LetterheadUploader from "./LetterheadUploader";

import { fetchWards, createWard, updateWard, deleteWard } from "../api";

const PanchayatForm = ({
  open,
  onClose,
  onSubmit,
  panchayat = null,
  loading = false,
}) => {
  // Initial form state based on whether we're editing or creating
  const initialFormState = {
    name: "",
    lgdCode: null, // LGD Code field
    villages: "",
    geolocation: "",
    population: "",
    language: "",
    sabhaCriteria: "",
    officialWhatsappNumber: "",
  };

  // Location will be managed by CascadingLocationDropdowns
  const initialLocationState = {
    state: "",
    district: "",
    block: "",
    // Note: No panchayat field here since we're creating it
  };

  const [formValues, setFormValues] = useState(initialFormState);
  const [locationValues, setLocationValues] = useState(initialLocationState);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wards, setWards] = useState([]);
  const [wardsLoading, setWardsLoading] = useState(false);
  const [wardsError, setWardsError] = useState(null);

  // Initialize form when opening modal or changing panchayat
  useEffect(() => {
    if (open) {
      if (panchayat) {
        // Editing existing panchayat
        setFormValues({
          name: panchayat.name || "",
          lgdCode: panchayat.lgdCode || "",
          villages: panchayat.villages || "",
          geolocation: panchayat.geolocation || "",
          population: panchayat.population ? String(panchayat.population) : "",
          language: panchayat.language || "",
          sabhaCriteria: panchayat.sabhaCriteria
            ? String(panchayat.sabhaCriteria)
            : "",
          officialWhatsappNumber: panchayat.officialWhatsappNumber || "",
        });

        // Set location values for cascading dropdowns (excluding panchayat name)
        setLocationValues({
          state: panchayat.state || "",
          district: panchayat.district || "",
          block: panchayat.block || "",
        });

        if (panchayat._id) {
          fetchPanchayatWards(panchayat._id);
        }
      } else {
        // Creating new panchayat
        setFormValues(initialFormState);
        setLocationValues(initialLocationState);
        setWards([]);
      }
      // Clear any previous errors
      setFormErrors({});
      setWardsError(null);
    }
  }, [open, panchayat]);

  // Function to fetch wards for a panchayat
  const fetchPanchayatWards = async (panchayatId) => {
    setWardsLoading(true);
    setWardsError(null);
    try {
      const wardsData = await fetchWards(panchayatId);
      setWards(wardsData);
    } catch (error) {
      console.error("Error fetching wards:", error);
      setWardsError("Failed to load wards: " + error.message);
    } finally {
      setWardsLoading(false);
    }
  };

  // Function to handle changes to wards from the WardManager
  const handleWardsChange = (updatedWards) => {
    setWards(updatedWards);
  };

  // Handle location changes from CascadingLocationDropdowns
  const handleLocationChange = (location) => {
    console.log("Location changed:", location);
    setLocationValues(location);

    // Clear location-related errors
    const locationFields = ["state", "district", "block"];
    const newErrors = { ...formErrors };
    locationFields.forEach((field) => {
      if (newErrors[field]) {
        delete newErrors[field];
      }
    });
    setFormErrors(newErrors);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // For numeric fields, sanitize input
    if (name === "population" || name === "sabhaCriteria") {
      // Only allow numbers
      if (value === "" || /^\d*$/.test(value)) {
        setFormValues({ ...formValues, [name]: value });
      }
      return;
    }
    // For WhatsApp, only allow numbers and limit length
    else if (name === "officialWhatsappNumber") {
      if (value === "" || (/^\d*$/.test(value) && value.length <= 10)) {
        setFormValues({ ...formValues, [name]: value });
      }
      return;
    }
    // For LGD Code, only allow numbers and limit length
    else if (name === "lgdCode") {
      if (value === "" || (/^\d*$/.test(value) && value.length <= 10)) {
        setFormValues({ ...formValues, [name]: value || null });
      }
      return;
    }
    // For all other fields
    else {
      setFormValues({ ...formValues, [name]: value });
    }

    // Clear error for this field if it exists
    if (formErrors[name]) {
      setFormErrors({ ...formErrors, [name]: "" });
    }
  };

  const validateForm = () => {
    const errors = {};
    const nameRegex = /^[a-zA-Z0-9\s\-_().&,']+$/; // Allow letters, numbers, spaces, and some special chars

    // Location validation (now handled by cascading dropdowns)
    if (!locationValues.state?.trim()) {
      errors.state = "State is required";
    }
    if (!locationValues.district?.trim()) {
      errors.district = "District is required";
    }
    if (!locationValues.block?.trim()) {
      errors.block = "Block is required";
    }

    // Name validation
    if (!formValues.name.trim()) {
      errors.name = "Panchayat name is required";
    } else if (formValues.name.trim().length > 255) {
      errors.name = "Panchayat name must be less than 255 characters";
    } else if (!nameRegex.test(formValues.name)) {
      errors.name = "Panchayat name contains invalid characters";
    }

    // LGD Code validation (optional but must be valid if provided)
    if (formValues.lgdCode) {
      if (!/^\d{1,10}$/.test(formValues.lgdCode)) {
        errors.lgdCode =
          "LGD Code must be a numeric string with maximum 10 digits";
      }
    }

    // Language validation (optional)
    if (formValues.language && formValues.language.length > 100) {
      errors.language = "Language must be less than 100 characters";
    } else if (
      formValues.language &&
      !/^[a-zA-Z\s,]+$/.test(formValues.language)
    ) {
      errors.language =
        "Language should only contain letters, spaces, and commas";
    }

    // Population validation (optional but must be a valid number)
    if (formValues.population) {
      const population = Number(formValues.population);
      if (
        isNaN(population) ||
        !Number.isInteger(population) ||
        population < 0
      ) {
        errors.population = "Population must be a positive integer";
      } else if (population > 10000000) {
        // 10 million cap
        errors.population = "Population value is too large";
      }
    }

    // Sabha Criteria validation (optional but must be a valid number)
    if (formValues.sabhaCriteria) {
      const criteria = Number(formValues.sabhaCriteria);
      if (isNaN(criteria) || !Number.isInteger(criteria) || criteria < 0) {
        errors.sabhaCriteria = "Sabha criteria must be a positive integer";
      } else if (criteria > 10000) {
        // 10,000 cap
        errors.sabhaCriteria = "Sabha criteria value is too large";
      }
    }

    // WhatsApp validation (optional but must be a valid 10-digit number)
    if (formValues.officialWhatsappNumber) {
      if (!/^\d{10}$/.test(formValues.officialWhatsappNumber)) {
        errors.officialWhatsappNumber =
          "WhatsApp number must be exactly 10 digits";
      }
    }

    // Geolocation validation (optional but must be in a valid format if provided)
    if (formValues.geolocation) {
      // Simple validation for lat,long format
      if (!/^-?\d+(\.\d+)?,\s*-?\d+(\.\d+)?$/.test(formValues.geolocation)) {
        errors.geolocation =
          "Geolocation should be in format: latitude,longitude";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Combine form values with location values
      const formData = {
        ...formValues,
        state: locationValues.state,
        district: locationValues.district,
        block: locationValues.block,
        // name is already in formValues
        population: formValues.population
          ? Number(formValues.population)
          : undefined,
        sabhaCriteria: formValues.sabhaCriteria
          ? Number(formValues.sabhaCriteria)
          : undefined,
      };

      // Convert empty LGD code string to null so sparse index works
      if (!formData.lgdCode) {
        formData.lgdCode = null;
      }

      // Pass the panchayat ID if we're editing
      if (panchayat && panchayat._id) {
        formData._id = panchayat._id;
      }

      // Submit the panchayat data
      const result = await onSubmit(formData);

      // Process wards if panchayat was successfully created/updated
      if (result && result.panchayat && result.panchayat._id) {
        const panchayatId = result.panchayat._id;

        // For each ward in the local state:
        // - If it has a temporary ID, create it
        // - If it exists on server but not in local state, delete it
        // - If it exists in both, update it

        // Get existing wards from the server
        let existingWards = [];
        try {
          existingWards = await fetchWards(panchayatId);
        } catch (error) {
          console.error("Error fetching existing wards:", error);
          // Continue with empty array if fetch fails
        }

        // Create or update wards
        for (const ward of wards) {
          const wardData = {
            name: ward.name,
            geolocation: ward.geolocation,
            population: ward.population,
          };

          // Check if this is a new ward (with temporary ID)
          if (ward._id.toString().startsWith("temp-")) {
            await createWard(panchayatId, wardData);
          } else {
            // Check if this ward exists in existingWards
            const existingWard = existingWards.find((w) => w._id === ward._id);
            if (existingWard) {
              await updateWard(panchayatId, ward._id, wardData);
            } else {
              // This should not happen, but create it just in case
              await createWard(panchayatId, wardData);
            }
          }
        }

        // Find wards that exist on server but not in local state (deleted)
        for (const existingWard of existingWards) {
          const stillExists = wards.some((w) => w._id === existingWard._id);
          if (!stillExists) {
            await deleteWard(panchayatId, existingWard._id);
          }
        }
      }

      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);

      // Handle specific error cases
      if (error.message && error.message.includes("LGD Code already exists")) {
        setFormErrors({
          lgdCode: "This LGD Code is already in use by another panchayat",
        });
      } else if (error.message && error.message.includes("already exists")) {
        setFormErrors({
          submit:
            "A panchayat with this name already exists in the selected location",
        });
      } else {
        setFormErrors({
          submit:
            error.message || "Failed to save panchayat. Please try again.",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          maxHeight: "90vh",
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: "primary.main",
          color: "white",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          py: 2,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <PublicIcon />
          <Typography variant="h6">
            {panchayat ? "Edit Panchayat" : "Add New Panchayat"}
          </Typography>
        </Box>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="close"
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 3 }}>
          {/* Submit Error Display */}
          {formErrors.submit && (
            <Alert
              severity="error"
              sx={{ mb: 3 }}
              onClose={() => setFormErrors({ ...formErrors, submit: "" })}
            >
              {formErrors.submit}
            </Alert>
          )}

          {/* Location Section - Using CascadingLocationDropdowns */}
          <Box sx={{ mb: 4 }}>
            <CascadingLocationDropdowns
              mode="create"
              onLocationChange={handleLocationChange}
              initialValues={locationValues}
              required={["state", "district", "block"]}
              showCreateOptions={true}
              variant="outlined"
              size="medium"
            />

            {/* Show location errors if any */}
            {(formErrors.state || formErrors.district || formErrors.block) && (
              <Box sx={{ mt: 1 }}>
                {formErrors.state && (
                  <Typography variant="caption" color="error" display="block">
                    {formErrors.state}
                  </Typography>
                )}
                {formErrors.district && (
                  <Typography variant="caption" color="error" display="block">
                    {formErrors.district}
                  </Typography>
                )}
                {formErrors.block && (
                  <Typography variant="caption" color="error" display="block">
                    {formErrors.block}
                  </Typography>
                )}
              </Box>
            )}
          </Box>

          <Divider sx={{ my: 3 }} />

          {/* Basic Information Section */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <PublicIcon fontSize="small" />
              Basic Information
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="name"
                  label="Panchayat Name"
                  value={formValues.name}
                  onChange={handleInputChange}
                  fullWidth
                  required
                  error={Boolean(formErrors.name)}
                  helperText={
                    formErrors.name || "Enter the name of the new panchayat"
                  }
                  placeholder="e.g. Rampur Gram Panchayat"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="lgdCode"
                  label="LGD Code"
                  value={formValues.lgdCode}
                  onChange={handleInputChange}
                  fullWidth
                  error={Boolean(formErrors.lgdCode)}
                  helperText={
                    formErrors.lgdCode ||
                    "Government-issued Local Governance Directory Code (optional)"
                  }
                  placeholder="e.g. 123456789"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <TagIcon sx={{ color: "primary.main" }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Demographics Section */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <GroupsIcon fontSize="small" />
              Demographics & Communication
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="population"
                  label="Population"
                  value={formValues.population}
                  onChange={handleInputChange}
                  fullWidth
                  error={Boolean(formErrors.population)}
                  helperText={formErrors.population}
                  type="text"
                  InputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="language"
                  label="Primary Language"
                  value={formValues.language}
                  onChange={handleInputChange}
                  fullWidth
                  error={Boolean(formErrors.language)}
                  helperText={formErrors.language}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="officialWhatsappNumber"
                  label="Official WhatsApp"
                  value={formValues.officialWhatsappNumber}
                  onChange={handleInputChange}
                  fullWidth
                  error={Boolean(formErrors.officialWhatsappNumber)}
                  helperText={
                    formErrors.officialWhatsappNumber || "10-digit number"
                  }
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <WhatsAppIcon color="primary" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  name="sabhaCriteria"
                  label="Sabha Criteria"
                  value={formValues.sabhaCriteria}
                  onChange={handleInputChange}
                  fullWidth
                  error={Boolean(formErrors.sabhaCriteria)}
                  helperText={formErrors.sabhaCriteria}
                  type="text"
                  InputProps={{
                    inputMode: "numeric",
                    pattern: "[0-9]*",
                  }}
                />
              </Grid>
            </Grid>
          </Box>

          {/* Additional Details Section */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle1"
              sx={{
                color: "primary.main",
                fontWeight: 600,
                mb: 2,
                display: "flex",
                alignItems: "center",
                gap: 1,
              }}
            >
              <LocationOnIcon fontSize="small" />
              Additional Details
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  name="geolocation"
                  label="Geolocation"
                  value={formValues.geolocation}
                  onChange={handleInputChange}
                  fullWidth
                  error={Boolean(formErrors.geolocation)}
                  helperText={
                    formErrors.geolocation || "Format: latitude,longitude"
                  }
                  placeholder="e.g. 28.6139,77.2090"
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  name="villages"
                  value={formValues.villages}
                  onChange={handleInputChange}
                  fullWidth
                  multiline
                  rows={3}
                  error={Boolean(formErrors.villages)}
                  helperText={
                    formErrors.villages ||
                    "Enter comma-separated list of villages"
                  }
                  placeholder="e.g. Rampur, Sitapur, Ganeshpur"
                  label="Villages"
                />
              </Grid>
            </Grid>
          </Box>

          {/* Wards Management Section */}
          <WardManager
            panchayatId={panchayat?._id}
            initialWards={wards}
            onChange={handleWardsChange}
            readOnly={false}
            error={wardsError}
          />

          {/* Letterhead Management Section - Only for editing existing panchayat */}
          {panchayat && panchayat._id && (
            <>
              <Divider sx={{ my: 3 }} />
              <Box sx={{ mb: 4 }}>
                <Typography
                  variant="subtitle1"
                  sx={{
                    color: "primary.main",
                    fontWeight: 600,
                    mb: 2,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <ImageIcon fontSize="small" />
                  Letterhead Management
                </Typography>
                <LetterheadUploader
                  panchayatId={panchayat._id}
                  initialConfig={panchayat.letterheadConfig}
                  onUploadComplete={(config) => {
                    console.log("Letterhead uploaded:", config);
                  }}
                  onConfigChange={(config) => {
                    console.log("Letterhead config updated:", config);
                  }}
                  onDelete={() => {
                    console.log("Letterhead deleted");
                  }}
                  disabled={false}
                />
              </Box>
            </>
          )}
        </Box>
      </DialogContent>

      <DialogActions
        sx={{
          px: 3,
          py: 2,
          bgcolor: "grey.50",
          borderTop: 1,
          borderColor: "divider",
        }}
      >
        <Button
          onClick={onClose}
          color="inherit"
          disabled={isSubmitting || loading}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={isSubmitting || loading}
          startIcon={
            isSubmitting || loading ? <CircularProgress size={20} /> : null
          }
        >
          {panchayat ? "Update Panchayat" : "Create Panchayat"}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PanchayatForm;
