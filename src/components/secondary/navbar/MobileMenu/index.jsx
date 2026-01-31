import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes } from "@fortawesome/free-solid-svg-icons";
import NavLinks from "../NavLinks";
import "./mobileMenu.css";

const MobileMenu = ({ t, closeMenu, isOpen }) => {
  return (
    <>
      {/* Overlay sombre qui s'affiche en fondu grâce au CSS .mobile-backdrop.open */}
      <div 
        className={`mobile-backdrop ${isOpen ? 'open' : ''}`} 
        onClick={closeMenu}
      />
      
      {/* Menu Latéral qui slide grâce au CSS .navbar-links-mobile.open */}
      <nav className={`navbar-links-mobile md:hidden flex flex-col items-start fixed ${isOpen ? 'open' : ''}`}>
        
        <div className="mobile-menu-header flex justify-between items-center w-full gap-4">
          <img className="navbar-img" src="/logo.png" alt="Logo" />
          
          <button 
              className="mobile-menu-close-button cursor-pointer" 
              onClick={closeMenu}
              aria-label="Fermer le menu"
          >
              <FontAwesomeIcon icon={faTimes} /> 
          </button>
        </div>
        
        <div className="mobile-nav-links-container flex flex-col w-full">
          {/* On passe closeMenu à NavLinks pour fermer le menu quand on clique sur un lien */}
          <NavLinks t={t} closeMenu={closeMenu} />
        </div>
        
      </nav>
    </>
  );
};

export default MobileMenu;