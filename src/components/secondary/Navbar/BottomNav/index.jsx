import "./BottomNav.css";

import {
  faChartPie,
  faHome,
  faList,
  faTags,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { NavLink } from "react-router";

import { usePreloadRoute } from "@/hooks/ui/usePreloadRoute";

const BottomNav = ({ t }) => {
  const { preloadRoute } = usePreloadRoute();

  return (
    <nav className="bottom-nav">
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? "active" : ""}`
        }
        onMouseEnter={() => preloadRoute('/dashboard')}
        onFocus={() => preloadRoute('/dashboard')}
      >
        <div className="icon-container">
          <FontAwesomeIcon icon={faHome} />
        </div>
        <span className="nav-label">{t("navbar.dashboard")}</span>
      </NavLink>

      <NavLink
        to="/list"
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? "active" : ""}`
        }
        onMouseEnter={() => preloadRoute('/list')}
        onFocus={() => preloadRoute('/list')}
      >
        <div className="icon-container">
          <FontAwesomeIcon icon={faList} />
        </div>
        <span className="nav-label">{t("navbar.list")}</span>
      </NavLink>

      <NavLink
        to="/categories"
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? "active" : ""}`
        }
        onMouseEnter={() => preloadRoute('/categories')}
        onFocus={() => preloadRoute('/categories')}
      >
        <div className="icon-container">
          <FontAwesomeIcon icon={faTags} />
        </div>
        <span className="nav-label">{t("navbar.categories")}</span>
      </NavLink>

      <NavLink
        to="/statistics"
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? "active" : ""}`
        }
        onMouseEnter={() => preloadRoute('/statistics')}
        onFocus={() => preloadRoute('/statistics')}
      >
        <div className="icon-container">
          <FontAwesomeIcon icon={faChartPie} />
        </div>
        <span className="nav-label">{t("navbar.statistics")}</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
