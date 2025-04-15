import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  AlertTitle,
  Container,
  Stack,
  useTheme,
  useMediaQuery
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PeopleIcon from '@mui/icons-material/People';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import DashboardIcon from '@mui/icons-material/Dashboard';
import InfoIcon from '@mui/icons-material/Info';

const HomeView = ({ stats, navigateTo, selectedPanchayat }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isSmallScreen = useMediaQuery(theme.breakpoints.down('md'));

  // Define consistent card action items
  const quickActionCards = [
    {
      icon: <SearchIcon fontSize="large" sx={{ color: 'primary.main' }} />,
      title: "Search Members",
      description: "Find and manage existing members by Voter ID",
      buttonText: "Search",
      action: () => navigateTo('search')
    },
    {
      icon: <PeopleIcon fontSize="large" sx={{ color: 'primary.main' }} />,
      title: "View All Members",
      description: "Browse and manage all registered members",
      buttonText: "View Members",
      action: () => navigateTo('users')
    },
    {
      icon: <UploadFileIcon fontSize="large" sx={{ color: 'primary.main' }} />,
      title: "Import Members",
      description: "Import members from CSV file",
      buttonText: "Import",
      action: () => navigateTo('import')
    },
    {
      icon: <AccountBalanceIcon fontSize="large" sx={{ color: 'primary.main' }} />,
      title: "Manage Panchayats",
      description: "Add, edit, or remove panchayats",
      buttonText: "Manage",
      action: () => navigateTo('panchayats')
    }
  ];

  return (
    <Container maxWidth="lg">
      {/* Header section with improved layout */}
      <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <DashboardIcon
            fontSize="large"
            sx={{
              mr: 2,
              color: 'primary.main',
              fontSize: { xs: 28, sm: 36 }
            }}
          />
          <Typography
            variant="h2"
            component="h1"
            gutterBottom
            sx={{
              fontSize: { xs: '1.75rem', sm: '2.5rem' },
              mb: 0
            }}
          >
            Gram Sabha Dashboard
          </Typography>
        </Box>

        <Typography
          variant="body1"
          paragraph
          sx={{
            ml: { sm: 6 },
            color: 'text.secondary'
          }}
        >
          This system helps manage Gram Sabha members with secure biometric face registration.
        </Typography>

        {/* Panchayat status alert with responsive design */}
        {!selectedPanchayat ? (
          <Alert
            severity="warning"
            sx={{
              mt: 3,
              display: 'flex',
              alignItems: 'flex-start'
            }}
          >
            <Box>
              <AlertTitle sx={{ fontWeight: 600 }}>No Panchayat Selected</AlertTitle>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Please select a panchayat from the dropdown in the top menu to begin.
              </Typography>
              <Button
                variant="contained"
                color="primary"
                size={isMobile ? "small" : "medium"}
                startIcon={<AccountBalanceIcon />}
                onClick={() => navigateTo('panchayats')}
              >
                Add Panchayat
              </Button>
            </Box>
          </Alert>
        ) : (
          <Alert
            severity="success"
            icon={<InfoIcon fontSize="inherit" />}
            sx={{ mt: 3 }}
          >
            <AlertTitle sx={{ fontWeight: 600 }}>Working with {selectedPanchayat.name}</AlertTitle>
            <Typography variant="body2">
              Currently managing members for {selectedPanchayat.name}, {selectedPanchayat.district}, {selectedPanchayat.state}
            </Typography>
          </Alert>
        )}
      </Paper>

      {selectedPanchayat && (
        <>
          {/* Stats Cards Section with improved responsive layout */}
          <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
              borderLeft: 3,
              borderColor: 'primary.main',
              pl: 2
            }}>
              <Typography
                variant="h4"
                component="h2"
                gutterBottom
                sx={{
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  mb: 0,
                  fontWeight: 500
                }}
              >
                Overview Statistics
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            <Grid container spacing={3}>
              {/* Total Members Card */}
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    height: '100%',
                    boxShadow: 2,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          bgcolor: 'primary.lighter',
                          p: 1,
                          borderRadius: '50%',
                          mr: 2
                        }}
                      >
                        <PeopleIcon sx={{ color: 'primary.main' }} />
                      </Box>
                      <Typography variant="h6" component="h3">
                        Total Members
                      </Typography>
                    </Box>
                    <Typography
                      variant="h3"
                      component="div"
                      color="text.primary"
                      sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        fontSize: { xs: '2rem', sm: '2.5rem' }
                      }}
                    >
                      {stats.totalUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total members in the database
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigateTo('users')}
                      sx={{ ml: 'auto' }}
                    >
                      View All Members
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              {/* Registered Members Card */}
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    height: '100%',
                    boxShadow: 2,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          bgcolor: 'success.lighter',
                          p: 1,
                          borderRadius: '50%',
                          mr: 2
                        }}
                      >
                        <HowToRegIcon sx={{ color: 'success.main' }} />
                      </Box>
                      <Typography variant="h6" component="h3">
                        Registered Members
                      </Typography>
                    </Box>
                    <Typography
                      variant="h3"
                      component="div"
                      color="success.main"
                      sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        fontSize: { xs: '2rem', sm: '2.5rem' }
                      }}
                    >
                      {stats.registeredUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Members with completed face registration
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigateTo('search')}
                      sx={{ ml: 'auto' }}
                    >
                      Register New Member
                    </Button>
                  </CardActions>
                </Card>
              </Grid>

              {/* Pending Registrations Card */}
              <Grid item xs={12} md={4}>
                <Card
                  sx={{
                    height: '100%',
                    boxShadow: 2,
                    borderRadius: 2,
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 4
                    }
                  }}
                >
                  <CardContent sx={{ pb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <Box
                        sx={{
                          bgcolor: 'warning.lighter',
                          p: 1,
                          borderRadius: '50%',
                          mr: 2
                        }}
                      >
                        <PendingActionsIcon sx={{ color: 'warning.main' }} />
                      </Box>
                      <Typography variant="h6" component="h3">
                        Pending Registrations
                      </Typography>
                    </Box>
                    <Typography
                      variant="h3"
                      component="div"
                      color="warning.main"
                      sx={{
                        fontWeight: 'bold',
                        mb: 1,
                        fontSize: { xs: '2rem', sm: '2.5rem' }
                      }}
                    >
                      {stats.pendingUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Members awaiting face registration
                    </Typography>
                  </CardContent>
                  <Divider />
                  <CardActions>
                    <Button
                      size="small"
                      onClick={() => navigateTo('import')}
                      sx={{ ml: 'auto' }}
                    >
                      Import Members
                    </Button>
                  </CardActions>
                </Card>
              </Grid>
            </Grid>
          </Paper>

          {/* Quick Actions Section with improved layout */}
          <Paper elevation={1} sx={{ p: 3, mb: 4 }}>
            <Box sx={{
              display: 'flex',
              alignItems: 'center',
              mb: 2,
              borderLeft: 3,
              borderColor: 'primary.main',
              pl: 2
            }}>
              <Typography
                variant="h4"
                component="h2"
                gutterBottom
                sx={{
                  fontSize: { xs: '1.5rem', sm: '2rem' },
                  mb: 0,
                  fontWeight: 500
                }}
              >
                Quick Actions
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />

            {/* Fixed width consistency in cards */}
            <Grid container spacing={isSmallScreen ? 2 : 3}>
              {quickActionCards.map((card, index) => (
                <Grid key={index} item xs={12} sm={6} md={3} sx={{ display: 'flex' }}>
                  <Card
                    sx={{
                      width: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: 2,
                      borderRadius: 2,
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 4
                      }
                    }}
                  >
                    <CardContent sx={{
                      flexGrow: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      p: { xs: 2, sm: 3 },
                      height: { xs: '220px', md: '240px' }, // Responsive fixed height
                    }}>
                      <Box sx={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        textAlign: 'center',
                        flex: 1,
                        justifyContent: 'center'
                      }}>
                        <Box sx={{
                          bgcolor: 'primary.lighter',
                          p: 1.5,
                          borderRadius: '50%',
                          mb: 3,
                          width: 56,
                          height: 56,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          {card.icon}
                        </Box>
                        <Typography 
                          variant="h6" 
                          component="h3" 
                          sx={{ 
                            mb: 2, 
                            minHeight: '32px',
                            display: 'flex', 
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {card.title}
                        </Typography>
                        <Typography 
                          variant="body2" 
                          color="text.secondary" 
                          sx={{ 
                            minHeight: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          {card.description}
                        </Typography>
                      </Box>
                    </CardContent>
                    <Divider />
                    <CardActions sx={{ p: 2 }}>
                      <Button
                        fullWidth
                        variant="contained"
                        onClick={card.action}
                        sx={{ 
                          borderRadius: 1.5,
                          py: 1
                        }}
                      >
                        {card.buttonText}
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </>
      )}
    </Container>
  );
};

export default HomeView;