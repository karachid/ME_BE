import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
// Self-hosted font (no third-party request). Latin + Arabic subsets;
// Weights 400/700/800 only: font-semibold (600) falls back to the nearest, 700.
import "@fontsource/cairo/latin-400.css";
import "@fontsource/cairo/latin-700.css";
import "@fontsource/cairo/latin-800.css";
import "@fontsource/cairo/arabic-400.css";
import "@fontsource/cairo/arabic-700.css";
import "@fontsource/cairo/arabic-800.css";
import "./index.css";
import App from "./App";
import { AuthProvider } from "./auth";
import { I18nProvider } from "./i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <I18nProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </I18nProvider>
    </BrowserRouter>
  </StrictMode>,
);
