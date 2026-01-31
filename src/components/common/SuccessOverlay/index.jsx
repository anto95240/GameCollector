import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCheckCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import "./successOverlay.css"; // Copiez le CSS correspondant de addEditGame.css ici

const SuccessOverlay = ({ message, subMessage }) => (
    <div className="save-success-overlay fade-in">
        <div className="success-content">
            <div className="success-icon-wrapper">
                <FontAwesomeIcon icon={faCheckCircle} className="success-icon" />
                <div className="success-ripple"></div>
            </div>
            <h2>{message}</h2>
            {subMessage && <p>{subMessage}</p>}
            <FontAwesomeIcon icon={faSpinner} spin className="redirect-spinner" />
        </div>
    </div>
);
export default SuccessOverlay;