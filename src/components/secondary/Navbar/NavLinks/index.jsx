import "./NavLinks.css";

import { NavLink } from "react-router";
import { usePreloadRoute } from "@/hooks/ui/usePreloadRoute";

const NavLinks = ({ t, closeMenu }) => {
  const { preloadRoute } = usePreloadRoute();

  const handleClick = () => {
    if (closeMenu) closeMenu();
  };

  return (
    <>
      <NavLink 
        to="/dashboard" 
        className="nav-item" 
        onClick={handleClick}
        onMouseEnter={() => preloadRoute('/dashboard')}
        onFocus={() => preloadRoute('/dashboard')}
      >
        {t("navbar.dashboard")}
      </NavLink>
      <NavLink 
        to="/list" 
        className="nav-item" 
        onClick={handleClick}
        onMouseEnter={() => preloadRoute('/list')}
        onFocus={() => preloadRoute('/list')}
      >
        {t("navbar.list")}
      </NavLink>
      <NavLink 
        to="/categories" 
        className="nav-item" 
        onClick={handleClick}
        onMouseEnter={() => preloadRoute('/categories')}
        onFocus={() => preloadRoute('/categories')}
      >
        {t("navbar.categories")}
      </NavLink>
      <NavLink 
        to="/statistics" 
        className="nav-item" 
        onClick={handleClick}
        onMouseEnter={() => preloadRoute('/statistics')}
        onFocus={() => preloadRoute('/statistics')}
      >
        {t("navbar.statistics")}
      </NavLink>
    </>
  );
};

export default NavLinks;
