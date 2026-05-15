import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./globals.css";
import App from "./App.tsx";
import { ThemeProvider } from "./components/ThemeProvider.tsx";
import AuthGate from "./components/cloud/AuthGate.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <AuthGate>
        <App />
      </AuthGate>
    </ThemeProvider>
  </StrictMode>,
);
