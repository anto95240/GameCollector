/* main.jsx */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './animations.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider> {/* On englobe tout ici */}
        <App />
    </AuthProvider>
  </StrictMode>,
)
