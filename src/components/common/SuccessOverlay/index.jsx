import "./SuccessOverlay.css";

import { faCheckCircle, faSpinner } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

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
