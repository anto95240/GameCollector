import '@/screens/Login/Login.css'
import '@/screens/Register/Register.css'

import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'

const AuthLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const isRegister = location.pathname === '/register'

  useEffect(() => {
    if (!localStorage.getItem('last_seen_version')) {
      navigate('/')
    }
  }, [navigate])

  return (
    <div className="auth-container">
      {/* La carte reste totalement fixe et immobile */}
      <div className={`auth-card console-border-card ${isRegister ? 'register-card' : ''}`}>
        {/* Le contenu à l'intérieur est le seul à s'animer */}
        <div key={location.pathname}>
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default AuthLayout
