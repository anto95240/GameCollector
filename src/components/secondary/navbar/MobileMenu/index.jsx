import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import NavLinks from "../NavLinks";

const MobileMenu = ({ t, closeMenu }) => {
  return (
    <nav className="navbar-links-mobile md:hidden flex flex-col items-start fixed">
      
      <div className="mobile-menu-header flex justify-between items-center w-full">
        <img className="navbar-img" src="./logo.png" alt="Logo" />
        
        <button 
            className="mobile-menu-close-button cursor-pointer" 
            onClick={closeMenu}
            aria-label="Fermer le menu"
        >
            <FontAwesomeIcon icon={faTimes} /> 
        </button>
      </div>
      
      <div className="mobile-nav-links-container flex flex-col w-full">
        <NavLinks t={t} closeMenu={closeMenu} />
      </div>
      
    </nav>
  );
};

export default MobileMenu;