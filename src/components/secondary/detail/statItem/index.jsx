import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./StatItem.css";

const StatItem = ({ icon, label, value }) => (
  <div className="stat-item">
    <span className="stat-label">
      <FontAwesomeIcon icon={icon} /> {label}
    </span>
    <span className="stat-value">{value}</span>
  </div>
);

export default StatItem;
