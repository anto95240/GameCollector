import { RouterProvider } from "react-router";

import "./config/i18n";
import router from "./config/router";
import "./config/interceptor";
import AchievementDemo from './components/common/AchievementToast';

function App() {
  return (
    <div id="app-container" className="app-container">
      <RouterProvider router={router} />
      <AchievementDemo />
    </div>
  );
}

export default App;
