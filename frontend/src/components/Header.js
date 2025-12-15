import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Tabs,
  Tab,
  useMediaQuery,
  Box,
  IconButton,
  Menu,
  MenuItem,
  useTheme,
  Divider,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton
} from '@mui/material';
import HomeIcon from '@mui/icons-material/Home';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PersonIcon from '@mui/icons-material/Person';
import MenuIcon from '@mui/icons-material/Menu';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LockIcon from '@mui/icons-material/Lock';
import LogoutIcon from '@mui/icons-material/Logout';
import PanchayatSelector from './PanchayatSelector';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../utils/authContext';
import PasswordChangeForm from '../views/PasswordChangeForm';
import { changePassword } from '../api/profile';

const Header = ({
  activeView,
  handleChangeView,
  menuItems,
  selectedPanchayat,
  onPanchayatChange,
  isAdminPortal = false,
  onSwitchPortal
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [passwordChangeLoading, setPasswordChangeLoading] = useState(false);
  const [passwordChangeError, setPasswordChangeError] = useState('');
  const navigate = useNavigate();
  const { logout } = useAuth();

  // Default menu items if not provided
  const defaultMenuItems = isAdminPortal ? [
    { label: 'Home', icon: <HomeIcon /> },
    { label: 'Search', icon: <SearchIcon /> },
    { label: 'Members', icon: <PeopleIcon /> },
    { label: 'Import', icon: <UploadFileIcon /> },
    { label: 'Panchayats', icon: <AccountBalanceIcon /> }
  ] : [];

  // Use provided menu items or default ones
  const items = menuItems || defaultMenuItems;

  // Show panchayat selector in admin portal view, except in panchayats view
  const showPanchayatSelector = isAdminPortal && activeView !== 4 && onPanchayatChange;

  // Handle navigation to opposite portal
  const handlePortalSwitch = () => {
    if (onSwitchPortal) {
      onSwitchPortal();
    } else {
      if (isAdminPortal) {
        navigate('/');
      } else {
        navigate('/admin');
      }
    }
    setDrawerOpen(false);
  };

  // Handle password change
  const handlePasswordChange = async (currentPassword, newPassword) => {
    setPasswordChangeLoading(true);
    setPasswordChangeError('');

    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordDialogOpen(false);
      return true;
    } catch (error) {
      setPasswordChangeError(error.message || 'Failed to change password');
      return false;
    } finally {
      setPasswordChangeLoading(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/admin/login');
    setDrawerOpen(false);
  };

  // Handle menu item selection from drawer
  const handleDrawerItemSelect = (index) => {
    handleChangeView(null, index);
    setDrawerOpen(false);
  };

  // Toggle drawer open/closed
  const toggleDrawer = (open) => (event) => {
    if (
      event.type === 'keydown' &&
      (event.key === 'Tab' || event.key === 'Shift')
    ) {
      return;
    }
    setDrawerOpen(open);
  };

  return (
    <AppBar position="static" color="primary">
      <Toolbar sx={{ flexDirection: isMobile ? 'row' : 'row' }}>
        {/* App Title - Always visible */}
        <Typography
          variant={isMobile ? "h6" : "h5"}
          component="h1"
          sx={{
            mr: 2,
            flexGrow: isMobile ? 1 : 0,
            fontSize: isMobile ? '1.15rem' : undefined
          }}
        >
          Gram Sabha
        </Typography>

        {/* Panchayat Selector - desktop position */}
        {showPanchayatSelector && !isMobile && (
          <Box sx={{
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            maxWidth: { xs: '100%', md: '280px' },
            mr: { xs: 1, md: 2 }
          }}>
            <PanchayatSelector
              value={selectedPanchayat?._id || ''}
              onChange={(value) => {
                onPanchayatChange(value);
              }}
              showAllOption={false}
              size="small"
              sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 1 }}
              label=""
            />
          </Box>
        )}

        {/* Selected Panchayat display - desktop only */}
        {showPanchayatSelector && selectedPanchayat && !isSmallScreen && (
          <Chip
            label={`${selectedPanchayat.name}, ${selectedPanchayat.district}`}
            size="small"
            color="secondary"
            sx={{
              mr: 2,
              bgcolor: 'primary.light',
              color: 'white',
              "& .MuiChip-label": { fontWeight: 'medium' }
            }}
          />
        )}

        {!isMobile && <Box sx={{ flexGrow: 1 }} />}

        {/* Desktop User Menu */}
        {!isMobile && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Portal Switch Button */}
            <Button
              color="inherit"
              variant="outlined"
              onClick={handlePortalSwitch}
              sx={{
                mr: 2,
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.8)',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
              startIcon={isAdminPortal ? <PersonIcon /> : <AdminPanelSettingsIcon />}
            >
              {isAdminPortal ? 'Citizen Portal' : 'Admin Portal'}
            </Button>

            {/* Password Change Button */}
            <Button
              color="inherit"
              variant="outlined"
              onClick={() => setPasswordDialogOpen(true)}
              startIcon={<LockIcon />}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.8)',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Change Password
            </Button>

            {/* Logout Button */}
            <Button
              color="inherit"
              variant="outlined"
              onClick={handleLogout}
              sx={{
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': {
                  borderColor: 'rgba(255,255,255,0.8)',
                  backgroundColor: 'rgba(255,255,255,0.1)'
                }
              }}
            >
              Logout
            </Button>
          </Box>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <IconButton
            color="inherit"
            onClick={toggleDrawer(true)}
            edge="end"
            aria-label="menu"
          >
            <MenuIcon />
          </IconButton>
        )}
      </Toolbar>

      {/* Panchayat selector for mobile - below toolbar */}
      {isMobile && showPanchayatSelector && (
        <Box sx={{
          p: 1,
          backgroundColor: 'primary.dark',
          width: '100%'
        }}>
          <PanchayatSelector
            value={selectedPanchayat?._id || ''}
            onChange={(value) => {
              onPanchayatChange(value);
            }}
            showAllOption={false}
            size="small"
            fullWidth
            sx={{
              bgcolor: 'white',
              borderRadius: 1,
              '& .MuiInputBase-root': {
                height: 40, // Control height for better text placement
                padding: '0 14px', // Adjust internal padding
              },
              '& .MuiInputBase-input': {
                color: 'text.primary',
                padding: '7px 0', // Adjust padding around the text
                textAlign: 'left', // Ensure text is left-aligned
                position: 'relative', // Fix positioning
                lineHeight: '1.4', // Improve line height for text
              },
              '& .MuiSelect-select': {
                display: 'flex',
                alignItems: 'center', // Vertical alignment
                minHeight: 'unset', // Remove minimum height constraints
              },
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0,0,0,0.23)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'primary.main',
              },
              '& .MuiSvgIcon-root': {
                color: 'action.active',
                right: 7, // Position the dropdown icon correctly
              }
            }}
            // Simplified - no label or placeholder to avoid text conflicts
            renderValue={(selected) => {
              // Custom render function to ensure proper display
              return (
                <Typography
                  variant="body2"
                  sx={{
                    width: '100%',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {selectedPanchayat?.name || 'Select Panchayat'}
                </Typography>
              );
            }}
            // Remove the label to fix overlapping text issues
            label=""
            labelId="panchayat-select-label"
          />
        </Box>
      )}

      {/* Desktop Tabs */}
      {!isMobile && isAdminPortal && (
        <Tabs
          value={activeView}
          onChange={handleChangeView}
          variant="fullWidth"
          indicatorColor="secondary"
          textColor="inherit"
          sx={{ backgroundColor: 'primary.dark' }}
        >
          {items.map((item, index) => (
            <Tab key={index} icon={item.icon} label={item.label} />
          ))}
        </Tabs>
      )}

      {/* Mobile Drawer Navigation */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={toggleDrawer(false)}
        PaperProps={{
          sx: { width: 280 }
        }}
      >
        <Box sx={{ p: 2, bgcolor: 'primary.main', color: 'white' }}>
          <Typography variant="h6">Gram Sabha Menu</Typography>
          {selectedPanchayat && (
            <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
              {selectedPanchayat.name}, {selectedPanchayat.district}
            </Typography>
          )}
        </Box>

        <Divider />

        {/* Navigation Links */}
        {isAdminPortal && (
          <List>
            {items.map((item, index) => (
              <ListItemButton
                key={index}
                onClick={() => handleDrawerItemSelect(index)}
                selected={activeView === index}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            ))}
          </List>
        )}

        <Divider />

        {/* User Actions */}
        <List>
          <ListItemButton onClick={handlePortalSwitch}>
            <ListItemIcon>
              {isAdminPortal ? <PersonIcon /> : <AdminPanelSettingsIcon />}
            </ListItemIcon>
            <ListItemText primary={isAdminPortal ? 'Citizen Portal' : 'Admin Portal'} />
          </ListItemButton>

          <ListItemButton onClick={() => {
            setPasswordDialogOpen(true);
            setDrawerOpen(false);
          }}>
            <ListItemIcon><LockIcon /></ListItemIcon>
            <ListItemText primary="Change Password" />
          </ListItemButton>

          <ListItemButton onClick={handleLogout}>
            <ListItemIcon><LogoutIcon /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItemButton>
        </List>
      </Drawer>

      {/* Password Change Dialog */}
      <Dialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Change Password</DialogTitle>
        <DialogContent>
          {passwordChangeError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {passwordChangeError}
            </Alert>
          )}
          <PasswordChangeForm
            onSubmit={handlePasswordChange}
            loading={passwordChangeLoading}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </AppBar>
  );
};

export default Header;