import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Alert,
  CircularProgress,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  IconButton,
  Chip,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Stack,
  Menu,
  Tabs,
  Tab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  Tooltip,
  Breadcrumbs,
  Link,
  Skeleton,
  List,
  ListItem,
  ListItemText,
  useMediaQuery,
  useTheme
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Business as BusinessIcon,
  ContactPhone as ContactIcon,
  People as PeopleIcon,
  Image as ImageIcon,
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Search as SearchIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
  HowToReg as HowToRegIcon,
  Pending as PendingIcon,
  Male as MaleIcon,
  Female as FemaleIcon,
  Close as CloseIcon,
  Person as PersonIcon,
  Phone as PhoneIcon,
  Home as HomeIcon,
  Badge as BadgeIcon,
  NavigateNext as NavigateNextIcon,
  Dashboard as DashboardIcon,
  Assignment as AssignmentIcon,
  Info as InfoIcon,
  PersonAdd as PersonAddIcon,
  Groups as GroupsIcon,
  PhotoCamera as PhotoCameraIcon,
  ZoomIn as ZoomInIcon,
  CalendarToday as CalendarTodayIcon,
  FamilyRestroom as FamilyRestroomIcon,
  Wc as WcIcon,
  LocationOn as LocationOnIcon,
  Category as CategoryIcon
} from '@mui/icons-material';
import { useLanguage } from '../utils/LanguageContext';
import { fetchUsers } from '../api';
import LetterheadUploader from '../components/LetterheadUploader';

