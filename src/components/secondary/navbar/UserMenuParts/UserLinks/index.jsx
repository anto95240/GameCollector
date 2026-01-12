import { NavLink } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
    faUser, 
    faRightFromBracket 
} from "@fortawesome/free-solid-svg-icons";
import "./userLinks.css";

// 1. Réception de la prop onClose
const UserLinks = ({ t, onClose }) => (
    <div className="navbar-actions-links flex flex-col items-start w-full">
        {/* 2. Appel de onClose au clic sur le lien Profil */}
        <NavLink 
            className="navbar-link-profile flex items-center w-full" 
            to="/profile"
            onClick={onClose} 
        >
            <FontAwesomeIcon icon={faUser} /> {t("navbar.profile")}
        </NavLink>
        
        {/* On l'ajoute aussi au logout pour une meilleure UX */}
        <NavLink 
            className="navbar-link-deconnect flex items-center w-full" 
            to="/logout"
            onClick={onClose}
        >
            <div className="deconnect-text flex items-center">
                <span className="logo-deconect"><FontAwesomeIcon icon={faRightFromBracket} /></span>
                <span className="logout-text">{t("navbar.logout")}</span>
            </div>
        </NavLink>
    </div>
);
export default UserLinks;