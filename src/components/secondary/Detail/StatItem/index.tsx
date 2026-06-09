import './StatItem.css'

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

const StatItem = ({ icon, label, value }: { icon: any, label: string, value: string | number }) => (
  <div className="stat-item">
    <span className="stat-label">
      <FontAwesomeIcon icon={icon} /> {label}
    </span>
    <span className="stat-value">{value}</span>
  </div>
)

export default StatItem
