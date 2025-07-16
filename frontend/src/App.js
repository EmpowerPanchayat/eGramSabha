import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { Box } from "@mui/material";
import { useAuth, AuthProvider } from "./utils/authContext";
import { LanguageProvider } from "./utils/LanguageContext";

// Import Portals
import AdminPortal from "./views/AdminPortal";
import CitizenPortal from "./views/CitizenPortal";
import OfficialPortalWithLanguage from "./views/OfficialPortal";

// Import Auth Views
import AdminLoginView from "./views/AdminLoginView";
import OfficialLoginView from "./views/OfficialLoginView";
import ForgotPasswordView from "./views/ForgotPasswordView";
import ResetPasswordView from "./views/ResetPasswordView";

// Enhanced Protected Route component that handles user types
const ProtectedRoute = ({ children, requiredRoles = [] }) => {
  const { user, hasRole, getUserType } = useAuth();

  if (!user) {
    // Determine the appropriate login path based on the required roles
    let loginPath = "/admin/login"; // Default

    // Check if this is an official route
    if (
      requiredRoles.some((role) =>
        [
          "SECRETARY",
          "PRESIDENT",
          "WARD_MEMBER",
          "COMMITTEE_SECRETARY",
          "GUEST",
        ].includes(role)
      )
    ) {
      loginPath = "/official/login";
    }
    // Check if this is a citizen route
    else if (requiredRoles.includes("CITIZEN")) {
      loginPath = "/"; // Citizen portal
    }

    return <Navigate to={loginPath} replace />;
  }

  // If roles are specified, check if user has required role
  if (requiredRoles.length > 0 && !hasRole(requiredRoles)) {
    // Redirect users to their appropriate dashboard based on their type
    const userType = getUserType();

    if (userType === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    } else if (userType === "OFFICIAL") {
      return <Navigate to="/official/dashboard" replace />;
    } else if (userType === "CITIZEN") {
      return <Navigate to="/citizen/dashboard" replace />;
    }

    // Fallback unauthorized page
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

const AppContent = () => {
  const { user } = useAuth();

  return (
    <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <Router>
        <Routes>
          {/* ===== CITIZEN ROUTES (Enhanced with Location-Based Login) ===== */}

          {/* Default citizen portal route */}
          <Route path="/" element={<CitizenPortal />} />

          {/* NEW: Citizen login routes with location support */}
          {/* Manual selection login */}
          <Route path="/citizen-login" element={<CitizenPortal />} />

          {/* LGD Code login - handled by query parameter */}
          {/* Example: /citizen-login?lgdCode=123456 */}

          {/* Location path login - NEW pattern */}
          {/* Example: /citizen-login/Bihar/Patna/Danapur/Rampur */}
          <Route path="/citizen-login/*" element={<CitizenPortal />} />

          {/* Direct location path access - NEW pattern */}
          {/* Example: /Haryana/Palwal/Prithla/Tatarpur */}
          <Route path="/:state/:district/:block/:panchayat" element={<CitizenPortal />} />

          {/* Citizen dashboard - protected route */}
          <Route
            path="/citizen/dashboard"
            element={
              <ProtectedRoute requiredRoles={["CITIZEN"]}>
                <CitizenPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/citizen/dashboard/*"
            element={
              <ProtectedRoute requiredRoles={["CITIZEN"]}>
                <CitizenPortal />
              </ProtectedRoute>
            }
          />

          {/* ===== ADMIN ROUTES ===== */}

          <Route path="/admin/login" element={<AdminLoginView />} />
          <Route
            path="/admin/forgot-password"
            element={<ForgotPasswordView />}
          />
          <Route path="/admin/reset-password" element={<ResetPasswordView />} />

          <Route
            path="/admin"
            element={
              <ProtectedRoute requiredRoles={["ADMIN"]}>
                <Navigate to="/admin/dashboard" replace />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute requiredRoles={["ADMIN"]}>
                <AdminPortal />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/dashboard/*"
            element={
              <ProtectedRoute requiredRoles={["ADMIN"]}>
                <AdminPortal />
              </ProtectedRoute>
            }
          />

          {/* ===== OFFICIAL ROUTES ===== */}

          <Route path="/official/login" element={<OfficialLoginView />} />
          <Route
            path="/official/forgot-password"
            element={<ForgotPasswordView />}
          />
          <Route
            path="/official/reset-password"
            element={<ResetPasswordView />}
          />

          <Route
            path="/official"
            element={
              <ProtectedRoute
                requiredRoles={[
                  "SECRETARY",
                  "PRESIDENT",
                  "WARD_MEMBER",
                  "COMMITTEE_SECRETARY",
                  "GUEST",
                ]}
              >
                <OfficialPortalWithLanguage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/official/dashboard"
            element={
              <ProtectedRoute
                requiredRoles={[
                  "SECRETARY",
                  "PRESIDENT",
                  "WARD_MEMBER",
                  "COMMITTEE_SECRETARY",
                  "GUEST",
                ]}
              >
                <OfficialPortalWithLanguage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/official/dashboard/*"
            element={
              <ProtectedRoute
                requiredRoles={[
                  "SECRETARY",
                  "PRESIDENT",
                  "WARD_MEMBER",
                  "COMMITTEE_SECRETARY",
                  "GUEST",
                ]}
              >
                <OfficialPortalWithLanguage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/official/issues"
            element={
              <ProtectedRoute
                requiredRoles={[
                  "SECRETARY",
                  "PRESIDENT",
                  "WARD_MEMBER",
                  "COMMITTEE_SECRETARY",
                  "GUEST",
                ]}
              >
                <OfficialPortalWithLanguage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/official/issues/create"
            element={
              <ProtectedRoute
                requiredRoles={[
                  "SECRETARY",
                  "PRESIDENT",
                  "WARD_MEMBER",
                  "COMMITTEE_SECRETARY",
                  "GUEST",
                ]}
              >
                <OfficialPortalWithLanguage />
              </ProtectedRoute>
            }
          />

          {/* ===== UTILITY ROUTES ===== */}

          {/* Unauthorized Page */}
          <Route
            path="/unauthorized"
            element={
              <Box sx={{ p: 4, textAlign: "center" }}>
                <h1>Unauthorized Access</h1>
                <p>You don't have permission to access this page.</p>
                {user && (
                  <Box sx={{ mt: 2 }}>
                    <p>Return to your dashboard:</p>
                    {user.role === "ADMIN" && (
                      <Navigate to="/admin/dashboard" replace />
                    )}
                    {[
                      "SECRETARY",
                      "PRESIDENT",
                      "WARD_MEMBER",
                      "COMMITTEE_SECRETARY",
                      "GUEST",
                    ].includes(user.role) && (
                      <Navigate to="/official/dashboard" replace />
                    )}
                    {user.role === "CITIZEN" && (
                      <Navigate to="/citizen/dashboard" replace />
                    )}
                  </Box>
                )}
              </Box>
            }
          />

          {/* Legacy paths for backward compatibility */}
          <Route
            path="/login"
            element={<Navigate to="/admin/login" replace />}
          />
          <Route
            path="/login/admin"
            element={<Navigate to="/admin/login" replace />}
          />
          <Route
            path="/login/official"
            element={<Navigate to="/official/login" replace />}
          />

          {/* Legacy citizen routes - redirect to new structure */}
          <Route path="/citizen" element={<Navigate to="/" replace />} />

          {/* Default Route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </Box>
  );
};

const App = () => {
  return (
    <AuthProvider>
      <LanguageProvider>
        <AppContent />
      </LanguageProvider>
    </AuthProvider>
  );
};

export default App;

/*
NEW CITIZEN LOGIN URL PATTERNS THAT NOW WORK:

1. Default Landing/Login:
   / → CitizenPortal (shows login if not authenticated)

2. Manual Selection Login:
   /citizen-login → CitizenPortal (shows manual location selection)

3. LGD Code Login:
   /citizen-login?lgdCode=123456789 → CitizenPortal (auto-finds panchayat)

4. Location Path Login:
   /citizen-login/Bihar/Patna/Danapur/Rampur → CitizenPortal (auto-finds panchayat)
   /citizen-login/Maharashtra/Mumbai/Andheri/Versova
   /citizen-login/Tamil%20Nadu/Chennai/Tambaram/Chitlapakkam

5. Protected Citizen Routes:
   /citizen/dashboard → Requires authentication, redirects to appropriate view

ERROR HANDLING:
- Invalid LGD codes → Show error + manual selection option
- Invalid location paths → Show error + manual selection option  
- Missing path components → Show error + manual selection option

AUTHENTICATION FLOW:
- Unauthenticated users can access all /citizen-login/* routes
- Successful login redirects to /citizen/dashboard
- Protected routes require CITIZEN role
- Logout redirects back to /
*/
