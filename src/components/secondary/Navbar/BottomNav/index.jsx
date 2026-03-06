import { NavLink } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faList,
  faTags,
  faChartPie,
} from "@fortawesome/free-solid-svg-icons";
import "./BottomNav.css";

const BottomNav = ({ t }) => {
  return (
    <nav className="bottom-nav">
      <NavLink
        to="/dashboard"
        className={({ isActive }) =>
          `bottom-nav-item ${isActive ? "active" : ""}`
        }
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
