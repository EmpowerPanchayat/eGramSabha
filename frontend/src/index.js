// File: frontend/src/index.js (Updated with ThemeProvider)
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "@mui/material/styles";
import { JMTemplateProvider } from "@jiomeet/core-template-web";
import CssBaseline from "@mui/material/CssBaseline";
import theme from "./theme";

// Import Roboto font
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <JMTemplateProvider>
      <ThemeProvider theme={theme}>
        {/* CssBaseline provides a consistent baseline across browsers */}
        <CssBaseline />
        <App />
      </ThemeProvider>
    </JMTemplateProvider>
  </React.StrictMode>
);
