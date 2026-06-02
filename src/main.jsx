import "./index.css";
import "./Animations.css";

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { 
  AuthProvider, 
  FiltersProvider, 
  LanguageProvider, 
  ThemeProvider, 
  ToastProvider 
} from "@/context";

import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <FiltersProvider>
            <ToastProvider>
              <App />
            </ToastProvider>
          </FiltersProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>,
);
