import { NavLink } from "react-router";
import "./NavLinks.css";

const NavLinks = ({ t, closeMenu }) => {
  const handleClick = () => {
    if (closeMenu) closeMenu();
  };

  return (
    <>
      <NavLink to="/dashboard" className="nav-item" onClick={handleClick}>
        {t("navbar.dashboard")}
      </NavLink>
      <NavLink to="/list" className="nav-item" onClick={handleClick}>
        {t("navbar.list")}
      </NavLink>
      <NavLink to="/categories" className="nav-item" onClick={handleClick}>
        {t("navbar.categories")}
      </NavLink>
      <NavLink to="/statistics" className="nav-item" onClick={handleClick}>
        {t("navbar.statistics")}
      </NavLink>
    </>
  );
};

export default NavLinks;