const PanchayatSettingsView = ({ user, panchayatId, onBack }) => {
  const { strings } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [overviewData, setOverviewData] = useState(null);
  const [citizens, setCitizens] = useState([]);
  const [citizensLoading, setCitizensLoading] = useState(false);
  const [editingContact, setEditingContact] = useState(false);
  const [contactForm, setContactForm] = useState({
    officialWhatsappNumber: '',
    supportEmail: '',
    supportPhoneNumber: '',
    supportContactPersonName: ''
  });
  const [savingContact, setSavingContact] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState(0);

  // Citizens table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    status: 'all',
    gender: 'all',
    ward: 'all'
  });
  const [filterAnchorEl, setFilterAnchorEl] = useState(null);
  const [selectedCitizen, setSelectedCitizen] = useState(null);

  // Face image state for citizen detail view
  const [citizenFaceImage, setCitizenFaceImage] = useState(null);
  const [citizenFaceLoading, setCitizenFaceLoading] = useState(false);
  const [citizenFaceError, setCitizenFaceError] = useState(false);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Fetch panchayat overview data
  useEffect(() => {
    const fetchOverview = async () => {
      if (!panchayatId) return;

      setLoading(true);
      setError('');

      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}/panchayats/${panchayatId}/overview`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch panchayat data');
        }

        setOverviewData(data.data);
        setContactForm({
          officialWhatsappNumber: data.data.panchayat.officialWhatsappNumber || '',
          supportEmail: data.data.panchayat.supportEmail || '',
          supportPhoneNumber: data.data.panchayat.supportPhoneNumber || '',
          supportContactPersonName: data.data.panchayat.supportContactPersonName || ''
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOverview();
  }, [panchayatId, API_URL]);

  // Fetch citizens when switching to Citizens tab
  useEffect(() => {
    const loadCitizens = async () => {
      if (activeTab !== 1 || !panchayatId || citizens.length > 0) return;

      setCitizensLoading(true);
      try {
        const usersData = await fetchUsers(panchayatId);
        setCitizens(usersData || []);
      } catch (err) {
        console.error('Error fetching citizens:', err);
        setError('Failed to load citizens');
      } finally {
        setCitizensLoading(false);
      }
    };

    loadCitizens();
  }, [activeTab, panchayatId, citizens.length]);

  // Fetch face image when citizen is selected
  useEffect(() => {
    const fetchCitizenFaceImage = async () => {
      if (!selectedCitizen || !selectedCitizen.voterIdNumber) {
        setCitizenFaceImage(null);
        return;
      }

      setCitizenFaceLoading(true);
      setCitizenFaceError(false);

      try {
        const token = localStorage.getItem('token');
        // First get the face image ID
        const response = await fetch(
          `${API_URL}/users/${selectedCitizen.voterIdNumber}/face?panchayatId=${selectedCitizen.panchayatId || panchayatId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        const data = await response.json();

        if (data.success && data.faceImageId) {
          // Try to get thumbnail first, fall back to full image
          const thumbUrl = `${API_URL}/users/${selectedCitizen._id}/thumbnail`;
          const thumbResponse = await fetch(thumbUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (thumbResponse.ok) {
            setCitizenFaceImage(thumbUrl);
          } else {
            setCitizenFaceImage(`${API_URL}/users/face-image/${data.faceImageId}`);
          }
        } else {
          setCitizenFaceImage(null);
          setCitizenFaceError(true);
        }
      } catch (err) {
        console.warn('Could not fetch citizen face image:', err);
        setCitizenFaceImage(null);
        setCitizenFaceError(true);
      } finally {
        setCitizenFaceLoading(false);
      }
    };

    fetchCitizenFaceImage();
  }, [selectedCitizen, panchayatId, API_URL]);

  // Handle contact info save
  const handleSaveContact = async () => {
    setSavingContact(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/panchayats/${panchayatId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(contactForm)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to update contact information');
      }

      setOverviewData(prev => ({
        ...prev,
        panchayat: {
          ...prev.panchayat,
          ...contactForm
        }
      }));
      setEditingContact(false);
      setSuccess(strings.contactInfoUpdated || 'Contact information updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingContact(false);
    }
  };

  // Handle letterhead upload complete
  const handleLetterheadUploadComplete = (letterheadConfig) => {
    setOverviewData(prev => ({
      ...prev,
      panchayat: {
        ...prev.panchayat,
        letterheadConfig
      }
    }));
  };

  // Handle letterhead delete
  const handleLetterheadDelete = () => {
    setOverviewData(prev => ({
      ...prev,
      panchayat: {
        ...prev.panchayat,
        letterheadConfig: null
      }
    }));
  };

  // Citizens filtering and pagination
  const filteredCitizens = citizens.filter(citizen => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      citizen.name?.toLowerCase().includes(searchLower) ||
      citizen.voterIdNumber?.toLowerCase().includes(searchLower) ||
      citizen.mobileNumber?.includes(searchTerm);

    const matchesStatus =
      filters.status === 'all' ||
      (filters.status === 'registered' && citizen.isRegistered) ||
      (filters.status === 'pending' && !citizen.isRegistered);

    const matchesGender =
      filters.gender === 'all' ||
      citizen.gender === filters.gender;

    const matchesWard =
      filters.ward === 'all' ||
      citizen.wardId?.name === filters.ward ||
      (!citizen.wardId && filters.ward === 'Unassigned');

    return matchesSearch && matchesStatus && matchesGender && matchesWard;
  });

  const paginatedCitizens = filteredCitizens.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  const activeFiltersCount = Object.values(filters).filter(v => v !== 'all').length;

  const getRoleColor = (role) => {
    const colorMap = {
      PRESIDENT: 'primary',
      SECRETARY: 'secondary',
      WARD_MEMBER: 'success',
      COMMITTEE_SECRETARY: 'info',
      GUEST: 'default'
    };
    return colorMap[role] || 'default';
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ pb: 4 }}>
      {/* Breadcrumb Navigation */}
      <Breadcrumbs
        separator={<NavigateNextIcon fontSize="small" />}
        sx={{ mb: 2 }}
        aria-label="navigation"
      >
        <Link
          component="button"
          variant="body2"
          onClick={onBack}
          sx={{
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            color: 'text.secondary',
            '&:hover': { color: 'primary.main' }
          }}
        >
          <DashboardIcon sx={{ mr: 0.5, fontSize: 18 }} />
          {strings.dashboard || 'Dashboard'}
        </Link>
        <Typography
          color="text.primary"
          sx={{ display: 'flex', alignItems: 'center' }}
        >
          <BusinessIcon sx={{ mr: 0.5, fontSize: 18 }} />
          {overviewData?.panchayat?.name || strings.panchayat || 'Panchayat'}
        </Typography>
      </Breadcrumbs>

      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          mb: 3,
          bgcolor: 'primary.main',
          color: 'white',
          borderRadius: 2
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          {strings.panchayatAdministration || 'Panchayat Administration'}
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.9, mt: 0.5 }}>
          {strings.manageSettingsDescription || 'Manage panchayat details, citizens, and official documents'}
        </Typography>
      </Paper>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Tabs Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTab-root': {
              minHeight: 56,
              textTransform: 'none',
              fontSize: '0.95rem'
            }
          }}
        >
          <Tab
            icon={<BusinessIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={strings.overview || "Overview"}
          />
          <Tab
            icon={<GroupsIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={strings.citizensList || "Citizens"}
          />
          <Tab
            icon={<ImageIcon sx={{ fontSize: 20 }} />}
            iconPosition="start"
            label={strings.manageLetterhead || "Manage Letterhead"}
          />
        </Tabs>
      </Paper>

      {/* Tab 0: Overview */}
      {activeTab === 0 && (
        <Box>
          {/* Section: Administrative Details */}
          <Box sx={{ mb: 4 }}>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.8rem'
              }}
            >
              <BusinessIcon sx={{ mr: 1, fontSize: 18 }} />
              {strings.administrativeDetails || 'Administrative Details'}
            </Typography>
            <Grid container spacing={3}>
              {/* Panchayat Details */}
              <Grid item xs={12} md={4}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
                      <Typography variant="h6" fontWeight="medium">
                        {strings.panchayatDetails || 'Panchayat Details'}
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {overviewData?.panchayat && (
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{strings.name || 'Name'}</Typography>
                          <Typography variant="body1" fontWeight="medium">{overviewData.panchayat.name}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{strings.state || 'State'}</Typography>
                          <Typography variant="body1" fontWeight="medium">{overviewData.panchayat.state}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{strings.district || 'District'}</Typography>
                          <Typography variant="body1" fontWeight="medium">{overviewData.panchayat.district}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{strings.block || 'Block'}</Typography>
                          <Typography variant="body1" fontWeight="medium">{overviewData.panchayat.block}</Typography>
                        </Grid>
                        {overviewData.panchayat.lgdCode && (
                          <Grid item xs={6}>
                            <Tooltip title={strings.lgdCodeTooltip || "Local Government Directory Code - Unique identifier assigned by Government of India"}>
                              <Box>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', fontSize: '0.75rem' }}>
                                  {strings.lgdCode || 'LGD Code'}
                                  <InfoIcon sx={{ ml: 0.5, fontSize: 14, color: 'text.disabled' }} />
                                </Typography>
                                <Typography variant="body1" fontWeight="medium">{overviewData.panchayat.lgdCode}</Typography>
                              </Box>
                            </Tooltip>
                          </Grid>
                        )}
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Contact Information */}
              <Grid item xs={12} md={3}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <ContactIcon sx={{ mr: 1, color: 'info.main' }} />
                        <Typography variant="h6" fontWeight="medium">
                          {strings.contactInformation || 'Contact Information'}
                        </Typography>
                      </Box>
                      {!editingContact ? (
                        <Tooltip title={strings.editContact || "Edit contact information"}>
                          <IconButton onClick={() => setEditingContact(true)} color="primary" size="small">
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Box>
                          <Tooltip title={strings.save || "Save"}>
                            <IconButton onClick={handleSaveContact} color="primary" size="small" disabled={savingContact}>
                              {savingContact ? <CircularProgress size={18} /> : <SaveIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title={strings.cancel || "Cancel"}>
                            <IconButton
                              onClick={() => {
                                setEditingContact(false);
                                setContactForm({
                                  officialWhatsappNumber: overviewData?.panchayat.officialWhatsappNumber || '',
                                  supportEmail: overviewData?.panchayat.supportEmail || '',
                                  supportPhoneNumber: overviewData?.panchayat.supportPhoneNumber || '',
                                  supportContactPersonName: overviewData?.panchayat.supportContactPersonName || ''
                                });
                              }}
                              color="error"
                              size="small"
                            >
                              <CancelIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      )}
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {editingContact ? (
                      <Stack spacing={2}>
                        <TextField
                          fullWidth
                          label={strings.officialWhatsappNumber || 'Official WhatsApp'}
                          value={contactForm.officialWhatsappNumber}
                          onChange={(e) => setContactForm(prev => ({ ...prev, officialWhatsappNumber: e.target.value }))}
                          size="small"
                        />
                        <TextField
                          fullWidth
                          label={strings.email || 'Support Email'}
                          value={contactForm.supportEmail}
                          onChange={(e) => setContactForm(prev => ({ ...prev, supportEmail: e.target.value }))}
                          size="small"
                          type="email"
                        />
                        <TextField
                          fullWidth
                          label={strings.phone || 'Support Phone'}
                          value={contactForm.supportPhoneNumber}
                          onChange={(e) => setContactForm(prev => ({ ...prev, supportPhoneNumber: e.target.value }))}
                          size="small"
                        />
                        <TextField
                          fullWidth
                          label={strings.contactPerson || 'Contact Person'}
                          value={contactForm.supportContactPersonName}
                          onChange={(e) => setContactForm(prev => ({ ...prev, supportContactPersonName: e.target.value }))}
                          size="small"
                        />
                      </Stack>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{strings.officialWhatsappNumber || 'Official WhatsApp'}</Typography>
                          <Typography variant="body1" fontWeight="medium">{overviewData?.panchayat.officialWhatsappNumber || '-'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{strings.email || 'Support Email'}</Typography>
                          <Typography variant="body1" fontWeight="medium" sx={{ wordBreak: 'break-all' }}>{overviewData?.panchayat.supportEmail || '-'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{strings.phone || 'Support Phone'}</Typography>
                          <Typography variant="body1" fontWeight="medium">{overviewData?.panchayat.supportPhoneNumber || '-'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>{strings.contactPerson || 'Contact Person'}</Typography>
                          <Typography variant="body1" fontWeight="medium">{overviewData?.panchayat.supportContactPersonName || '-'}</Typography>
                        </Grid>
                      </Grid>
                    )}
                  </CardContent>
                </Card>
              </Grid>

              {/* Citizens Summary */}
              <Grid item xs={12} md={5}>
                <Card elevation={2} sx={{ height: '100%' }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <PeopleIcon sx={{ mr: 1, color: 'success.main' }} />
                      <Typography variant="h6" fontWeight="medium">
                        {strings.citizensSummary || 'Citizens Summary'}
                      </Typography>
                    </Box>
                    <Divider sx={{ mb: 2 }} />

                    {overviewData?.stats && (
                      <>
                        <Grid container spacing={1} sx={{ mb: 2 }}>
                          <Grid item xs={4}>
                            <Tooltip title={strings.totalCitizensTooltip || "Total number of citizens in the voter list"}>
                              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'grey.100', cursor: 'help' }}>
                                <Typography variant="h5" fontWeight="bold" color="text.primary">
                                  {overviewData.stats.totalCitizens}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {strings.total || 'Total'}
                                </Typography>
                              </Paper>
                            </Tooltip>
                          </Grid>
                          <Grid item xs={4}>
                            <Tooltip title={strings.registeredTooltip || "Citizens who have completed registration"}>
                              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'success.50', cursor: 'help' }}>
                                <Typography variant="h5" fontWeight="bold" color="success.main">
                                  {overviewData.stats.registeredCitizens}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {strings.registered || 'Registered'}
                                </Typography>
                              </Paper>
                            </Tooltip>
                          </Grid>
                          <Grid item xs={4}>
                            <Tooltip title={strings.pendingTooltip || "Citizens who haven't completed registration"}>
                              <Paper sx={{ p: 1.5, textAlign: 'center', bgcolor: 'warning.50', cursor: 'help' }}>
                                <Typography variant="h5" fontWeight="bold" color="warning.main">
                                  {overviewData.stats.pendingCitizens}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {strings.pending || 'Pending'}
                                </Typography>
                              </Paper>
                            </Tooltip>
                          </Grid>
                        </Grid>

                        {/* Registration Progress Bar */}
                        {overviewData.stats.totalCitizens > 0 && (
                          <Box sx={{ mb: 2 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                              <Typography variant="caption" color="text.secondary">
                                {strings.registrationProgress || 'Registration Progress'}
                              </Typography>
                              <Typography variant="caption" fontWeight="bold" color="primary.main">
                                {Math.round((overviewData.stats.registeredCitizens / overviewData.stats.totalCitizens) * 100)}%
                              </Typography>
                            </Box>
                            <Box sx={{ width: '100%', bgcolor: 'grey.200', borderRadius: 1, height: 6, overflow: 'hidden' }}>
                              <Box
                                sx={{
                                  width: `${(overviewData.stats.registeredCitizens / overviewData.stats.totalCitizens) * 100}%`,
                                  bgcolor: 'success.main',
                                  height: '100%',
                                  borderRadius: 1
                                }}
                              />
                            </Box>
                          </Box>
                        )}

                        {/* Quick Action */}
                        {overviewData.stats.pendingCitizens > 0 && (
                          <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<PersonAddIcon />}
                            onClick={() => {
                              setActiveTab(1);
                              setFilters(prev => ({ ...prev, status: 'pending' }));
                            }}
                          >
                            {strings.reviewPending || 'Review Pending'}
                          </Button>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>

          {/* Section: Officials & Contacts */}
          <Box>
            <Typography
              variant="subtitle1"
              fontWeight="bold"
              sx={{
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                color: 'text.secondary',
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontSize: '0.8rem'
              }}
            >
              <BadgeIcon sx={{ mr: 1, fontSize: 18 }} />
              {strings.officialsContacts || 'Officials & Contacts'}
            </Typography>
            <Card elevation={2}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <PeopleIcon sx={{ mr: 1, color: 'warning.main' }} />
                  <Typography variant="h6" fontWeight="medium">
                    {strings.officialsList || 'Panchayat Officials'}
                  </Typography>
                </Box>
                <Divider sx={{ mb: 2 }} />

                {overviewData?.officials && overviewData.officials.length > 0 ? (
                  <TableContainer>
                    <Table size="medium">
                      <TableHead>
                        <TableRow sx={{ bgcolor: 'grey.50' }}>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{strings.name || 'Name'}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{strings.username || 'Username'}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>{strings.role || 'Role'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {overviewData.officials.map((official) => (
                          <TableRow key={official._id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Avatar sx={{ width: 32, height: 32, mr: 1.5, bgcolor: 'primary.light', fontSize: '0.875rem' }}>
                                  {(official.name || official.linkedCitizenId?.name || '?').charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="body2" fontWeight="medium">
                                  {official.name || official.linkedCitizenId?.name || '-'}
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" color="text.secondary">
                                {official.username}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={official.role.replace(/_/g, ' ')}
                                color={getRoleColor(official.role)}
                                size="small"
                                sx={{ fontWeight: 'medium' }}
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <Alert severity="info">
                    {strings.noOfficials || 'No officials have been assigned to this panchayat yet.'}
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Tab 1: Citizens List */}
      {activeTab === 1 && (
        <Paper elevation={2} sx={{ p: 3 }}>
          {citizensLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h6">
                  {strings.citizensList || 'Citizens List'} ({citizens.length})
                </Typography>

                <Stack direction="row" spacing={2} alignItems="center">
                  <TextField
                    placeholder={strings.searchCitizens || "Search citizens..."}
                    variant="outlined"
                    size="small"
                    value={searchTerm}
                    onChange={(e) => { setSearchTerm(e.target.value); setPage(0); }}
                    sx={{ minWidth: 200 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon />
                        </InputAdornment>
                      ),
                      endAdornment: searchTerm && (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSearchTerm('')}>
                            <ClearIcon fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      )
                    }}
                  />

                  <Button
                    startIcon={<FilterListIcon />}
                    endIcon={activeFiltersCount > 0 ? <Chip size="small" label={activeFiltersCount} /> : null}
                    variant={activeFiltersCount > 0 ? "contained" : "outlined"}
                    onClick={(e) => setFilterAnchorEl(e.currentTarget)}
                  >
                    {strings.filter || 'Filter'}
                  </Button>

                  <Menu
                    anchorEl={filterAnchorEl}
                    open={Boolean(filterAnchorEl)}
                    onClose={() => setFilterAnchorEl(null)}
                    PaperProps={{ sx: { width: 250, p: 2 } }}
                  >
                    <Typography variant="subtitle2" sx={{ px: 1, pb: 1 }}>
                      {strings.filterCitizens || 'Filter Citizens'}
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    <Box sx={{ px: 1 }}>
                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>{strings.status || 'Status'}</InputLabel>
                        <Select
                          value={filters.status}
                          label={strings.status || 'Status'}
                          onChange={(e) => { setFilters(prev => ({ ...prev, status: e.target.value })); setPage(0); }}
                        >
                          <MenuItem value="all">{strings.all || 'All'}</MenuItem>
                          <MenuItem value="registered">{strings.registered || 'Registered'}</MenuItem>
                          <MenuItem value="pending">{strings.pending || 'Pending'}</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>{strings.gender || 'Gender'}</InputLabel>
                        <Select
                          value={filters.gender}
                          label={strings.gender || 'Gender'}
                          onChange={(e) => { setFilters(prev => ({ ...prev, gender: e.target.value })); setPage(0); }}
                        >
                          <MenuItem value="all">{strings.all || 'All'}</MenuItem>
                          <MenuItem value="Male">{strings.male || 'Male'}</MenuItem>
                          <MenuItem value="Female">{strings.female || 'Female'}</MenuItem>
                          <MenuItem value="Other">{strings.other || 'Other'}</MenuItem>
                        </Select>
                      </FormControl>

                      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
                        <InputLabel>{strings.ward || 'Ward'}</InputLabel>
                        <Select
                          value={filters.ward}
                          label={strings.ward || 'Ward'}
                          onChange={(e) => { setFilters(prev => ({ ...prev, ward: e.target.value })); setPage(0); }}
                        >
                          <MenuItem value="all">{strings.all || 'All'}</MenuItem>
                          <MenuItem value="Unassigned">{strings.unassigned || 'Unassigned'}</MenuItem>
                          {(overviewData?.wards || []).map(ward => (
                            <MenuItem key={ward._id} value={ward.name}>{ward.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>

                      <Button
                        variant="text"
                        size="small"
                        onClick={() => setFilters({ status: 'all', gender: 'all', ward: 'all' })}
                        disabled={activeFiltersCount === 0}
                      >
                        {strings.resetFilters || 'Reset Filters'}
                      </Button>
                    </Box>
                  </Menu>
                </Stack>
              </Box>

              {filteredCitizens.length === 0 ? (
                <Alert severity="info">
                  {searchTerm || activeFiltersCount > 0
                    ? (strings.noMatchingCitizens || 'No citizens match your search criteria.')
                    : (strings.noCitizens || 'No citizens found for this panchayat.')}
                </Alert>
              ) : (
                <Box>
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 'bold' }}>{strings.name || 'Name'}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{strings.voterId || 'Voter ID'}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{strings.gender || 'Gender'}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{strings.phone || 'Phone'}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{strings.ward || 'Ward'}</TableCell>
                          <TableCell sx={{ fontWeight: 'bold' }}>{strings.status || 'Status'}</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {paginatedCitizens.map((citizen) => (
                          <TableRow
                            key={citizen._id}
                            hover
                            onClick={() => setSelectedCitizen(citizen)}
                            sx={{ cursor: 'pointer' }}
                          >
                            <TableCell>{citizen.name || '-'}</TableCell>
                            <TableCell>{citizen.voterIdNumber || '-'}</TableCell>
                            <TableCell>{citizen.gender || '-'}</TableCell>
                            <TableCell>{citizen.mobileNumber || '-'}</TableCell>
                            <TableCell>{citizen.wardId?.name || '-'}</TableCell>
                            <TableCell>
                              {citizen.isRegistered ? (
                                <Chip
                                  icon={<HowToRegIcon />}
                                  label={strings.registered || "Registered"}
                                  color="success"
                                  size="small"
                                  variant="outlined"
                                />
                              ) : (
                                <Chip
                                  icon={<PendingIcon />}
                                  label={strings.pending || "Pending"}
                                  color="warning"
                                  size="small"
                                  variant="outlined"
                                />
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" color="text.secondary">
                      {strings.showing || 'Showing'} {Math.min(filteredCitizens.length, 1 + page * rowsPerPage)}-
                      {Math.min(filteredCitizens.length, (page + 1) * rowsPerPage)} {strings.of || 'of'} {filteredCitizens.length}
                      {activeFiltersCount > 0 && ` (${strings.filtered || 'filtered'})`}
                    </Typography>

                    <TablePagination
                      rowsPerPageOptions={[10, 25, 50, 100]}
                      component="div"
                      count={filteredCitizens.length}
                      rowsPerPage={rowsPerPage}
                      page={page}
                      onPageChange={(e, newPage) => setPage(newPage)}
                      onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
                    />
                  </Box>
                </Box>
              )}
            </Box>
          )}
        </Paper>
      )}

      {/* Tab 2: Letterhead Management */}
      {activeTab === 2 && (
        <Card elevation={2}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <ImageIcon sx={{ mr: 1, color: 'secondary.main' }} />
              <Typography variant="h6" fontWeight="medium">
                {strings.manageLetterhead || 'Manage Letterhead'}
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <LetterheadUploader
              panchayatId={panchayatId}
              initialConfig={overviewData?.panchayat?.letterheadConfig}
              onUploadComplete={handleLetterheadUploadComplete}
              onConfigChange={handleLetterheadUploadComplete}
              onDelete={handleLetterheadDelete}
              disabled={!['PRESIDENT', 'SECRETARY'].includes(user?.role)}
            />
          </CardContent>
        </Card>
      )}

      {/* Citizen Detail Dialog - Full Profile View */}
      <Dialog
        open={Boolean(selectedCitizen)}
        onClose={() => {
          setSelectedCitizen(null);
          setCitizenFaceImage(null);
          setCitizenFaceError(false);
        }}
        maxWidth="md"
        fullWidth
        fullScreen={isMobile}
      >
        <DialogTitle sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'primary.main',
          color: 'white'
        }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonIcon />
            <Typography variant="h6">{strings.citizenProfile || 'Citizen Profile'}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {selectedCitizen && (
              <Chip
                icon={selectedCitizen.isRegistered ? <HowToRegIcon sx={{ color: 'white !important' }} /> : <PendingIcon sx={{ color: 'white !important' }} />}
                label={selectedCitizen.isRegistered ? (strings.registered || 'Registered') : (strings.pending || 'Pending')}
                sx={{
                  bgcolor: selectedCitizen.isRegistered ? 'success.dark' : 'warning.dark',
                  color: 'white',
                  '& .MuiChip-icon': { color: 'white' }
                }}
                size="small"
              />
            )}
            <IconButton
              onClick={() => {
                setSelectedCitizen(null);
                setCitizenFaceImage(null);
                setCitizenFaceError(false);
              }}
              sx={{ color: 'white' }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {selectedCitizen && (
            <Box>
              {/* Header Card with Photo and Basic Info */}
              <Card elevation={0} sx={{ borderRadius: 0 }}>
                <Grid container>
                  {/* Photo Section */}
                  <Grid item xs={12} md={4} sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    p: 3,
                    bgcolor: 'grey.50'
                  }}>
                    <Box sx={{ position: 'relative' }}>
                      {citizenFaceLoading ? (
                        <Skeleton
                          variant="rectangular"
                          width={160}
                          height={160}
                          animation="wave"
                          sx={{ borderRadius: 2 }}
                        />
                      ) : citizenFaceImage && !citizenFaceError ? (
                        <Box sx={{ position: 'relative' }}>
                          <CardMedia
                            component="img"
                            image={citizenFaceImage}
                            alt={selectedCitizen.name}
                            onError={() => setCitizenFaceError(true)}
                            sx={{
                              width: 160,
                              height: 160,
                              objectFit: 'cover',
                              objectPosition: 'center top',
                              borderRadius: 2,
                              boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                            }}
                          />
                          <IconButton
                            sx={{
                              position: 'absolute',
                              bottom: 8,
                              right: 8,
                              bgcolor: 'rgba(255,255,255,0.9)',
                              '&:hover': { bgcolor: 'white' }
                            }}
                            onClick={() => setImageModalOpen(true)}
                            size="small"
                          >
                            <ZoomInIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      ) : (
                        <Box sx={{
                          width: 160,
                          height: 160,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          bgcolor: 'grey.200',
                          borderRadius: 2
                        }}>
                          <PhotoCameraIcon sx={{ fontSize: 48, color: 'grey.500', mb: 1 }} />
                          <Typography variant="caption" color="text.secondary" textAlign="center">
                            {selectedCitizen.isRegistered
                              ? (strings.photoNotAvailable || 'Photo not available')
                              : (strings.notRegisteredYet || 'Not registered yet')}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Grid>

                  {/* Basic Info Section */}
                  <Grid item xs={12} md={8}>
                    <CardContent sx={{ p: 3 }}>
                      <Typography variant="h4" fontWeight="bold" gutterBottom>
                        {selectedCitizen.name || strings.unnamedCitizen || 'Unnamed Citizen'}
                      </Typography>

                      <Chip
                        icon={<BadgeIcon />}
                        label={`${strings.voterId || 'Voter ID'}: ${selectedCitizen.voterIdNumber}`}
                        color="primary"
                        variant="outlined"
                        sx={{ mb: 3 }}
                      />

                      <Grid container spacing={2}>
                        <Grid item xs={6} sm={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <WcIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                              {strings.gender || 'Gender'}
                            </Typography>
                          </Box>
                          <Typography variant="body1" fontWeight="medium">
                            {selectedCitizen.gender || '-'}
                          </Typography>
                        </Grid>

                        <Grid item xs={6} sm={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <PhoneIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                              {strings.phone || 'Phone'}
                            </Typography>
                          </Box>
                          <Typography variant="body1" fontWeight="medium">
                            {selectedCitizen.mobileNumber || '-'}
                          </Typography>
                        </Grid>

                        <Grid item xs={6} sm={4}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <LocationOnIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
                            <Typography variant="caption" color="text.secondary">
                              {strings.ward || 'Ward'}
                            </Typography>
                          </Box>
                          <Typography variant="body1" fontWeight="medium">
                            {selectedCitizen.wardId?.name || strings.unassigned || 'Unassigned'}
                          </Typography>
                        </Grid>

                        {selectedCitizen.age && (
                          <Grid item xs={6} sm={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <CalendarTodayIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
                              <Typography variant="caption" color="text.secondary">
                                {strings.age || 'Age'}
                              </Typography>
                            </Box>
                            <Typography variant="body1" fontWeight="medium">
                              {selectedCitizen.age} {strings.years || 'years'}
                            </Typography>
                          </Grid>
                        )}

                        {selectedCitizen.registrationDate && (
                          <Grid item xs={6} sm={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <HowToRegIcon sx={{ fontSize: 18, color: 'text.secondary', mr: 1 }} />
                              <Typography variant="caption" color="text.secondary">
                                {strings.registrationDate || 'Registered On'}
                              </Typography>
                            </Box>
                            <Typography variant="body1" fontWeight="medium">
                              {new Date(selectedCitizen.registrationDate).toLocaleDateString()}
                            </Typography>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Grid>
                </Grid>
              </Card>

              <Divider />

              {/* Detailed Information Sections */}
              <Box sx={{ p: 3 }}>
                <Grid container spacing={3}>
                  {/* Family Information */}
                  {(selectedCitizen.fatherName || selectedCitizen.motherName || selectedCitizen.husbandName) && (
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                          <FamilyRestroomIcon sx={{ mr: 1, color: 'primary.main' }} />
                          {strings.familyInformation || 'Family Information'}
                        </Typography>
                        <List dense disablePadding>
                          {selectedCitizen.fatherName && (
                            <ListItem disableGutters>
                              <ListItemText
                                primary={strings.fatherName || "Father's Name"}
                                secondary={selectedCitizen.fatherName}
                                primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium', color: 'text.primary' }}
                              />
                            </ListItem>
                          )}
                          {selectedCitizen.motherName && (
                            <ListItem disableGutters>
                              <ListItemText
                                primary={strings.motherName || "Mother's Name"}
                                secondary={selectedCitizen.motherName}
                                primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium', color: 'text.primary' }}
                              />
                            </ListItem>
                          )}
                          {selectedCitizen.husbandName && (
                            <ListItem disableGutters>
                              <ListItemText
                                primary={strings.husbandName || "Husband's Name"}
                                secondary={selectedCitizen.husbandName}
                                primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium', color: 'text.primary' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Paper>
                    </Grid>
                  )}

                  {/* Caste Information */}
                  {(selectedCitizen.caste?.category || selectedCitizen.caste?.name || selectedCitizen.caste) && (
                    <Grid item xs={12} md={6}>
                      <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center' }}>
                          <CategoryIcon sx={{ mr: 1, color: 'primary.main' }} />
                          {strings.casteInformation || 'Caste Information'}
                        </Typography>
                        <List dense disablePadding>
                          {(selectedCitizen.caste?.category) && (
                            <ListItem disableGutters>
                              <ListItemText
                                primary={strings.casteCategory || "Category"}
                                secondary={selectedCitizen.caste.category}
                                primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium', color: 'text.primary' }}
                              />
                            </ListItem>
                          )}
                          {(selectedCitizen.caste?.name || (typeof selectedCitizen.caste === 'string' && selectedCitizen.caste)) && (
                            <ListItem disableGutters>
                              <ListItemText
                                primary={strings.caste || "Caste"}
                                secondary={selectedCitizen.caste?.name || selectedCitizen.caste}
                                primaryTypographyProps={{ variant: 'caption', color: 'text.secondary' }}
                                secondaryTypographyProps={{ variant: 'body1', fontWeight: 'medium', color: 'text.primary' }}
                              />
                            </ListItem>
                          )}
                        </List>
                      </Paper>
                    </Grid>
                  )}

                  {/* Address */}
                  {selectedCitizen.address && (
                    <Grid item xs={12}>
                      <Paper variant="outlined" sx={{ p: 2 }}>
                        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, display: 'flex', alignItems: 'center' }}>
                          <HomeIcon sx={{ mr: 1, color: 'primary.main' }} />
                          {strings.address || 'Address'}
                        </Typography>
                        <Typography variant="body1">
                          {selectedCitizen.address}
                        </Typography>
                      </Paper>
                    </Grid>
                  )}
                </Grid>

                {/* No Additional Info Message */}
                {!selectedCitizen.fatherName && !selectedCitizen.motherName && !selectedCitizen.husbandName &&
                 !selectedCitizen.caste && !selectedCitizen.address && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    {strings.noAdditionalInfo || 'No additional information available for this citizen. Details will appear here once updated.'}
                  </Alert>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setSelectedCitizen(null);
              setCitizenFaceImage(null);
              setCitizenFaceError(false);
            }}
            color="primary"
            variant="contained"
          >
            {strings.close || 'Close'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Zoom Modal */}
      {imageModalOpen && citizenFaceImage && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            bgcolor: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 9999,
            cursor: 'pointer'
          }}
          onClick={() => setImageModalOpen(false)}
        >
          <Box sx={{ position: 'relative', maxWidth: '90%', maxHeight: '90%' }}>
            <Box
              component="img"
              src={citizenFaceImage}
              alt={selectedCitizen?.name || 'Citizen'}
              sx={{
                maxWidth: '100%',
                maxHeight: '90vh',
                objectFit: 'contain',
                border: '2px solid white',
                borderRadius: 1
              }}
            />
            <IconButton
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                bgcolor: 'rgba(255,255,255,0.8)',
                '&:hover': { bgcolor: 'white' }
              }}
              onClick={(e) => {
                e.stopPropagation();
                setImageModalOpen(false);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PanchayatSettingsView;
