import { RouterProvider } from "react-router";
import { useAchievementTracker } from "./hooks/achievements/useAchievementTracker";

import "./config/i18n";
import router from "./config/router";
import "./config/interceptor";
import AchievementToast from './components/common/AchievementToast';
import ValidationToast from './components/common/ValidationToast';

function App() {
  // Tracker d'achievements - vérification sûre au démarrage
  useAchievementTracker();

  return (
    <div id="app-container" className="app-container">
      <RouterProvider router={router} />
      <AchievementToast />
      <ValidationToast />
    </div>
  );
}

export default App;
