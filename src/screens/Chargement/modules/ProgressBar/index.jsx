import './ProgressBar.css'

const ProgressBar = ({ progress }) => (
  <div className="loading-bar-wrapper">
    <div className="loading-bar-container">
      <div className="loading-bar-fill" style={{ width: `${Math.min(progress, 100)}%` }}></div>
    </div>
    <span className="progress-text">{Math.round(Math.min(progress, 100))}%</span>
  </div>
)

export default ProgressBar
