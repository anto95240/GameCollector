import './SimpleLoadingSpinner.css'

const SimpleLoadingSpinner = () => {
  return (
    <div className="simple-loading-container">
      <div className="simple-spinner">
        <div className="spinner-ring spinner-ring-1"></div>
        <div className="spinner-ring spinner-ring-2"></div>
        <div className="spinner-ring spinner-ring-3"></div>
      </div>
    </div>
  )
}

export default SimpleLoadingSpinner
