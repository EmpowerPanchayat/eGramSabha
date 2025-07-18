import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Grid,
  Divider,
  Chip,
  Modal,
  TextField,
  IconButton,
  Stack,
  InputAdornment,
  CircularProgress,
  Snackbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  ExpandLess as ExpandLessIcon,
  ExpandMore as ExpandMoreIcon
} from '@mui/icons-material';
import { useLanguage } from '../utils/LanguageContext';
import { getCategories, getSubcategories } from '../utils/categoryUtils';
import { updateAgendaSummary } from '../api/summary';
import { fetchAllIssues, fetchMinimalIssuesByIds, fetchIssueById } from '../api/issues';
import IssueDetailsModal from './IssueDetailsModal';
import { useAuth } from '../utils/authContext';
import api from '../utils/axiosConfig';

export const FinalAgendaScreen = ({ meeting, onUpdateAgenda, onUpdateIssues, onBack, onComplete, panchayatId }) => {
  const { language, strings } = useLanguage();
  const { user } = useAuth();
  
  const normalizeAgendaItems = (items) => {
    if (!items) {
      return [];
    }
    return items.map((item, index) => {
      const normalizedItem = {
        id: item._id?.toString() || item.id?.toString() || `agenda_${index + 1}`,
        _id: item._id || item.id,
        title: item.title || '',
        description: item.description || '',
        linkedIssues: item.linked_issues || item.linkedIssues || [],
        estimatedDuration: item.estimatedDuration || 15,
        order: item.order || index + 1,
        createdByType: item.createdByType || 'SYSTEM',
        ...(item.createdByType === 'USER' && item.createdByUserId
          ? { createdByUserId: item.createdByUserId }
          : {}),
      };
      return normalizedItem;
    });
  };

    const getIssueDisplayData = (issue) => {
    if (!issue) return { title: '', description: '' };
    // Choose enhanced transcription based on UI language
    const enhanced = language === 'hi'
      ? issue.transcription?.enhancedHindiTranscription
      : issue.transcription?.enhancedEnglishTranscription;
    // Fallback to raw transcription text
    const rawText = issue.transcription?.text;
    const fallback = issue.transcription_text || issue.text;
    const text = enhanced || rawText || fallback || 'No transcript available';
    return { title: text, description: text };
  };

  const { details = {}, selectedIssues: rawIssues = [], agendaItems = [] } = meeting || {};
  
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [issueLinkingModal, setIssueLinkingModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', estimatedDuration: 15 });
  const [editErrors, setEditErrors] = useState({ title: '', estimatedDuration: '' });
  const [newItem, setNewItem] = useState({ title: '', description: '', estimatedDuration: 15 });
  const [showAddForm, setShowAddForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [viewedIssue, setViewedIssue] = useState(null);
  // Track hovered issue for marquee effect in manage issues modal
  const [hoveredIssueId, setHoveredIssueId] = useState(null);
  // Filters for manage issues modal
  const [categoryFilter, setCategoryFilter] = useState('');
  const [subcategoryFilter, setSubcategoryFilter] = useState('');
  const [linkStatusFilter, setLinkStatusFilter] = useState('all');
  const [linkableIssues, setLinkableIssues] = useState([]);
  const [issuesLoading, setIssuesLoading] = useState(false);
  const [issues, setIssues] = useState(rawIssues);
  // Collapsible filters section
  const [filtersOpen, setFiltersOpen] = useState(true);

  // Use useMemo to ensure issues and agendaState update when props change
  const normalizedAgendaItems = useMemo(() => {
    return normalizeAgendaItems(agendaItems);
  }, [language, agendaItems]);

  // State for editable agenda items
  const [agendaState, setAgendaState] = useState(normalizedAgendaItems || []);

  // Update agendaState when normalizedAgendaItems change (only if length changes)
  useEffect(() => {
    if (agendaState.length !== normalizedAgendaItems.length) {
      setAgendaState(normalizedAgendaItems || []);
    }
  }, [normalizedAgendaItems]);

  useEffect(() => {
    onUpdateAgenda(agendaState);
  }, [agendaState]);

  // Helper to get all unique linked issue IDs from agenda items
  const getAllLinkedIssueIds = (agendaItems) => {
    const ids = new Set();
    (agendaItems || []).forEach(item => {
      (item.linkedIssues || []).forEach(id => ids.add(id));
    });
    return Array.from(ids);
  };

  // On mount or when agendaItems/rawIssues change, ensure all linked issues are present in issues array
  useEffect(() => {
    let isMounted = true;
    const ensureAllLinkedIssues = async () => {
      const linkedIds = getAllLinkedIssueIds(agendaItems);
      const existingIds = new Set((issues || []).map(i => i._id || i.id));
      const missingIds = linkedIds.filter(id => !existingIds.has(id));
      if (missingIds.length === 0) return;
      try {
        // Use the new minimal batch fetch API
        const fetched = await fetchMinimalIssuesByIds(missingIds);
        if (isMounted && fetched.length > 0) {
          setIssues(prev => [...prev, ...fetched]);
        }
      } catch (e) {
        // Ignore fetch errors for missing issues
      }
    };
    ensureAllLinkedIssues();
    return () => { isMounted = false; };
  }, [agendaItems, rawIssues, panchayatId]);

  // Update issues if rawIssues prop changes
  useEffect(() => {
    setIssues(rawIssues);
  }, [rawIssues]);

  const getLinkedIssues = (issueIds = []) => {
    if (!Array.isArray(issueIds)) {
      return [];
    }
    const linkedIssues = issueIds.map(id => issues.find(issue => (issue._id || issue.id) === id)).filter(Boolean);
    return linkedIssues;
  };

  const handleViewIssue = async (issueId) => {
    try {
      const response = await fetchIssueById(issueId);
      if (response && response.issue) {
        setViewedIssue(response.issue);
      } else {
        setSaveError('Issue not found');
      }
    } catch (err) {
      setSaveError('Failed to load issue details');
    }
  };

  const getFilteredIssues = () => {
    return linkableIssues.filter(issue => {
      // Search filter
      const { title } = getIssueDisplayData(issue);
      if (searchTerm && !title.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      // Category filter
      if (categoryFilter && issue.category !== categoryFilter) {
        return false;
      }
      // Subcategory filter
      if (subcategoryFilter && issue.subcategory !== subcategoryFilter) {
        return false;
      }
      // Link status filter
      const linkedTo = agendaState.find(i => i.linkedIssues.includes(issue._id));
      const status = linkedTo
        ? linkedTo.id === issueLinkingModal
          ? 'current'
          : 'other'
        : 'none';
      if (linkStatusFilter !== 'all' && status !== linkStatusFilter) {
        return false;
      }
      return true;
    });
  };
  // Current agenda item for modal context
  const currentAgendaItem = agendaState.find(item => item.id === issueLinkingModal) || {};

  const toggleIssueLink = async (agendaItemId, issueId) => {
    const issue = linkableIssues.find(i => i._id === issueId);
    if (!issue) return;

    // If the issue is new to this screen, add it to the parent state
    if (!issues.some(i => i._id === issue._id)) {
      onUpdateIssues(issue);
    }

    const isAlreadyLinkedToCurrent = agendaState.find(item => item.id === agendaItemId)?.linkedIssues.includes(issueId);

    let updatedItems = agendaState.map(item => ({
      ...item,
      linkedIssues: item.linkedIssues.filter(id => id !== issueId)
    }));

    if (!isAlreadyLinkedToCurrent) {
      updatedItems = updatedItems.map(item => 
        item.id === agendaItemId 
          ? { ...item, linkedIssues: [...item.linkedIssues, issueId] }
          : item
      );
    }
    
    setAgendaState(updatedItems);
    
    // Persist to backend immediately
    try {
      const payload = updatedItems.map(ensureMultilingualFields);
      await updateAgendaSummary(panchayatId, payload);
      await fetchAgendaSummary();
    } catch (err) {
      setSaveError(err.message || 'Failed to save agenda');
      setTimeout(() => setSaveError(''), 3000);
    }
  };

  const validateEditForm = () => {
    const errors = {};
    if (!editForm.title.trim()) {
      errors.title = 'Title is required';
    }
    if (!editForm.estimatedDuration || editForm.estimatedDuration <= 0) {
      errors.estimatedDuration = 'Duration must be a positive number';
    }
    setEditErrors(errors);
    const isValid = Object.keys(errors).length === 0;
    return isValid;
  };

  // Helper to ensure agenda item fields are objects with language keys
  const ensureMultilingualFields = (item) => {
    const convertMapToObj = (val) => {
      if (val instanceof Map) return Object.fromEntries(val);
      if (typeof val === 'object' && val !== null) return val;
      if (typeof val === 'string') return { [language]: val };
      return { en: '' };
    };
    return {
      ...item,
      _id: item._id || item.id,
      title: convertMapToObj(item.title),
      description: convertMapToObj(item.description),
      createdByType: item.createdByType || 'SYSTEM',
      ...(item.createdByType === 'USER' && item.createdByUserId
        ? { createdByUserId: item.createdByUserId }
        : {}),
    };
  };

  const fetchAgendaSummary = async () => {
    try {
      const res = await api.get(`/summaries/panchayat/${user.panchayatId}`);
      if (res.data?.summary?.agendaItems) {
        const normalized = normalizeAgendaItems(res.data.summary.agendaItems);
        setAgendaState(normalized);
      }
    } catch (err) {
      console.error('Failed to fetch summary:', err);
    }
  };

  const updateAgendaItem = async (id, updates) => {
    if (!validateEditForm()) {
      return;
    }
    const updated = agendaState.map(item => {
      if (item.id !== id) return item;
      // Update the correct language key for title/description
      const newTitle = { ...(typeof item.title === 'object' ? item.title : { [language]: item.title }) };
      newTitle[language] = updates.title;
      const newDescription = { ...(typeof item.description === 'object' ? item.description : { [language]: item.description }) };
      newDescription[language] = updates.description;
      return {
        ...item,
        title: newTitle,
        description: newDescription,
        estimatedDuration: updates.estimatedDuration || item.estimatedDuration,
      };
    });
    setAgendaState(updated);
    setEditingItem(null);
    setEditForm({ title: '', description: '', estimatedDuration: 15 });
    setEditErrors({ title: '', estimatedDuration: 15 });
    // Immediately persist to backend, ensuring multilingual fields
    try {
      const payload = updated.map(ensureMultilingualFields);
      await updateAgendaSummary(panchayatId, payload);
      await fetchAgendaSummary();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
    } catch (err) {
      setSaveError(err.message || 'Failed to save agenda');
      setTimeout(() => setSaveError(''), 3000);
    }
  };

  const deleteAgendaItem = async (id) => {
    if (!panchayatId) {
      console.error('Panchayat ID not available.');
      return;
    }
    const original = [...agendaState];
    const matchesId = (item) => (item._id ?? item.id)?.toString() === id.toString();
    const filtered = agendaState.filter(item => !matchesId(item));
    const reordered = filtered.map((item, index) => ({
      ...item,
      order: index + 1,
    }));
    
    setAgendaState(reordered);
    
    try {
      const payload = reordered.map(ensureMultilingualFields);
      await updateAgendaSummary(panchayatId, payload);
      await fetchAgendaSummary();
    } catch (err) {
      setAgendaState(original);
      setSaveError(err.message || 'Failed to delete agenda item');
      setTimeout(() => setSaveError(''), 3000);
    }
  };

  // Helper to get multilingual text
  const getMultilingualText = (item, field) => {
    if (!item || !item[field]) return '';
    let textObj = item[field];
    if (textObj && typeof textObj === 'object' && textObj.get) {
      textObj = Object.fromEntries(textObj);
    }
    if (typeof textObj === 'object' && textObj !== null) {
      return textObj[language] || textObj.en || textObj.hi || textObj.hindi || '';
    }
    return textObj || '';
  };

  const handleOpenLinkIssuesModal = async (agendaItemId) => {
    setIssueLinkingModal(agendaItemId);
    setIssuesLoading(true);
    try {
      const { data } = await fetchAllIssues({
        panchayatId,
        status: 'REPORTED',
        limit: 1000
      });

      // All unique issue IDs currently linked in agendaState
      const linkedIds = new Set(
        agendaState.flatMap(item =>
          (item.linkedIssues || []).map(id => id?.toString())
        )
      );

      // Combine fresh data with previously loaded linked issues not in the response
      const extraLinkedIssues = issues.filter(issue =>
        !data.some(f => f._id === issue._id) && linkedIds.has(issue._id?.toString())
      );

      const combined = [...data, ...extraLinkedIssues];
      const unique = Array.from(new Map(combined.map(i => [i._id, i])).values());

      setLinkableIssues(unique);
    } catch (error) {
      setSaveError('Failed to load issues. Please try again.');
    } finally {
      setIssuesLoading(false);
    }
  };

  return (
    <Box sx={{ mx: "auto", my: 0 }}>
      <Box sx={{ px: 3, mt: 4, mb: 4 }}>
        {agendaState.map((item) => (
          <Box
            key={item.id}
            // Only enable manage issues click when not editing this item
            onClick={
              editingItem !== item.id
                ? () => handleOpenLinkIssuesModal(item.id)
                : undefined
            }
            sx={{
              mb: 2,
              p: 2,
              border: "1px solid #ccc",
              borderRadius: 1,
              bgcolor: "#fafbfc",
              transition: "box-shadow 0.2s",
              cursor: editingItem !== item.id ? "pointer" : "default",
              "&:hover": editingItem !== item.id ? { boxShadow: 2 } : {},
            }}
          >
            {editingItem === item.id ? (
              <Box>
                <TextField
                  fullWidth
                  label={strings.title}
                  value={editForm.title}
                  onChange={(e) => {
                    const newTitle = e.target.value;
                    setEditForm({ ...editForm, title: newTitle });
                  }}
                  error={Boolean(editErrors.title)}
                  helperText={editErrors.title}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label={strings.description}
                  value={editForm.description}
                  onChange={(e) => {
                    const newDescription = e.target.value;
                    setEditForm({ ...editForm, description: newDescription });
                  }}
                  sx={{ mb: 2 }}
                />
                <TextField
                  fullWidth
                  label={strings.durationMins}
                  type="number"
                  value={editForm.estimatedDuration}
                  onChange={(e) => {
                    const newDuration = parseInt(e.target.value) || 15;
                    setEditForm({
                      ...editForm,
                      estimatedDuration: newDuration,
                    });
                  }}
                  error={Boolean(editErrors.estimatedDuration)}
                  helperText={editErrors.estimatedDuration}
                  sx={{ mb: 2 }}
                />
                <Stack direction="row" spacing={2}>
                  <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                      updateAgendaItem(item.id, editForm);
                    }}
                  >
                    {strings.save}
                  </Button>
                  <Button
                    onClick={() => {
                      setEditingItem(null);
                      setEditErrors({ title: "", estimatedDuration: "" });
                    }}
                  >
                    {strings.cancel}
                  </Button>
                </Stack>
              </Box>
            ) : (
              <>
                <Stack direction="row" alignItems="center">
                  <Typography
                    variant="body1"
                    sx={{
                      flexGrow: 1,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      cursor: "pointer",
                    }}
                    onClick={() => handleOpenLinkIssuesModal(item.id)}
                  >
                    {getMultilingualText(item, "title")}
                  </Typography>
                  <Chip
                    label={`${item.linkedIssues?.length || 0} issues`}
                    size="small"
                    color="info"
                    clickable
                    onClick={() => handleOpenLinkIssuesModal(item.id)}
                    sx={{ ml: 1 }}
                  />
                  <Chip
                    label={
                      item.estimatedDuration
                        ? `${item.estimatedDuration} min`
                        : "15 min"
                    }
                    size="small"
                    color="secondary"
                    sx={{ ml: 1 }}
                  />
                  <Stack direction="row">
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item.id);
                        setEditForm({
                          title: getMultilingualText(item, "title"),
                          description: getMultilingualText(item, "description"),
                          estimatedDuration: item.estimatedDuration
                            ? item.estimatedDuration
                            : 15,
                        });
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteAgendaItem(item._id || item.id);
                      }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Stack>
              </>
            )}
          </Box>
        ))}
      </Box>

      <Modal
        open={Boolean(issueLinkingModal)}
        onClose={() => {
          setIssueLinkingModal(null);
        }}
      >
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            boxShadow: 24,
            borderRadius: 2,
            p: 4,
            width: { xs: "90%", md: 900 },
            maxHeight: "90vh",
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            mb={2}
          >
            <Typography variant="h6" gutterBottom>
              {strings.title}: {getMultilingualText(currentAgendaItem, "title")}
            </Typography>
            <IconButton
              onClick={() => {
                setIssueLinkingModal(null);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Stack>
          {/* Display selected agenda item prominently */}

          <Typography variant="body1" paragraph>
            {strings.description}: {getMultilingualText(currentAgendaItem, "description")}
          </Typography>
          <TextField
            fullWidth
            placeholder="Search issues"
            value={searchTerm}
            onChange={(e) => {
              const newSearchTerm = e.target.value;
              setSearchTerm(newSearchTerm);
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2 }}
          />
          {/* Collapsible Filters Section */}
          <Box sx={{ px: 3, mb: 4 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="subtitle2">Filters</Typography>
              <IconButton onClick={() => setFiltersOpen(!filtersOpen)}>
                {filtersOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
              </IconButton>
            </Stack>
            {filtersOpen && (
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                mb={2}
                sx={{ flexWrap: "wrap" }}
              >
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>{strings.filterCategory}</InputLabel>
                  <Select
                    label={strings.filterCategory}
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value)}
                  >
                    <MenuItem value="">{strings.filterAll}</MenuItem>
                    {getCategories().map((cat) => (
                      <MenuItem key={cat.value} value={cat.value}>
                        {strings[cat.labelKey]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <InputLabel>{strings.filterSubcategory}</InputLabel>
                  <Select
                    label={strings.filterSubcategory}
                    value={subcategoryFilter}
                    onChange={(e) => setSubcategoryFilter(e.target.value)}
                    disabled={!categoryFilter}
                  >
                    <MenuItem value="">{strings.filterAll}</MenuItem>
                    {getSubcategories(categoryFilter).map((sub) => (
                      <MenuItem key={sub.value} value={sub.value}>
                        {strings[sub.labelKey]}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 180 }}>
                  <InputLabel>{strings.filterStatusAll}</InputLabel>
                  <Select
                    label={strings.filterStatusAll}
                    value={linkStatusFilter}
                    onChange={(e) => setLinkStatusFilter(e.target.value)}
                  >
                    <MenuItem value="all">{strings.filterStatusAll}</MenuItem>
                    <MenuItem value="current">
                      {strings.filterStatusCurrent}
                    </MenuItem>
                    <MenuItem value="other">
                      {strings.filterStatusOther}
                    </MenuItem>
                    <MenuItem value="none">{strings.filterStatusNone}</MenuItem>
                  </Select>
                </FormControl>
                {/* Reset all filters */}
                <Button
                  size="small"
                  onClick={() => {
                    setSearchTerm("");
                    setCategoryFilter("");
                    setSubcategoryFilter("");
                    setLinkStatusFilter("all");
                  }}
                >
                  {strings.filterReset}
                </Button>
              </Stack>
            )}
          </Box>

          <Typography variant="caption" color="textSecondary" sx={{ mb: 2 }}>
            {strings.filterStatusExplanation}
          </Typography>
          <Box>
            {issuesLoading ? (
              <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                {getFilteredIssues().length === 0 ? (
                  <Typography
                    align="center"
                    color="textSecondary"
                    sx={{ p: 2 }}
                  >
                    {strings.noDataToDisplay}
                  </Typography>
                ) : (
                  getFilteredIssues().map((issue) => {
                    const issueId = issue._id;
                    const { title } = getIssueDisplayData(issue);
                    const linkedItem = agendaState.find((i) =>
                      i.linkedIssues.includes(issueId)
                    );
                    const linkStatus = linkedItem
                      ? linkedItem.id === issueLinkingModal
                        ? "current"
                        : "other"
                      : "none";

                    return (
                      <Stack
                        key={issueId}
                        direction="row"
                        alignItems="center"
                        spacing={1}
                        sx={(theme) => ({
                          p: 1,
                          border: `1px solid ${theme.palette.divider}`,
                          borderRadius: 1,
                          mb: 1,
                          cursor: "pointer",
                          bgcolor:
                            linkStatus === "current"
                              ? theme.palette.primary.main
                              : linkStatus === "other"
                              ? theme.palette.grey[400]
                              : theme.palette.background.paper,
                          color:
                            linkStatus === "current"
                              ? theme.palette.common.white
                              : linkStatus === "other"
                              ? theme.palette.getContrastText(
                                  theme.palette.grey[400]
                                )
                              : theme.palette.text.primary,
                        })}
                      >
                        <Box
                          sx={{ flexGrow: 1, minWidth: 0 }}
                          onClick={() =>
                            toggleIssueLink(issueLinkingModal, issueId)
                          }
                          onMouseEnter={() => setHoveredIssueId(issueId)}
                          onMouseLeave={() => setHoveredIssueId(null)}
                          onTouchStart={() => setHoveredIssueId(issueId)}
                          onTouchEnd={() => setHoveredIssueId(null)}
                        >
                          {hoveredIssueId === issueId ? (
                            <marquee>{title}</marquee>
                          ) : (
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                            >
                              {title}
                            </Typography>
                          )}
                        </Box>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewIssue(issueId);
                          }}
                          sx={{
                            color:
                              linkStatus === "current" ? "white" : "inherit",
                          }}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    );
                  })
                )}
              </>
            )}
          </Box>
        </Box>
      </Modal>

      <IssueDetailsModal
        issue={viewedIssue}
        open={Boolean(viewedIssue)}
        onClose={() => setViewedIssue(null)}
      />
    </Box>
  );
};
