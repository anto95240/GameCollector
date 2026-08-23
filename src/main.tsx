import '@/config/i18n'
import './Animations.css'
import './index.css'
import './styles/seasonal-decor.css'

import { Analytics } from '@vercel/analytics/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import {
  AuthProvider,
  FiltersProvider,
  LanguageProvider,
  ThemeProvider,
  ToastProvider,
} from '@/context'

import App from './App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <FiltersProvider>
            <ToastProvider>
              <App />
              <Analytics />
            </ToastProvider>
          </FiltersProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  </StrictMode>
)
