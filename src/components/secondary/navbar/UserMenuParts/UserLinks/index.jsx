import { NavLink } from "react-router";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { 
    faUser, 
    faRightFromBracket 
} from "@fortawesome/free-solid-svg-icons";

import "./userLinks.css";

const UserLinks = ({ t }) => (
    <div className="navbar-actions-links flex flex-col items-start w-full">
        <NavLink className="navbar-link-profile flex items-center w-full" to="/profile">
            <FontAwesomeIcon icon={faUser} /> {t("navbar.profile")}
        </NavLink>
        
        <NavLink className="navbar-link-deconnect flex items-center w-full" to="/logout">
            <div className="deconnect-text flex items-center">
                <span className="logo-deconect"><FontAwesomeIcon icon={faRightFromBracket} /></span>
                <span className="logout-text">{t("navbar.logout")}</span>
            </div>
        </NavLink>
    </div>
);
export default UserLinks;