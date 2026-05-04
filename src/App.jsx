import { RouterProvider } from "react-router";
import { useEffect } from "react";
import { useAchievementTracker } from "./hooks/achievements/useAchievementTracker";
import { useAuth } from "./context/AuthContext";

import "./config/i18n";
import router from "./config/router";
import "./config/interceptor";
import AchievementToast from "./components/common/AchievementToast";
import ValidationToast from "./components/common/ValidationToast";
import KeyboardShortcutsProvider from "./components/KeyboardShortcutsProvider";
import KeyboardHelp from "./components/KeyboardHelp";
import keyboardShortcutsService from "./services/keyboardShortcutsService";

function App() {
  // Tracker d'achievements - vérification sûre au démarrage
  useAchievementTracker();

  // Récupérer l'utilisateur depuis le contexte (raccourcis inclus)
  const { user } = useAuth();

  // Charger les raccourcis personnalisés de l'utilisateur
  useEffect(() => {
    if (user?.shortcuts && user.shortcuts.length > 0) {
      keyboardShortcutsService.loadCustomBindings(user.shortcuts);
    }
  }, [user?.shortcuts]);

  return (
    <div id="app-container" className="app-container">
      <RouterProvider router={router} />
      <KeyboardShortcutsProvider />
      <AchievementToast />
      <ValidationToast />
      <KeyboardHelp />
    </div>
  );
}

export default App;
