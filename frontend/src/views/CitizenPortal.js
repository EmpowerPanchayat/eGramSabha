import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import {
  Box,
  Container,
  Typography,
  Paper,
  Snackbar,
  Alert,
  CircularProgress,
  AppBar,
  Toolbar,
  Button,
} from "@mui/material";
import { LanguageProvider } from "../utils/LanguageContext";
import CitizenLoginView from "./CitizenLoginView"; // Our enhanced login view
import CitizenDashboard from "./CitizenDashboard";
import IssueCreationView from "./IssueCreationView";
import IssueListView from "./IssueListView";
import AdminPanelSettingsIcon from "@mui/icons-material/AdminPanelSettings";
import tokenManager from "../utils/tokenManager";
import { getCitizenProfile } from "../api/profile";
import HelpButton from "../components/HelpButton";

// View states
const VIEWS = {
  LOGIN: "login",
  DASHBOARD: "dashboard",
  CREATE_ISSUE: "create_issue",
  LIST_ISSUES: "list_issues",
};

// Main component content - separated to be wrapped with LanguageProvider
const CitizenPortalContent = () => {
  const [currentView, setCurrentView] = useState(VIEWS.LOGIN);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "info",
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Check for stored session on component mount
  useEffect(() => {
    let isMounted = true; // Prevent state updates if component unmounts
  
    const checkStoredSession = async () => {
      if (!isMounted) return; // Early exit if unmounted
      
      setLoading(true);
      try {
        // Check if we have tokens
        if (tokenManager.hasTokens()) {
          try {
            // Get user profile using the token
            const response = await getCitizenProfile();
  
            if (!isMounted) return; // Check again before state update
  
            if (response.success && response.data && response.data.user) {
              setUser(response.data.user);
              localStorage.setItem("citizenUser", JSON.stringify(response.data.user));
              setCurrentView(VIEWS.DASHBOARD);
              // Comment out navigation for now
              // navigate("/citizen/dashboard", { replace: true });
            } else {
              // If profile fetch fails, try stored user
              const storedUser = localStorage.getItem("citizenUser");
              if (storedUser && isMounted) {
                setUser(JSON.parse(storedUser));
                setCurrentView(VIEWS.DASHBOARD);
              } else if (isMounted) {
                tokenManager.clearTokens();
                setCurrentView(VIEWS.LOGIN);
              }
            }
          } catch (error) {
            console.error("Error fetching profile:", error);
            if (!isMounted) return;
            
            // Try stored user as fallback
            const storedUser = localStorage.getItem("citizenUser");
            if (storedUser) {
              setUser(JSON.parse(storedUser));
              setCurrentView(VIEWS.DASHBOARD);
            } else {
              tokenManager.clearTokens();
              setCurrentView(VIEWS.LOGIN);
            }
          }
        } else {
          // No tokens - check for stored user
          const storedUser = localStorage.getItem("citizenUser");
          if (storedUser && isMounted) {
            setUser(JSON.parse(storedUser));
            setCurrentView(VIEWS.DASHBOARD);
          } else if (isMounted) {
            setCurrentView(VIEWS.LOGIN);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
        if (isMounted) {
          setCurrentView(VIEWS.LOGIN);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
  
    checkStoredSession();
  
    // Cleanup function
    return () => {
      isMounted = false;
    };
  }, []); // Keep empty dependency array

  // Handle user login - simple version
  const handleLogin = (userData, token, refreshToken) => {
    console.log({ userData, token, refreshToken });
  
    if (token && refreshToken) {
      tokenManager.setTokens(token, refreshToken);
    }
  
    setUser(userData);
    localStorage.setItem("citizenUser", JSON.stringify(userData));
    localStorage.setItem("user", JSON.stringify(userData));
    
    // Just set the view, don't navigate
    setCurrentView(VIEWS.DASHBOARD);
    // navigate("/citizen/dashboard", { replace: true }); // Comment this out
    showNotification("Login successful", "success");
  };

  // Handle user logout - enhanced to redirect properly
  const handleLogout = () => {
    setUser(null);
    tokenManager.clearTokens();
    localStorage.removeItem("citizenUser");
    localStorage.removeItem("user");
    setCurrentView(VIEWS.LOGIN);

    // Navigate to home page
    navigate("/", { replace: true });
    showNotification("Logged out successfully", "info");
  };

  // Show notification
  const showNotification = (message, severity = "info") => {
    setNotification({
      open: true,
      message,
      severity,
    });
  };

  // Close notification
  const handleCloseNotification = () => {
    setNotification((prev) => ({
      ...prev,
      open: false,
    }));
  };

  // Handle issue creation completion
  const handleIssueCreated = (issue) => {
    showNotification("Issue reported successfully", "success");
    // Navigate back to dashboard after a short delay
    setTimeout(() => {
      setCurrentView(VIEWS.DASHBOARD);
    }, 2000);
  };

  // Navigation to Admin Portal
  const navigateToAdmin = () => {
    navigate("/admin/login");
  };

  // Render the appropriate view based on authentication and current path
  const renderView = () => {
    // Handle loading state
    if (loading) {
      return (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "80vh",
            gap: 2,
          }}
        >
          <CircularProgress size={60} />
          <Typography variant="h6" color="text.secondary">
            Loading application...
          </Typography>
        </Box>
      );
    }

    // If not authenticated, show login (preserves all your URL param functionality)
    if (!user) {
      return (
        <>
          {/* Add admin button to login screen */}
          <Box sx={{ position: "absolute", top: 16, right: 16, zIndex: 10 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={navigateToAdmin}
              startIcon={<AdminPanelSettingsIcon />}
              sx={{
                backgroundColor: "rgba(255,255,255,0.8)",
                "&:hover": {
                  backgroundColor: "rgba(255,255,255,0.9)",
                },
              }}
            >
              Admin Portal
            </Button>
          </Box>
          <CitizenLoginView onLogin={handleLogin} />
        </>
      );
    }

    // Authenticated user - show appropriate view based on currentView state
    switch (currentView) {
      case VIEWS.CREATE_ISSUE:
        return (
          <IssueCreationView
            user={user}
            onBack={() => setCurrentView(VIEWS.DASHBOARD)}
            onIssueCreated={handleIssueCreated}
          />
        );

      case VIEWS.LIST_ISSUES:
        return (
          <IssueListView
            user={user}
            onBack={() => setCurrentView(VIEWS.DASHBOARD)}
          />
        );

      case VIEWS.DASHBOARD:
      default:
        return renderDashboard();
    }
  };

  // Render dashboard component
  const renderDashboard = () => {
    return (
      <CitizenDashboard
        user={user}
        onCreateIssue={() => setCurrentView(VIEWS.CREATE_ISSUE)}
        onViewIssues={() => setCurrentView(VIEWS.LIST_ISSUES)}
        onLogout={handleLogout}
      />
    );
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "background.default",
        backgroundImage:
          'linear-gradient(rgba(255, 255, 255, 0.8), rgba(255, 255, 255, 0.8)), url("/assets/background-pattern.png")',
        backgroundSize: "cover",
        backgroundAttachment: "fixed",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Header - only show for authenticated users not on login screen */}
      {user && currentView !== VIEWS.LOGIN && (
        <AppBar position="static" color="primary" elevation={2}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Gram Sabha Citizen Portal
            </Typography>
            <Button
              color="inherit"
              variant="outlined"
              onClick={navigateToAdmin}
              startIcon={<AdminPanelSettingsIcon />}
              sx={{
                borderColor: "rgba(255,255,255,0.3)",
                "&:hover": {
                  borderColor: "rgba(255,255,255,0.8)",
                  backgroundColor: "rgba(255,255,255,0.1)",
                },
              }}
            >
              Admin Portal
            </Button>
          </Toolbar>
        </AppBar>
      )}

      {/* Main Content */}
      {renderView()}

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          variant="filled"
          sx={{ width: "100%", boxShadow: 4 }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Help Button */}
      <HelpButton
        user={user}
        panchayatId={user?.panchayatId}
        sourcePortal="CITIZEN"
      />
    </Box>
  );
};

// Wrapper component that provides the LanguageProvider
const CitizenPortal = () => {
  return (
    <LanguageProvider>
      <CitizenPortalContent />
    </LanguageProvider>
  );
};

export default CitizenPortal;