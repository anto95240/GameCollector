import './LoadingVariants.css'

const LoadingVariants = ({ children, isLogout }: any) => (
  <div className={`loading-screen ${isLogout ? 'loading-logout' : 'loading-login'}`}>
    {children}
  </div>
)

export default LoadingVariants
