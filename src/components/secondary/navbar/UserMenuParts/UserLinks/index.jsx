import { NavLink } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUser, faRightFromBracket } from "@fortawesome/free-solid-svg-icons";
import "./UserLinks.css";

const UserLinks = ({ t, onClose }) => (
    <div className="navbar-actions-links">
        <NavLink 
            className="navbar-link-profile" 
            to="/profile"
            onClick={onClose} 
        >
            <FontAwesomeIcon icon={faUser} /> {t("navbar.profile")}
        </NavLink>
        
        <NavLink 
            className="navbar-link-deconnect" 
            to="/logout"
            onClick={onClose}
        >
            <div className="deconnect-text">
                <span className="logo-deconect"><FontAwesomeIcon icon={faRightFromBracket} /></span>
                <span className="logout-text">{t("navbar.logout")}</span>
            </div>
        </NavLink>
    </div>
);
export default UserLinks;