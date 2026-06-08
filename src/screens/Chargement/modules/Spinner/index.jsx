import './Spinner.css'

const Spinner = ({ isLogout }) => (
  <div className="modern-spinner">
    <div className="spinner-ring spinner-ring-1"></div>
    <div className="spinner-ring spinner-ring-2"></div>
    <div className="spinner-ring spinner-ring-3"></div>
    <div className="spinner-core">
      <span className="spinner-icon">{isLogout ? '✓' : '↻'}</span>
    </div>
  </div>
)

export default Spinner
