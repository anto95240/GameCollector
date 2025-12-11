import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faBars } from "@fortawesome/free-solid-svg-icons";

import "./Navbar.css";

import NavbarInfo from "../../secondary/navbar/NavbarInfo";
import NavLinks from "../../secondary/navbar/NavLinks";
import MobileMenu from "../../secondary/navbar/MobileMenu";

import { useNavbar } from "./../../../hooks/useNavbar";

const Navbar = () => {
  const { t, state, setters, actions } = useNavbar();
  const { isMenuOpen, actionsOpen } = state;
  const { setIsMenuOpen, setActionsOpen } = setters;

  return (
    <>
      <header className="navbar w-full flex items-center px-4 sm:px-6"> 
        {/* BOUTON MENU MOBILE */}
        <button 
            className="mobile-menu-button cursor-pointer" 
            onClick={(e) => { e.stopPropagation(); setIsMenuOpen(prev => !prev); }}
        >
            <FontAwesomeIcon icon={faBars} />
        </button>

        {/* LOGO */}
        <img className="navbar-img" src="./logo.png" alt="Logo" />

        {/* LIENS DESKTOP */}
        <nav className="navbar-links flex-row gap-4 ml-6 items-center"> 
            <NavLinks t={t} />
        </nav>

        <NavbarInfo t={t} setActionsOpen={setActionsOpen} actionsOpen={actionsOpen} /> 
        
      </header>

      {/* ========================= MENU MOBILE ========================= */}
      {isMenuOpen && (
        <MobileMenu t={t} closeMenu={() => setIsMenuOpen(false)} />
      )}
    </>
  );
};

export default Navbar;